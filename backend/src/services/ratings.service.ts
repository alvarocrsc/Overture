import { query, execute } from '../config/db';
import { AppError } from '../utils/app-error';
import * as filmsService from './films.service';
import * as seriesService from './series.service';
import type { Rating } from '../models/rating.model';
import type { Review } from '../models/review.model';
import type { CreateRatingInput, UpdateRatingInput } from '../validators/rating.validators';

/** Shape of an internal DB id lookup result. */
interface IdRow {
  id: number;
}

/** Shape of a rating row joined with film/series/review data for list queries. */
export interface RatingListRow {
  id: number;
  value: number;
  is_rewatch: boolean;
  watched_on: string | null;
  created_at: Date;
  film_tmdb_id: number | null;
  film_title: string | null;
  film_poster: string | null;
  series_tmdb_id: number | null;
  series_title: string | null;
  series_poster: string | null;
  review_id: number | null;
  review_body: string | null;
  contains_spoilers: boolean | null;
  liked_title: boolean | null;
  /**
   * Whether the user currently likes this title, derived from `title_likes`
   * (the live like state) rather than `liked_title` (a per-review snapshot).
   * A user can like a title without ever writing a review, so these differ.
   * Returned as 0/1 by MySQL; coerce to boolean at the call site.
   */
  is_liked: boolean;
}

/** Result returned after creating a rating. */
export interface CreateRatingResult {
  rating_id: number;
  review_id: number | null;
  is_rewatch: boolean;
}

/**
 * Resolves a TMDB movie ID to the internal films.id.
 * If the film is not cached locally, fetches it from TMDB and caches it first.
 * Throws 404 only if TMDB also has no record for that ID.
 * @param tmdbId - The TMDB movie ID sent by the client.
 * @returns The internal films.id.
 */
async function resolveFilmId(tmdbId: number): Promise<number> {
  // Fast-path only when the film AND its credits are already cached.
  // A film cached via search/trending has no film_credits rows, so we must
  // fall through to getFilmById to populate them.
  const [row] = await query<IdRow>(
    `SELECT f.id FROM films f
     WHERE f.tmdb_id = ?
       AND EXISTS (SELECT 1 FROM film_credits WHERE film_id = f.id)`,
    [tmdbId],
  );
  if (row) return row.id;

  // Not cached — fetch from TMDB (handles upsert into films table).
  try {
    const film = await filmsService.getFilmById(tmdbId);
    return film.id;
  } catch {
    throw new AppError('Film not found', 404);
  }
}

/**
 * Resolves a TMDB series ID to the internal series.id.
 * If the series is not cached locally, fetches it from TMDB and caches it first.
 * Throws 404 only if TMDB also has no record for that ID.
 * @param tmdbId - The TMDB series ID sent by the client.
 * @returns The internal series.id.
 */
async function resolveSeriesId(tmdbId: number): Promise<number> {
  const [row] = await query<IdRow>(`SELECT id FROM series WHERE tmdb_id = ?`, [tmdbId]);
  if (row) return row.id;

  // Not cached — fetch from TMDB (handles upsert into series table).
  try {
    const series = await seriesService.getSeriesById(tmdbId);
    return series.id;
  } catch {
    throw new AppError('Series not found', 404);
  }
}

/**
 * Creates a new rating (and optional review) for a film or series.
 * Exactly one of film_id or series_id must be provided (TMDB IDs — resolved internally).
 * @param userId - The authenticated user's ID.
 * @param data - Validated create input.
 * @returns The new ratingId and reviewId (if a review was created).
 */
