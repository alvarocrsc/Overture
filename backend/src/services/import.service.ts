import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { query, execute } from '../config/db';
import { tmdbFetch } from '../config/tmdb';
import * as tmdbService from './tmdb.service';
import { upsertFilm } from './films.service';
import type { ImportJob } from '../models/import-job.model';
import type { TmdbSearchResponse } from '../types/tmdb.types';

/**
 * Delay between rows that may hit TMDB. Keeps the importer well under TMDB's
 * rate limit during large imports. Intentional and mandatory — do not remove.
 */
const TMDB_THROTTLE_MS = 80;

/** Maximum number of row-level errors persisted to `import_jobs.error_log`. */
const MAX_LOGGED_ERRORS = 50;

/** Per-job identifiers threaded through every row importer. */
interface ImportContext {
  userId: number;
  jobId: number;
}

/**
 * Outcome of importing a single counted row.
 * - `imported` — a new row was created.
 * - `skipped`  — the row already existed, or could not be represented (e.g. a
 *   diary entry with no star rating, which our schema cannot store).
 */
type RowOutcome = 'imported' | 'skipped';

// ─── Date helper ─────────────────────────────────────────────────────────────

/**
 * Converts a Letterboxd date (M/D/YY or YYYY-MM-DD) to a MySQL DATE string
 * (YYYY-MM-DD). Letterboxd was founded in 2011, so all 2-digit years are 20xx.
 * @param raw - The raw date cell, or undefined.
 * @returns A YYYY-MM-DD string, or null when the input is empty/malformed.
 */
function parseLbDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  // Newer exports already use ISO dates — pass them straight through.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = value.split('/');
  if (parts.length !== 3) return null;
  const [m, d, yy] = parts;
  if (!m || !d || !yy) return null;
  const year = yy.length === 2 ? `20${yy}` : yy;
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/**
 * Parses a CSV entry from a Letterboxd export ZIP into header-keyed rows.
 * Letterboxd exports are comma-separated CSV with a header row. Returns an
 * empty array if the entry is absent or unparseable.
 * @param zip - The opened export ZIP.
 * @param entryPath - Path of the CSV inside the ZIP (e.g. `diary.csv`).
 */
