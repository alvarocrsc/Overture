import { query, execute } from '../config/db';
import { AppError } from '../utils/app-error';
import * as filmsService from './films.service';
import * as seriesService from './series.service';
import type { Rating } from '../models/rating.model';
import type { Review } from '../models/review.model';
import type { CreateRatingInput, UpdateRatingInput } from '../validators/rating.validators';
import type { ResultSetHeader } from 'mysql2';

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
}

/** Result returned after creating a rating. */
export interface CreateRatingResult {
  ratingId: number;
  reviewId: number | null;
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

    const [existing] = await query<IdRow>(
      `SELECT id FROM ratings WHERE user_id = ? AND film_id = ?`,
      [userId, internalFilmId],
    );
    if (existing) {
      throw new AppError('You have already logged this title', 409);
    }
  } else {
    // series_id is defined — checked above
    internalSeriesId = await resolveSeriesId(data.series_id!);

    const [existing] = await query<IdRow>(
      `SELECT id FROM ratings WHERE user_id = ? AND series_id = ?`,
      [userId, internalSeriesId],
    );
    if (existing) {
      throw new AppError('You have already logged this title', 409);
    }
  }

  let ratingInsert: ResultSetHeader;
  try {
    ratingInsert = await execute(
      `INSERT INTO ratings (user_id, film_id, series_id, value, is_rewatch, watched_on)
       VALUES (?, ?, ?, ?, ?, COALESCE(?, CURDATE()))`,
      [userId, internalFilmId, internalSeriesId, data.value, data.is_rewatch, data.watched_on ?? null],
    );
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      throw new AppError('You have already logged this title', 409);
    }
    throw err;
  }

  const ratingId = ratingInsert.insertId;
  let reviewId: number | null = null;

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
  }

  return { ratingId, reviewId };
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

/** Options for getRatingsByUser. */
export interface GetRatingsOptions {
  type?: 'film' | 'series';
  page: number;
  limit: number;
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
       f.poster_path AS film_poster,
       s.tmdb_id  AS series_tmdb_id,
       s.title    AS series_title,
       s.poster_path AS series_poster,
       rev.id     AS review_id,
       rev.body   AS review_body,
       rev.contains_spoilers,
       rev.liked_title
     FROM ratings r
     LEFT JOIN films   f   ON r.film_id   = f.id
     LEFT JOIN series  s   ON r.series_id = s.id
     LEFT JOIN reviews rev ON rev.rating_id = r.id
     ${baseWhere}
     ORDER BY r.watched_on DESC, r.created_at DESC
     LIMIT ${clampedLimit} OFFSET ${offset}`,
    [userId],
  );

  return { data: rows, total, page: options.page, limit: clampedLimit };
}

/** Narrows an unknown error to a mysql2 duplicate-key error (errno 1062). */
function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'errno' in err &&
    (err as { errno: number }).errno === 1062
  );
}