export async function createRating(
  userId: number,
  data: CreateRatingInput,
): Promise<CreateRatingResult> {
  const hasBoth = data.film_id !== undefined && data.series_id !== undefined;
  const hasNeither = data.film_id === undefined && data.series_id === undefined;
  if (hasBoth || hasNeither) {
    throw new AppError('Provide either film_id or series_id, not both', 400);
  }

  let internalFilmId: number | null = null;
  let internalSeriesId: number | null = null;

  if (data.film_id !== undefined) {
    internalFilmId = await resolveFilmId(data.film_id);
  } else {
    // series_id is defined — checked above
    internalSeriesId = await resolveSeriesId(data.series_id!);
  }

  // Multiple logs of the same title are allowed (rewatches each get their own
  // diary entry). A log counts as a rewatch when the client flags it, or — so
  // the user never has to toggle it manually — when the user has logged this
  // title at least once before.
  const [priorLog] = await query<IdRow>(
    `SELECT id FROM ratings
      WHERE user_id = ?
        AND ((? IS NOT NULL AND film_id   = ?)
          OR (? IS NOT NULL AND series_id = ?))
      LIMIT 1`,
    [userId, internalFilmId, internalFilmId, internalSeriesId, internalSeriesId],
  );
  const isRewatch = data.is_rewatch || priorLog !== undefined;

  const ratingInsert = await execute(
    `INSERT INTO ratings (user_id, film_id, series_id, value, is_rewatch, watched_on)
     VALUES (?, ?, ?, ?, ?, COALESCE(?, CURDATE()))`,
    [userId, internalFilmId, internalSeriesId, data.value, isRewatch, data.watched_on ?? null],
  );

  const ratingId = ratingInsert.insertId;
  let reviewId: number | null = null;

  // Logging a title implies it has been watched — remove any matching
  // watchlist entry so the user doesn't see it queued anymore.
  await execute(
    `DELETE FROM watchlist
       WHERE user_id = ?
         AND ((film_id IS NOT NULL AND film_id = ?)
           OR (series_id IS NOT NULL AND series_id = ?))`,
    [userId, internalFilmId, internalSeriesId],
  );

  if (data.review) {
    const reviewInsert = await execute(
      `INSERT INTO reviews (rating_id, user_id, body, contains_spoilers, liked_title)
       VALUES (?, ?, ?, ?, ?)`,
      [
        ratingId,
        userId,
        data.review.body,
        data.review.contains_spoilers,
        data.review.liked_title,
      ],
    );
    reviewId = reviewInsert.insertId;

    if (data.review.liked_title) {
      await execute(
        `INSERT IGNORE INTO title_likes (user_id, film_id, series_id) VALUES (?, ?, ?)`,
        [userId, internalFilmId, internalSeriesId],
      );
    }

    // Persist any TMDB backdrops attached to the review as review_media rows.
    const paths = data.review.backdrop_paths ?? [];
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i]!;
      const url = `https://image.tmdb.org/t/p/w1280${path}`;
      const previewUrl = `https://image.tmdb.org/t/p/w780${path}`;
      await execute(
        `INSERT INTO review_media
           (review_id, media_type, source, source_id, url, preview_url, position)
         VALUES (?, 'image', 'tmdb', ?, ?, ?, ?)`,
        [reviewId, path, url, previewUrl, i],
      );
    }
  }

  return { rating_id: ratingId, review_id: reviewId, is_rewatch: isRewatch };
}

/**
 * Updates an existing rating and optionally upserts its review.
 * Only the authenticated owner may update.
 * @param ratingId - The rating's primary key.
 * @param userId - The authenticated user's ID.
 * @param data - Validated update input (all fields optional).
 * @returns The updated ratingId.
 */
