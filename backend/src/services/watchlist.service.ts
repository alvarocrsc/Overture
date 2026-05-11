import { query, execute } from '../config/db';
import { AppError } from '../utils/app-error';
import type { AddToWatchlistInput } from '../validators/watchlist.validators';

/** A single watchlist row joined with film/series data. */
export interface WatchlistRow {
  id: number;
  priority: number;
  added_at: Date;
  film_tmdb_id: number | null;
  film_title: string | null;
  film_poster: string | null;
  film_release_date: string | null;
  film_rating: number | null;
  series_tmdb_id: number | null;
  series_title: string | null;
  series_poster: string | null;
  series_first_air_date: string | null;
  series_rating: number | null;
}

/** Internal ID lookup. */
interface IdRow {
  id: number;
}

/** Internal watchlist ownership row. */
interface WatchlistOwnerRow {
  id: number;
  user_id: number;
}

/** Options for getWatchlist. */
export interface GetWatchlistOptions {
  type?: 'film' | 'series';
  page: number;
  limit: number;
}

/**
 * Returns a paginated watchlist for the authenticated user.
 * @param userId - The authenticated user's ID.
 * @param options - Type filter and pagination options.
 * @returns Paginated watchlist entries.
 */
export async function getWatchlist(
  userId: number,
  options: GetWatchlistOptions,
): Promise<{ data: WatchlistRow[]; total: number; page: number; limit: number }> {
  const clampedLimit = Math.min(options.limit, 100);
  const offset = (options.page - 1) * clampedLimit;

  let typeFilter = '';
  if (options.type === 'film') typeFilter = 'AND w.film_id IS NOT NULL';
  if (options.type === 'series') typeFilter = 'AND w.series_id IS NOT NULL';

  const baseWhere = `WHERE w.user_id = ? ${typeFilter}`;

  const [countRow] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM watchlist w ${baseWhere}`,
    [userId],
  );
  // COUNT(*) always returns a row — non-null assertion is safe.
  const total = countRow!.total;

  const rows = await query<WatchlistRow>(
    `SELECT
       w.id,
       w.priority,
       w.added_at,
       f.tmdb_id       AS film_tmdb_id,
       f.title         AS film_title,
       COALESCE(pf.custom_poster_path, f.poster_path) AS film_poster,
       f.release_date  AS film_release_date,
       f.tmdb_rating   AS film_rating,
       s.tmdb_id       AS series_tmdb_id,
       s.title         AS series_title,
       COALESCE(ps.custom_poster_path, s.poster_path) AS series_poster,
       s.first_air_date AS series_first_air_date,
       s.tmdb_rating   AS series_rating
     FROM watchlist w
     LEFT JOIN films  f ON w.film_id   = f.id
     LEFT JOIN series s ON w.series_id = s.id
     LEFT JOIN user_title_display_prefs pf
       ON pf.user_id = w.user_id AND pf.film_id   = f.id
     LEFT JOIN user_title_display_prefs ps
       ON ps.user_id = w.user_id AND ps.series_id = s.id
     ${baseWhere}
     ORDER BY w.priority DESC, w.added_at DESC
     LIMIT ${clampedLimit} OFFSET ${offset}`,
    [userId],
  );

  return { data: rows, total, page: options.page, limit: clampedLimit };
}

/**
 * Adds a film or series to the authenticated user's watchlist.
 * film_id and series_id in the input are TMDB IDs — resolved to internal IDs.
 * @param userId - The authenticated user's ID.
 * @param data - Validated input from addToWatchlistSchema.
 * @returns The new watchlistId.
 */
export async function addToWatchlist(
  userId: number,
  data: AddToWatchlistInput,
): Promise<{ watchlistId: number }> {
  const hasBoth = data.film_id !== undefined && data.series_id !== undefined;
  const hasNeither = data.film_id === undefined && data.series_id === undefined;
  if (hasBoth || hasNeither) {
    throw new AppError('Provide either film_id or series_id, not both', 400);
  }

  let internalFilmId: number | null = null;
  let internalSeriesId: number | null = null;

  if (data.film_id !== undefined) {
    const [film] = await query<IdRow>(
      `SELECT id FROM films WHERE tmdb_id = ?`,
      [data.film_id],
    );
    if (!film) {
      throw new AppError('Film not found — visit /films/:tmdbId first to cache it', 404);
    }
    internalFilmId = film.id;

    const [existing] = await query<IdRow>(
      `SELECT id FROM watchlist WHERE user_id = ? AND film_id = ?`,
      [userId, internalFilmId],
    );
    if (existing) {
      throw new AppError('Already in watchlist', 409);
    }
  } else {
    // series_id is defined — checked above by XOR logic.
    const [series] = await query<IdRow>(
      `SELECT id FROM series WHERE tmdb_id = ?`,
      [data.series_id!],
    );
    if (!series) {
      throw new AppError('Series not found — visit /series/:tmdbId first to cache it', 404);
    }
    internalSeriesId = series.id;

    const [existing] = await query<IdRow>(
      `SELECT id FROM watchlist WHERE user_id = ? AND series_id = ?`,
      [userId, internalSeriesId],
    );
    if (existing) {
      throw new AppError('Already in watchlist', 409);
    }
  }

  try {
    const result = await execute(
      `INSERT INTO watchlist (user_id, film_id, series_id, priority) VALUES (?, ?, ?, ?)`,
      [userId, internalFilmId, internalSeriesId, data.priority],
    );
    return { watchlistId: result.insertId };
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      throw new AppError('Already in watchlist', 409);
    }
    throw err;
  }
}

/**
 * Removes an entry from the authenticated user's watchlist.
 * @param watchlistId - The watchlist entry's primary key.
 * @param userId - The authenticated user's ID.
 */
export async function deleteFromWatchlist(
  watchlistId: number,
  userId: number,
): Promise<void> {
  const [entry] = await query<WatchlistOwnerRow>(
    `SELECT id, user_id FROM watchlist WHERE id = ?`,
    [watchlistId],
  );
  if (!entry) {
    throw new AppError('Watchlist entry not found', 404);
  }
  if (entry.user_id !== userId) {
    throw new AppError('Forbidden', 403);
  }

  await execute(`DELETE FROM watchlist WHERE id = ?`, [watchlistId]);
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