function parseCsv(zip: AdmZip, entryPath: string): Record<string, string>[] {
  const entry = zip.getEntry(entryPath);
  if (!entry) return [];
  const content = entry.getData().toString('utf8');
  try {
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true, // Some exports include a UTF-8 BOM.
      relax_column_count: true,
    }) as Record<string, string>[];
  } catch {
    return [];
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Creates an import job and processes the ZIP in the background. Returns the
 * new job id immediately so the caller can respond with 202 and let the client
 * poll for progress.
 * @param userId - The authenticated user's id.
 * @param zipFilePath - Absolute path to the uploaded ZIP on disk.
 * @returns The new import job id.
 */
export async function startImportJob(userId: number, zipFilePath: string): Promise<number> {
  const result = await execute(
    `INSERT INTO import_jobs (user_id, status) VALUES (?, ?)`,
    [userId, 'pending'],
  );
  const jobId = result.insertId;

  // Detach from the request lifecycle. Any unexpected failure marks the job
  // failed and cleans up the temp file.
  setImmediate(() => {
    void processImportJob(userId, jobId, zipFilePath).catch(async (err: unknown) => {
      await execute(
        `UPDATE import_jobs SET status = ?, completed_at = NOW(), error_log = ? WHERE id = ?`,
        ['failed', JSON.stringify([describeError(err)]), jobId],
      );
      tryDeleteFile(zipFilePath);
    });
  });

  return jobId;
}

/**
 * Returns a single import job scoped to its owner, or null when not found.
 * @param jobId - The import job id.
 * @param userId - The authenticated user's id (ownership guard).
 */
export async function getImportJob(jobId: number, userId: number): Promise<ImportJob | null> {
  const [job] = await query<ImportJob>(
    `SELECT id, user_id, status, total_items, imported_items, skipped_items,
            failed_items, error_log, started_at, completed_at, created_at, updated_at
     FROM import_jobs
     WHERE id = ? AND user_id = ?`,
    [jobId, userId],
  );
  return job ?? null;
}

// ─── Core processing ─────────────────────────────────────────────────────────

/**
 * Unzips the export and imports each supported CSV. Updates the job's progress
 * counters as it goes so the client poll reflects live progress.
 */
async function processImportJob(
  userId: number,
  jobId: number,
  zipFilePath: string,
): Promise<void> {
  await execute(
    `UPDATE import_jobs SET status = ?, started_at = NOW() WHERE id = ?`,
    ['processing', jobId],
  );

  const ctx: ImportContext = { userId, jobId };
  const zip = new AdmZip(zipFilePath);
  const errors: string[] = [];

  // diary.csv is the primary source — it carries Rating, Rewatch and the real
  // Watched Date. ratings.csv backfills films rated outside the diary.
  const diaryRows = parseCsv(zip, 'diary.csv');
  const ratingsRows = parseCsv(zip, 'ratings.csv');
  const watchlistRows = parseCsv(zip, 'watchlist.csv');
  const reviewsRows = parseCsv(zip, 'reviews.csv');
  const likedRows = parseCsv(zip, 'likes/films.csv');

  // TODO: watched.csv — films watched without a star. `ratings.value` is NOT
  //   NULL (0.5–5.0), so watch-only entries can't be stored without making the
  //   column nullable. Deferred to a future task.
  // TODO: lists/ subfolder — each file is a separate list export with a
  //   non-standard two-section format. Requires mapping Letterboxd list slugs
  //   to our list system. Deferred.
  // TODO: series import — Letterboxd only tracks films; our TMDB series support
  //   is a separate path. Deferred.

  const total = diaryRows.length + watchlistRows.length + likedRows.length;
  await execute(`UPDATE import_jobs SET total_items = ? WHERE id = ?`, [total, jobId]);

  // 1. diary.csv (primary ratings source, counted).
  await runCountedSource(ctx, 'diary', diaryRows, importDiaryRow, errors);

  // 2. ratings.csv (supplementary — fills gaps for films rated outside the
  //    diary). Not counted: most rows already exist from diary.csv.
  for (const row of ratingsRows) {
    try {
      await importRatingRow(ctx, row);
    } catch (err) {
      errors.push(`ratings: ${row['Name']} (${row['Year']}): ${describeError(err)}`);
    }
    await sleep(TMDB_THROTTLE_MS);
  }

  // 3. watchlist.csv (counted).
  await runCountedSource(ctx, 'watchlist', watchlistRows, importWatchlistRow, errors);

  // 4. likes/films.csv → title_likes (counted).
  await runCountedSource(ctx, 'likes', likedRows, importLikedFilmRow, errors);

  // 5. reviews.csv — attach to an existing rating. Best-effort: review import
  //    failures are never surfaced to the user.
  for (const row of reviewsRows) {
    try {
      await importReviewRow(ctx, row);
    } catch {
      // Swallow — reviews are a nice-to-have layered on top of ratings.
    }
  }

  await execute(
    `UPDATE import_jobs
       SET status = ?, completed_at = NOW(), error_log = ?
     WHERE id = ?`,
    [
      'completed',
      errors.length > 0 ? JSON.stringify(errors.slice(0, MAX_LOGGED_ERRORS)) : null,
      jobId,
    ],
  );

  tryDeleteFile(zipFilePath);
}

/**
 * Runs one "counted" CSV source: each row resolves to imported / skipped /
 * failed, and the matching counter is incremented after every row so the
 * client poll reflects live progress.
 */
async function runCountedSource(
  ctx: ImportContext,
  label: string,
  rows: Record<string, string>[],
  importer: (ctx: ImportContext, row: Record<string, string>) => Promise<RowOutcome>,
  errors: string[],
): Promise<void> {
  for (const row of rows) {
    try {
      const outcome = await importer(ctx, row);
      if (outcome === 'imported') {
        await execute(
          `UPDATE import_jobs SET imported_items = imported_items + 1 WHERE id = ?`,
          [ctx.jobId],
        );
      } else {
        await execute(
          `UPDATE import_jobs SET skipped_items = skipped_items + 1 WHERE id = ?`,
          [ctx.jobId],
        );
      }
    } catch (err) {
      errors.push(`${label}: ${row['Name']} (${row['Year']}): ${describeError(err)}`);
      await execute(
        `UPDATE import_jobs SET failed_items = failed_items + 1 WHERE id = ?`,
        [ctx.jobId],
      );
    }
    await sleep(TMDB_THROTTLE_MS);
  }
}

// ─── Row importers ────────────────────────────────────────────────────────────

/**
 * Imports a diary entry (diary.csv).
 * Columns: Date, Name, Year, Letterboxd URI, Rating, Rewatch, Tags, Watched Date.
 * "Watched Date" is the real watch date; "Date" is the diary log date. The
 * (user_id, film_id) unique key collapses re-watches of the same film into a
 * single rating row (is_rewatch is OR-ed on).
 */
async function importDiaryRow(ctx: ImportContext, row: Record<string, string>): Promise<RowOutcome> {
  const ratingRaw = row['Rating'];
  if (!ratingRaw) {
    // No star — see watched.csv TODO above. Counts as skipped, not failed.
    return 'skipped';
  }
  const filmId = await resolveFilm(row['Name'], row['Year']);
  const value = parseFloat(ratingRaw);
  const watchedOn = parseLbDate(row['Watched Date']) ?? parseLbDate(row['Date']);
  const isRewatch = row['Rewatch'] === 'Yes';
  const lbUri = row['Letterboxd URI'] || null;

  const result = await execute(
    `INSERT INTO ratings
       (user_id, film_id, import_job_id, value, watched_on, is_rewatch, letterboxd_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       value          = COALESCE(VALUES(value), value),
       watched_on     = VALUES(watched_on),
       is_rewatch     = is_rewatch OR VALUES(is_rewatch),
       letterboxd_uri = COALESCE(letterboxd_uri, VALUES(letterboxd_uri))`,
    [ctx.userId, filmId, ctx.jobId, value, watchedOn, isRewatch, lbUri],
  );
  // affectedRows: 1 = inserted (new); 2 = updated; 0 = no change.
  return result.affectedRows === 1 ? 'imported' : 'skipped';
}

/**
 * Imports a standalone rating (ratings.csv).
 * Columns: Date, Name, Year, Letterboxd URI, Rating.
 * Supplementary to diary.csv — only fills the star when no diary entry exists;
 * never overwrites a diary-sourced watched_on or letterboxd_uri.
 */
async function importRatingRow(ctx: ImportContext, row: Record<string, string>): Promise<void> {
  const ratingRaw = row['Rating'];
  if (!ratingRaw) return; // value is NOT NULL — nothing to store without a star.
  const filmId = await resolveFilm(row['Name'], row['Year']);
  const value = parseFloat(ratingRaw);
  const watchedOn = parseLbDate(row['Date']);
  const lbUri = row['Letterboxd URI'] || null;

  await execute(
    `INSERT INTO ratings
       (user_id, film_id, import_job_id, value, watched_on, is_rewatch, letterboxd_uri)
     VALUES (?, ?, ?, ?, ?, 0, ?)
     ON DUPLICATE KEY UPDATE value = COALESCE(VALUES(value), value)`,
    [ctx.userId, filmId, ctx.jobId, value, watchedOn, lbUri],
  );
}

/**
 * Imports a watchlist entry (watchlist.csv).
 * Columns: Date, Name, Year, Letterboxd URI.
 */
async function importWatchlistRow(
  ctx: ImportContext,
  row: Record<string, string>,
): Promise<RowOutcome> {
  const filmId = await resolveFilm(row['Name'], row['Year']);
  const result = await execute(
    `INSERT IGNORE INTO watchlist (user_id, film_id, import_job_id) VALUES (?, ?, ?)`,
    [ctx.userId, filmId, ctx.jobId],
  );
  return result.affectedRows === 1 ? 'imported' : 'skipped';
}

/**
 * Imports a liked film (likes/films.csv) into title_likes.
 * Columns: Date, Name, Year, Letterboxd URI.
 */
async function importLikedFilmRow(
  ctx: ImportContext,
  row: Record<string, string>,
): Promise<RowOutcome> {
  const filmId = await resolveFilm(row['Name'], row['Year']);
  const result = await execute(
    `INSERT IGNORE INTO title_likes (user_id, film_id) VALUES (?, ?)`,
    [ctx.userId, filmId],
  );
  return result.affectedRows === 1 ? 'imported' : 'skipped';
}

/**
 * Attaches a review (reviews.csv) to an existing rating, matched by
 * (user_id, film_id) — the review's own Letterboxd URI differs from both the
 * diary entry URI and the film URI, so it can't be used as the match key.
 * reviews.csv has no spoiler column, so contains_spoilers is always false.
 */
async function importReviewRow(ctx: ImportContext, row: Record<string, string>): Promise<void> {
  const body = row['Review']?.trim();
  if (!body) return;

  const filmId = await resolveFilm(row['Name'], row['Year']).catch(() => null);
  if (filmId === null) return;

  const [rating] = await query<{ id: number }>(
    `SELECT id FROM ratings WHERE user_id = ? AND film_id = ? LIMIT 1`,
    [ctx.userId, filmId],
  );
  if (!rating) return;

  await execute(
    `INSERT IGNORE INTO reviews
       (rating_id, user_id, import_job_id, body, contains_spoilers, original_date)
     VALUES (?, ?, ?, ?, 0, ?)`,
    [rating.id, ctx.userId, ctx.jobId, body, parseLbDate(row['Date'])],
  );
}

// ─── TMDB resolution ──────────────────────────────────────────────────────────

/**
 * Resolves a Letterboxd (name, year) pair to a local films.id, caching the film
 * from TMDB on first sight. Throws when the film cannot be found on TMDB.
 */
async function resolveFilm(name: string, year: string): Promise<number> {
  // 1. Local cache hit by exact title + release year.
  const [local] = await query<{ id: number }>(
    `SELECT id FROM films WHERE title = ? AND YEAR(release_date) = ? LIMIT 1`,
    [name, year],
  );
  if (local) return local.id;

  // 2/3. TMDB search constrained by year, then unconstrained as a fallback.
  const tmdbId = await searchTmdbFilmId(name, year);
  if (tmdbId === null) throw new Error('Not found on TMDB');
  return cacheFilm(tmdbId);
}

/** Searches TMDB for a film id, preferring a year-constrained match. */
async function searchTmdbFilmId(name: string, year: string): Promise<number | null> {
  const withYear = await tmdbSearch(name, year);
  if (withYear !== null) return withYear;
  return tmdbSearch(name, undefined);
}

/** Runs a single TMDB /search/movie request and returns the top result id. */
async function tmdbSearch(name: string, year: string | undefined): Promise<number | null> {
  const params: Record<string, string> = { query: name, page: '1' };
  if (year) params['year'] = year;
  const res = await tmdbFetch<TmdbSearchResponse>('/search/movie', params);
  return res.results[0]?.id ?? null;
}

/**
 * Ensures a local films row exists for a TMDB id (fetching full detail so
 * runtime_min is populated for stats) and returns its local id. Reuses the
 * canonical films.service.upsertFilm so the cache stays consistent.
 */
async function cacheFilm(tmdbId: number): Promise<number> {
  const [existing] = await query<{ id: number }>(
    `SELECT id FROM films WHERE tmdb_id = ? LIMIT 1`,
    [tmdbId],
  );
  if (existing) return existing.id;

  const detail = await tmdbService.getFilmById(tmdbId);
  await upsertFilm(detail);

  const [inserted] = await query<{ id: number }>(
    `SELECT id FROM films WHERE tmdb_id = ? LIMIT 1`,
    [tmdbId],
  );
  if (!inserted) throw new Error('Film cache write failed unexpectedly');
  return inserted.id;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Resolves after `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Best-effort temp-file cleanup — never throws. */
function tryDeleteFile(filePath: string): void {
  fs.unlink(filePath, () => {});
}

/** Extracts a human-readable message from an unknown thrown value. */
function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