export async function updateRating(
  ratingId: number,
  userId: number,
  data: UpdateRatingInput,
): Promise<{ ratingId: number }> {
  const [rating] = await query<Rating>(
    `SELECT id, user_id, film_id, series_id FROM ratings WHERE id = ?`,
    [ratingId],
  );
  if (!rating) {
    throw new AppError('Rating not found', 404);
  }
  if (rating.user_id !== userId) {
    throw new AppError('Forbidden', 403);
  }

  // Build a partial UPDATE only for provided fields.
  const setClauses: string[] = [];
  const params: unknown[] = [];

  if (data.value !== undefined) {
    setClauses.push('value = ?');
    params.push(data.value);
  }
  if (data.watched_on !== undefined) {
    setClauses.push('watched_on = ?');
    params.push(data.watched_on);
  }
  if (data.is_rewatch !== undefined) {
    setClauses.push('is_rewatch = ?');
    params.push(data.is_rewatch);
  }

  if (setClauses.length > 0) {
    params.push(ratingId);
    await execute(
      `UPDATE ratings SET ${setClauses.join(', ')} WHERE id = ?`,
      params as Parameters<typeof execute>[1],
    );
  }

  if (data.review !== undefined) {
    const [existingReview] = await query<Review>(
      `SELECT id, liked_title FROM reviews WHERE rating_id = ?`,
      [ratingId],
    );

    if (existingReview) {
      const reviewSets: string[] = [];
      const reviewParams: unknown[] = [];

      if (data.review.body !== undefined) {
        reviewSets.push('body = ?');
        reviewParams.push(data.review.body);
      }
      if (data.review.contains_spoilers !== undefined) {
        reviewSets.push('contains_spoilers = ?');
        reviewParams.push(data.review.contains_spoilers);
      }
      if (data.review.liked_title !== undefined) {
        reviewSets.push('liked_title = ?');
        reviewParams.push(data.review.liked_title);
      }

      if (reviewSets.length > 0) {
        reviewParams.push(existingReview.id);
        await execute(
          `UPDATE reviews SET ${reviewSets.join(', ')} WHERE id = ?`,
          reviewParams as Parameters<typeof execute>[1],
        );
      }

      // Sync title_likes with the new liked_title state.
      if (data.review.liked_title === true) {
        await execute(
          `INSERT IGNORE INTO title_likes (user_id, film_id, series_id) VALUES (?, ?, ?)`,
          [userId, rating.film_id, rating.series_id],
        );
      } else if (data.review.liked_title === false) {
        await execute(
          `DELETE FROM title_likes WHERE user_id = ?
           AND (film_id = ? OR series_id = ?)`,
          [userId, rating.film_id, rating.series_id],
        );
      }
    } else {
      const reviewInsert = await execute(
        `INSERT INTO reviews (rating_id, user_id, body, contains_spoilers, liked_title)
         VALUES (?, ?, ?, ?, ?)`,
        [
          ratingId,
          userId,
          data.review.body,
          data.review.contains_spoilers ?? false,
          data.review.liked_title ?? false,
        ],
      );

      if (data.review.liked_title) {
        await execute(
          `INSERT IGNORE INTO title_likes (user_id, film_id, series_id) VALUES (?, ?, ?)`,
          [userId, rating.film_id, rating.series_id],
        );
      }

      // Suppress unused variable warning — insertId available if needed later.
      void reviewInsert.insertId;
    }
  }

  return { ratingId };
}

/**
 * Deletes a rating (and its review via ON DELETE CASCADE).
 * Only the authenticated owner may delete.
 * @param ratingId - The rating's primary key.
 * @param userId - The authenticated user's ID.
 */
export async function deleteRating(ratingId: number, userId: number): Promise<void> {
  const [rating] = await query<Rating>(
    `SELECT id, user_id FROM ratings WHERE id = ?`,
    [ratingId],
  );
  if (!rating) {
    throw new AppError('Rating not found', 404);
  }
  if (rating.user_id !== userId) {
    throw new AppError('Forbidden', 403);
  }

  await execute(`DELETE FROM ratings WHERE id = ?`, [ratingId]);
}

export interface LoggedMembershipRow {
  tmdb_id: number;
  media_type: 'film' | 'series';
}

/**
 * Returns a lightweight list of every (tmdb_id, media_type) the user has
 * logged at least once. Used as the single source of truth for the
 * "logged" tick icon across search, recents and trending surfaces.
 *
 * @param userId - The authenticated user's id.
 */
export async function getLoggedMembership(
  userId: number,
): Promise<LoggedMembershipRow[]> {
  const rows = await query<{
    film_tmdb_id: number | null;
    series_tmdb_id: number | null;
  }>(
    `SELECT DISTINCT
            f.tmdb_id AS film_tmdb_id,
            s.tmdb_id AS series_tmdb_id
       FROM ratings r
       LEFT JOIN films  f ON r.film_id   = f.id
       LEFT JOIN series s ON r.series_id = s.id
      WHERE r.user_id = ?`,
    [userId],
  );

  return rows
    .map<LoggedMembershipRow | null>((r) => {
      if (r.film_tmdb_id != null) {
        return { tmdb_id: r.film_tmdb_id, media_type: 'film' };
      }
      if (r.series_tmdb_id != null) {
        return { tmdb_id: r.series_tmdb_id, media_type: 'series' };
      }
      return null;
    })
    .filter((r): r is LoggedMembershipRow => r !== null);
}

