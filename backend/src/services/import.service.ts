import AdmZip from 'adm-zip';
import axios from 'axios';
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

/** Browser-like UA so boxd.it / Letterboxd serve normal redirects, not a block. */
const IMPORT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

/** Per-job state threaded through every row importer. */
interface ImportContext {
  userId: number;
  jobId: number;
  /**
   * Memoises `(name, year)` → `films.id` for the lifetime of one import so every
   * CSV (diary, ratings, watchlist, …) maps a given film to the *same* row and
   * the `(user_id, film_id)` unique key can dedupe across them.
   */
  filmCache: Map<string, number>;
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
            failed_items, error_log, current_step, started_at, completed_at, created_at, updated_at
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
    `UPDATE import_jobs SET status = ?, started_at = NOW(), current_step = ? WHERE id = ?`,
    ['processing', 'preparing', jobId],
  );

  const ctx: ImportContext = { userId, jobId, filmCache: new Map() };
  const zip = new AdmZip(zipFilePath);
  const errors: string[] = [];

  // diary.csv is the primary source — it carries Rating, Rewatch and the real
  // Watched Date. ratings.csv backfills films rated outside the diary.
  const diaryRows = parseCsv(zip, 'diary.csv');
  const ratingsRows = parseCsv(zip, 'ratings.csv');
  const watchlistRows = parseCsv(zip, 'watchlist.csv');
  const reviewsRows = parseCsv(zip, 'reviews.csv');
  const likedRows = parseCsv(zip, 'likes/films.csv');
  const profileRows = parseCsv(zip, 'profile.csv');

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

  // 0. profile.csv — display name, bio and favourite films. Best-effort: a
  //    malformed profile must never fail the whole import.
  await setStep(jobId, 'profile');
  try {
    await importProfile(ctx, profileRows);
  } catch (err) {
    errors.push(`profile: ${describeError(err)}`);
  }

  // 1. diary.csv (primary ratings source, counted).
  await setStep(jobId, 'diary');
  await runCountedSource(ctx, 'diary', diaryRows, importDiaryRow, errors);

  // 2. ratings.csv (supplementary — fills gaps for films rated outside the
  //    diary). Tallied (not counted toward total_items) for the summary below.
  await setStep(jobId, 'ratings');
  let ratingsNew = 0;
  let ratingsDuplicate = 0;
  let ratingsErrored = 0;
  for (const row of ratingsRows) {
    try {
      const outcome = await importRatingRow(ctx, row);
      if (outcome === 'imported') ratingsNew += 1;
      else ratingsDuplicate += 1;
    } catch (err) {
      ratingsErrored += 1;
      errors.push(`ratings: ${row['Name']} (${row['Year']}): ${describeError(err)}`);
    }
    await sleep(TMDB_THROTTLE_MS);
  }

  // 3. watchlist.csv (counted).
  await setStep(jobId, 'watchlist');
  await runCountedSource(ctx, 'watchlist', watchlistRows, importWatchlistRow, errors);

  // 4. likes/films.csv → title_likes (counted).
  await setStep(jobId, 'likes');
  await runCountedSource(ctx, 'likes', likedRows, importLikedFilmRow, errors);

  // 5. reviews.csv — attach to an existing rating. Best-effort: review import
  //    failures are never surfaced to the user.
  await setStep(jobId, 'reviews');
  for (const row of reviewsRows) {
    try {
      await importReviewRow(ctx, row);
    } catch {
      // Swallow — reviews are a nice-to-have layered on top of ratings.
    }
  }

  // One-line, human-readable summary of what each CSV contributed, stored at
  // the head of error_log so an under-delivering import is diagnosable from the
  // job row alone — e.g. a ratings.csv that parsed empty (download/zip problem)
  // vs. one that resolved entirely to films the diary already created.
  const summary =
    `[import summary] parsed rows — profile:${profileRows.length} ` +
    `diary:${diaryRows.length} ratings:${ratingsRows.length} ` +
    `watchlist:${watchlistRows.length} likes:${likedRows.length} ` +
    `reviews:${reviewsRows.length}; ` +
    `ratings.csv — new:${ratingsNew} duplicate:${ratingsDuplicate} errored:${ratingsErrored}`;
  const log = [summary, ...errors].slice(0, MAX_LOGGED_ERRORS + 1);

  await execute(
    `UPDATE import_jobs
       SET status = ?, completed_at = NOW(), error_log = ?
     WHERE id = ?`,
    ['completed', JSON.stringify(log), jobId],
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
 * "Watched Date" is the real watch date; "Date" is the diary log date. Each
 * diary entry becomes its own rating row, so rewatches are preserved as separate
 * logs; re-importing the same entry is de-duplicated on the unique letterboxd_uri
 * that the ON DUPLICATE KEY UPDATE below keys on.
 */
async function importDiaryRow(ctx: ImportContext, row: Record<string, string>): Promise<RowOutcome> {
  const ratingRaw = row['Rating'];
  if (!ratingRaw) {
    // No star — see watched.csv TODO above. Counts as skipped, not failed.
    return 'skipped';
  }
  const filmId = await resolveFilm(ctx, row['Name'], row['Year']);
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
 * Supplementary to diary.csv — only adds a log for films the user has no log
 * for at all. Now that multiple ratings per film are allowed, the old (user,
 * film) unique key no longer blocks a duplicate, so we check for an existing
 * log explicitly; otherwise every rated film already in the diary would be
 * logged twice.
 */
async function importRatingRow(
  ctx: ImportContext,
  row: Record<string, string>,
): Promise<RowOutcome> {
  const ratingRaw = row['Rating'];
  if (!ratingRaw) return 'skipped'; // value is NOT NULL — nothing to store without a star.
  const filmId = await resolveFilm(ctx, row['Name'], row['Year']);

  const [existing] = await query<{ id: number }>(
    `SELECT id FROM ratings WHERE user_id = ? AND film_id = ? LIMIT 1`,
    [ctx.userId, filmId],
  );
  if (existing) return 'skipped';

  const value = parseFloat(ratingRaw);
  const watchedOn = parseLbDate(row['Date']);
  const lbUri = row['Letterboxd URI'] || null;

  const result = await execute(
    `INSERT INTO ratings
       (user_id, film_id, import_job_id, value, watched_on, is_rewatch, letterboxd_uri)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    [ctx.userId, filmId, ctx.jobId, value, watchedOn, lbUri],
  );
  return result.affectedRows === 1 ? 'imported' : 'skipped';
}

/**
 * Imports a watchlist entry (watchlist.csv).
 * Columns: Date, Name, Year, Letterboxd URI.
 */
async function importWatchlistRow(
  ctx: ImportContext,
  row: Record<string, string>,
): Promise<RowOutcome> {
  const filmId = await resolveFilm(ctx, row['Name'], row['Year']);
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
  const filmId = await resolveFilm(ctx, row['Name'], row['Year']);
  const result = await execute(
    `INSERT IGNORE INTO title_likes (user_id, film_id) VALUES (?, ?)`,
    [ctx.userId, filmId],
  );
  return result.affectedRows === 1 ? 'imported' : 'skipped';
}

/**
 * Attaches a review (reviews.csv) to one of the user's logs of the film. A film
 * may now have several logs (rewatches), so the review is matched to the log
 * whose watched date equals the review's, preferring a log that has no review
 * yet, and falling back to the most recent log. The review's own Letterboxd URI
 * differs from both the diary entry URI and the film URI, so it can't be used as
 * the match key. reviews.csv has no spoiler column, so contains_spoilers is
 * always false.
 */
async function importReviewRow(ctx: ImportContext, row: Record<string, string>): Promise<void> {
  const body = row['Review']?.trim();
  if (!body) return;

  const filmId = await resolveFilm(ctx, row['Name'], row['Year']).catch(() => null);
  if (filmId === null) return;

  const watchedOn = parseLbDate(row['Watched Date']) ?? parseLbDate(row['Date']);
  const [rating] = await query<{ id: number }>(
    `SELECT r.id
       FROM ratings r
       LEFT JOIN reviews rv ON rv.rating_id = r.id
      WHERE r.user_id = ? AND r.film_id = ?
      ORDER BY (r.watched_on <=> ?) DESC,
               (rv.id IS NULL) DESC,
               r.watched_on DESC, r.created_at DESC, r.id DESC
      LIMIT 1`,
    [ctx.userId, filmId, watchedOn],
  );
  if (!rating) return;

  await execute(
    `INSERT IGNORE INTO reviews
       (rating_id, user_id, import_job_id, body, contains_spoilers, original_date)
     VALUES (?, ?, ?, ?, 0, ?)`,
    [rating.id, ctx.userId, ctx.jobId, body, parseLbDate(row['Date'])],
  );
}

// ─── Profile (name, bio, favourites) ─────────────────────────────────────────

/** A film reference parsed from the profile.csv "Favorite Films" cell. */
interface FavoriteFilmRef {
  name: string;
  year: string;
}

/**
 * Applies profile.csv: the user's display name, bio and favourite films. Only
 * fields the export actually provides are written, so importing never blanks
 * out values the user may already have set in Overture.
 */
async function importProfile(
  ctx: ImportContext,
  rows: Record<string, string>[],
): Promise<void> {
  const [profile] = rows;
  if (!profile) return;

  const name = profile['Given Name']?.trim();
  if (name) {
    await execute(`UPDATE users SET name = ? WHERE id = ?`, [name, ctx.userId]);
  }
  const bio = profile['Bio']?.trim();
  if (bio) {
    await execute(`UPDATE users SET bio = ? WHERE id = ?`, [bio, ctx.userId]);
  }

  await importFavoriteFilms(ctx, profile['Favorite Films']);
}

/**
 * Resolves up to four favourite films and replaces the user's favourites with
 * them, preserving the export's order. Films that don't resolve on TMDB are
 * skipped; favourites are only rewritten when at least one resolves, so a
 * profile without favourites leaves any existing ones untouched.
 */
async function importFavoriteFilms(
  ctx: ImportContext,
  raw: string | undefined,
): Promise<void> {
  const tokens = parseFavoriteTokens(raw);
  if (tokens.length === 0) return;

  const filmIds: number[] = [];
  for (const token of tokens) {
    if (filmIds.length === 4) break;
    try {
      const ref = await resolveFavoriteRef(token);
      if (!ref) continue;
      const filmId = await resolveFilm(ctx, ref.name, ref.year);
      if (!filmIds.includes(filmId)) filmIds.push(filmId);
    } catch {
      // A favourite that can't be matched is simply skipped.
    }
    await sleep(TMDB_THROTTLE_MS);
  }
  if (filmIds.length === 0) return;

  await execute(`DELETE FROM user_favorites WHERE user_id = ?`, [ctx.userId]);
  for (const [index, filmId] of filmIds.entries()) {
    await execute(
      `INSERT INTO user_favorites (user_id, film_id, series_id, position)
       VALUES (?, ?, NULL, ?)`,
      [ctx.userId, filmId, index + 1],
    );
  }
}

/** Splits the "Favorite Films" cell into its comma-separated entries. */
function parseFavoriteTokens(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

/**
 * Turns one "Favorite Films" entry into a resolvable (name, year) reference.
 * Letterboxd exports favourites as boxd.it short links, which 301-redirect to
 * the canonical letterboxd.com/film/<slug>/ URL; we follow that one hop and read
 * the slug. Full film URLs and plain titles are also accepted. Returns null when
 * the entry can't be turned into a usable reference.
 */
async function resolveFavoriteRef(token: string): Promise<FavoriteFilmRef | null> {
  let url = token;
  if (/^https?:\/\/boxd\.it\//i.test(token)) {
    const expanded = await expandBoxdLink(token);
    if (!expanded) return null;
    url = expanded;
  }

  const filmAt = url.indexOf('/film/');
  if (filmAt !== -1) {
    const segments = url
      .slice(filmAt + '/film/'.length)
      .replace(/\/+$/, '')
      .split('/');
    const slug = segments[0];
    if (!slug) return null;
    return splitTrailingYear(slug.replace(/-/g, ' ').trim());
  }

  // Plain title fallback, possibly "Title (YYYY)".
  const titled = token.match(/^(.*)\((\d{4})\)\s*$/);
  if (titled) {
    const [, name = '', year = ''] = titled;
    return { name: name.trim(), year };
  }
  return { name: token, year: '' };
}

/**
 * Follows a boxd.it short link's redirect and returns its target URL (the
 * canonical letterboxd.com/film/<slug>/ page), or null if it can't be followed.
 */
async function expandBoxdLink(shortUrl: string): Promise<string | null> {
  try {
    const res = await axios.get(shortUrl, {
      maxRedirects: 0,
      timeout: 8000,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: { 'User-Agent': IMPORT_USER_AGENT },
    });
    const location = res.headers['location'];
    return typeof location === 'string' ? location : null;
  } catch {
    return null;
  }
}

/** Splits a trailing 4-digit year off a space-joined slug ("whiplash 2014"). */
function splitTrailingYear(words: string): FavoriteFilmRef {
  const match = words.match(/^(.*?)\s(\d{4})$/);
  if (match) {
    const [, name = '', year = ''] = match;
    return { name: name.trim(), year };
  }
  return { name: words, year: '' };
}

// ─── TMDB resolution ──────────────────────────────────────────────────────────

/**
 * Resolves a Letterboxd (name, year) pair to a local films.id, memoised per
 * import job so every CSV maps a given film to the same row (the memo is what
 * guarantees diary.csv and ratings.csv agree on an id and therefore dedupe).
 *
 * Fast-path: the local (title, release year) lookup is trusted only when it
 * matches exactly one cached film. The films table also holds TMDB search
 * results and remakes that share a title and year, and an ambiguous `LIMIT 1`
 * is precisely what made the two CSVs disagree before. Anything ambiguous (>1
 * match) or absent (0) falls through to an authoritative lookup via the unique
 * tmdb_id. Throws when the film cannot be found on TMDB.
 */
async function resolveFilm(ctx: ImportContext, name: string, year: string): Promise<number> {
  const key = `${name} ${year}`;
  const memoised = ctx.filmCache.get(key);
  if (memoised !== undefined) return memoised;

  // Fast-path: fetch up to two candidates so a unique cached match can be told
  // from an ambiguous set; only an unambiguous single match is safe to trust
  // without TMDB (the films table also holds search results and remakes that
  // share a title and release year).
  const candidates = await query<{ id: number }>(
    `SELECT id FROM films WHERE title = ? AND YEAR(release_date) = ? LIMIT 2`,
    [name, year],
  );
  const [first] = candidates;
  if (candidates.length === 1 && first) {
    ctx.filmCache.set(key, first.id);
    return first.id;
  }

  // 0 or >1 matches → resolve through TMDB's unique id (cacheFilm inserts on
  // first sight), which guarantees the same film always maps to the same row.
  const tmdbId = await searchTmdbFilmId(name, year);
  if (tmdbId === null) throw new Error('Not found on TMDB');
  const filmId = await cacheFilm(tmdbId);
  ctx.filmCache.set(key, filmId);
  return filmId;
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

/** Records the stage the importer is on for live client feedback. */
async function setStep(jobId: number, step: string): Promise<void> {
  await execute(`UPDATE import_jobs SET current_step = ? WHERE id = ?`, [step, jobId]);
}

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