/** Options for getRatingsByUser. */
export interface GetRatingsOptions {
  type?: 'film' | 'series';
  page: number;
  limit: number;
  /**
   * Library mode: collapse rewatches so each title appears once (latest log +
   * latest review). Diary mode (default) returns every individual log.
   */
  distinct?: boolean;
  /** Whitelisted sort key, applied in distinct mode only. See DISTINCT_SORTS. */
  sort?: string;
}

/**
 * Returns paginated ratings for a user, joined with film/series/review data.
 * @param userId - The user whose ratings to fetch.
 * @param options - Filtering and pagination options.
 * @returns Paginated ratings with total count.
 */
export async function getRatingsByUser(
  userId: number,
  options: GetRatingsOptions,
): Promise<{ data: RatingListRow[]; total: number; page: number; limit: number }> {
  const [user] = await query<IdRow>(`SELECT id FROM users WHERE id = ?`, [userId]);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const clampedLimit = Math.min(options.limit, 100);
  const offset = (options.page - 1) * clampedLimit;

  let typeFilter = '';
  if (options.type === 'film') typeFilter = 'AND r.film_id IS NOT NULL';
  if (options.type === 'series') typeFilter = 'AND r.series_id IS NOT NULL';

  // Library mode collapses rewatches into one row per title, sorted by release
  // date (default); diary mode below keeps every individual log, newest first.
  if (options.distinct) {
    return getDistinctTitlesPage(userId, {
      clampedLimit,
      offset,
      typeFilter,
      page: options.page,
      sort: options.sort,
    });
  }

  const baseWhere = `WHERE r.user_id = ? ${typeFilter}`;

  const [countRow] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM ratings r ${baseWhere}`,
    [userId],
  );
  // Non-null assertion safe: COUNT(*) always returns a row.
  const total = countRow!.total;

  const rows = await query<RatingListRow>(
    `SELECT
       r.id,
       r.value,
       r.is_rewatch,
       r.watched_on,
       r.created_at,
       f.tmdb_id  AS film_tmdb_id,
       f.title    AS film_title,
       COALESCE(pf.custom_poster_path, f.poster_path) AS film_poster,
       s.tmdb_id  AS series_tmdb_id,
       s.title    AS series_title,
       COALESCE(ps.custom_poster_path, s.poster_path) AS series_poster,
       rev.id     AS review_id,
       rev.body   AS review_body,
       rev.contains_spoilers,
       rev.liked_title,
       (tl.id IS NOT NULL) AS is_liked
     FROM ratings r
     LEFT JOIN films   f   ON r.film_id   = f.id
     LEFT JOIN series  s   ON r.series_id = s.id
     LEFT JOIN reviews rev ON rev.rating_id = r.id
     LEFT JOIN title_likes tl
       ON tl.user_id = r.user_id
      AND ((r.film_id   IS NOT NULL AND tl.film_id   = r.film_id)
        OR (r.series_id IS NOT NULL AND tl.series_id = r.series_id))
     LEFT JOIN user_title_display_prefs pf
       ON pf.user_id = r.user_id AND pf.film_id   = f.id
     LEFT JOIN user_title_display_prefs ps
       ON ps.user_id = r.user_id AND ps.series_id = s.id
     ${baseWhere}
     ORDER BY r.watched_on DESC, r.created_at DESC, r.id DESC
     LIMIT ${clampedLimit} OFFSET ${offset}`,
    [userId],
  );

  return { data: rows, total, page: options.page, limit: clampedLimit };
}

/**
 * Whitelisted ORDER BY clauses for the distinct/library view. Keyed so the
 * client can only ever pick a pre-vetted ordering (no SQL injection surface).
 * `release_date` / `sort_title` are aliases projected by getDistinctTitlesPage;
 * `release_date IS NULL` keeps titles with an unknown release date at the
 * bottom regardless of direction.
 */
const DISTINCT_SORTS: Record<string, string> = {
  release_desc: 'release_date IS NULL ASC, release_date DESC, sort_title ASC, rep.id DESC',
  release_asc: 'release_date IS NULL ASC, release_date ASC, sort_title ASC, rep.id DESC',
  rated_desc: 'rep.value DESC, sort_title ASC, rep.id DESC',
  rated_asc: 'rep.value ASC, sort_title ASC, rep.id DESC',
  logged_desc: 'rep.watched_on DESC, rep.created_at DESC, rep.id DESC',
  logged_asc: 'rep.watched_on ASC, rep.created_at ASC, rep.id ASC',
};

const DEFAULT_DISTINCT_SORT = 'release_desc';

interface DistinctPageParams {
  clampedLimit: number;
  offset: number;
  typeFilter: string;
  page: number;
  sort: string | undefined;
}

/**
 * Library view: one row per distinct title the user has logged, collapsing
 * rewatches. The representative row is the user's most recent log of that
 * title; `review_id` points at their most recent review of it (which may belong
 * to an older log than the representative). Sorted by the whitelisted `sort`
 * key, defaulting to newest release first.
 */
async function getDistinctTitlesPage(
  userId: number,
  params: DistinctPageParams,
): Promise<{ data: RatingListRow[]; total: number; page: number; limit: number }> {
  const { clampedLimit, offset, typeFilter, page } = params;
  const orderBy =
    DISTINCT_SORTS[params.sort ?? ''] ?? DISTINCT_SORTS[DEFAULT_DISTINCT_SORT]!;

  const [countRow] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM (
       SELECT 1
         FROM ratings r
        WHERE r.user_id = ? ${typeFilter}
        GROUP BY r.film_id, r.series_id
     ) t`,
    [userId],
  );
  // Non-null assertion safe: COUNT(*) always returns a row.
  const total = countRow!.total;

  const rows = await query<RatingListRow>(
    `SELECT
       rep.id,
       rep.value,
       rep.is_rewatch,
       rep.watched_on,
       rep.created_at,
       f.tmdb_id  AS film_tmdb_id,
       f.title    AS film_title,
       COALESCE(pf.custom_poster_path, f.poster_path) AS film_poster,
       s.tmdb_id  AS series_tmdb_id,
       s.title    AS series_title,
       COALESCE(ps.custom_poster_path, s.poster_path) AS series_poster,
       (
         SELECT rev.id FROM reviews rev
           JOIN ratings r2 ON rev.rating_id = r2.id
          WHERE r2.user_id = ?
            AND ((rep.film_id   IS NOT NULL AND r2.film_id   = rep.film_id)
              OR (rep.series_id IS NOT NULL AND r2.series_id = rep.series_id))
          ORDER BY rev.created_at DESC, rev.id DESC
          LIMIT 1
       ) AS review_id,
       NULL AS review_body,
       NULL AS contains_spoilers,
       NULL AS liked_title,
       (tl.id IS NOT NULL) AS is_liked,
       COALESCE(f.release_date, s.first_air_date) AS release_date,
       COALESCE(f.title, s.title) AS sort_title
     FROM (
       SELECT r.*,
              ROW_NUMBER() OVER (
                PARTITION BY r.film_id, r.series_id
                ORDER BY r.watched_on DESC, r.created_at DESC, r.id DESC
              ) AS rn
         FROM ratings r
        WHERE r.user_id = ? ${typeFilter}
     ) rep
     LEFT JOIN films  f ON rep.film_id   = f.id
     LEFT JOIN series s ON rep.series_id = s.id
     LEFT JOIN title_likes tl
       ON tl.user_id = ?
      AND ((rep.film_id   IS NOT NULL AND tl.film_id   = rep.film_id)
        OR (rep.series_id IS NOT NULL AND tl.series_id = rep.series_id))
     LEFT JOIN user_title_display_prefs pf
       ON pf.user_id = ? AND pf.film_id   = f.id
     LEFT JOIN user_title_display_prefs ps
       ON ps.user_id = ? AND ps.series_id = s.id
     WHERE rep.rn = 1
     ORDER BY ${orderBy}
     LIMIT ${clampedLimit} OFFSET ${offset}`,
    [userId, userId, userId, userId, userId],
  );

  return { data: rows, total, page, limit: clampedLimit };
}
