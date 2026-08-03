import { query, execute } from '../config/db';
import { AppError } from '../utils/app-error';
import {
  ensureSeasonEpisodesCached,
  resolveEpisodeId,
  resolveLocalSeriesId,
} from './season-cache.service';
import type {
  CreateEpisodeRatingInput,
  UpdateEpisodeRatingInput,
} from '../validators/episode-rating.validators';

/**
 * Whose ratings a read should reflect: the authenticated user's own values, or
 * the app-wide average across every user.
 */
export type RatingSource = 'user' | 'app';

/** One season's row in the seasons carousel. */
export interface SeasonSummary {
  season_number: number;
  name: string | null;
  poster_path: string | null;
  episode_count: number;
  watched_count: number;
  avg_rating: number | null;
}

/**
 * Where the user is up to in a series: the episode immediately after the
 * furthest one they have logged — i.e. the one to watch next, not the one they
 * just finished.
 */
export interface CurrentEpisodePointer {
  season_number: number;
  episode_number: number;
  still_path: string | null;
}

/** A single populated cell of the episode ratings grid. */
export interface EpisodeRatingCell {
  season_number: number;
  episode_number: number;
  value: number;
}

/** One episode row in an expanded season's list. */
export interface EpisodeListRow {
  id: number;
  episode_number: number;
  name: string | null;
  overview: string | null;
  still_path: string | null;
  air_date: string | null;
  runtime_min: number | null;
  value: number | null;
  is_logged: boolean;
}

/** Raw shape returned by the episode list query before boolean coercion. */
interface EpisodeListDbRow extends Omit<EpisodeListRow, 'is_logged' | 'value'> {
  value: string | number | null;
  is_logged: number;
}

/**
 * MySQL returns DECIMAL columns and AVG() as strings via mysql2. Coerce to a
 * number so the JSON payload carries real numbers rather than quoted strings.
 */
function toNumber(value: string | number | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Season-level summaries for the carousel, including how many episodes the
 * authenticated user has logged and the average rating for the season under
 * the requested `source`.
 *
 * @param localSeriesId - The internal `series.id`.
 * @param source - Whose ratings to average.
 * @param userId - The authenticated user, required when `source` is 'user'.
 * @returns One summary per numbered season, ascending.
 */
export async function getSeasonSummaries(
  localSeriesId: number,
  source: RatingSource,
  userId: number | null,
): Promise<SeasonSummary[]> {
  // watched_count is always the *user's* progress — an app-wide "watched
  // count" would be meaningless on a personal progress bar — while avg_rating
  // follows `source`. Both are aggregated in one pass per series rather than
  // one query per season.
  const rows = await query<{
    season_number: number;
    name: string | null;
    poster_path: string | null;
    episode_count: number | null;
    watched_count: number;
    avg_rating: string | number | null;
  }>(
    `SELECT s.season_number,
            s.name,
            s.poster_path,
            s.episode_count,
            COALESCE(w.watched_count, 0) AS watched_count,
            a.avg_rating
       FROM seasons s
       LEFT JOIN (
         SELECT e.season_number, COUNT(*) AS watched_count
           FROM episode_ratings er
           JOIN episodes e ON er.episode_id = e.id
          WHERE e.series_id = ? AND er.user_id = ?
          GROUP BY e.season_number
       ) w ON w.season_number = s.season_number
       LEFT JOIN (
         SELECT e.season_number, AVG(er.value) AS avg_rating
           FROM episode_ratings er
           JOIN episodes e ON er.episode_id = e.id
          WHERE e.series_id = ? AND er.value IS NOT NULL
            AND (? = 'app' OR er.user_id = ?)
          GROUP BY e.season_number
       ) a ON a.season_number = s.season_number
      WHERE s.series_id = ?
      ORDER BY s.season_number ASC`,
    [
      localSeriesId,
      userId ?? 0,
      localSeriesId,
      source,
      userId ?? 0,
      localSeriesId,
    ],
  );

  return rows.map((row) => ({
    season_number: row.season_number,
    name: row.name,
    poster_path: row.poster_path,
    episode_count: row.episode_count ?? 0,
    watched_count: Number(row.watched_count),
    avg_rating: toNumber(row.avg_rating),
  }));
}

/**
 * Sparse data for the episode ratings grid: only cells that actually carry a
 * value. The client derives the grid's dimensions from the season summaries and
 * renders everything absent from this list as an empty cell.
 *
 * @returns The populated cells plus, for 'user' reads, the watch-progress pointer.
 */
export async function getEpisodeRatingsGrid(
  localSeriesId: number,
  source: RatingSource,
  userId: number | null,
): Promise<{
  cells: EpisodeRatingCell[];
  currentEpisode: CurrentEpisodePointer | null;
}> {
  const rows = await query<{
    season_number: number;
    episode_number: number;
    value: string | number;
  }>(
    `SELECT e.season_number, e.episode_number, AVG(er.value) AS value
       FROM episode_ratings er
       JOIN episodes e ON er.episode_id = e.id
      WHERE e.series_id = ?
        AND er.value IS NOT NULL
        AND (? = 'app' OR er.user_id = ?)
      GROUP BY e.season_number, e.episode_number`,
    [localSeriesId, source, userId ?? 0],
  );

  const cells: EpisodeRatingCell[] = [];
  for (const row of rows) {
    const value = toNumber(row.value);
    if (value === null) continue;
    cells.push({
      season_number: row.season_number,
      episode_number: row.episode_number,
      value,
    });
  }

  // The pointer is personal progress, so it only exists for a signed-in user
  // reading their own ratings. Watched-only logs count towards it too, not just
  // rated ones.
  //
  // It marks the episode *after* the furthest logged one — what to watch next.
  // The row comparison finds the first episode ordered past that point; if the
  // user has logged nothing the subquery is empty, the comparison is NULL, and
  // no pointer is returned. Likewise once they finish the last cached episode.
  let currentEpisode: CurrentEpisodePointer | null = null;
  if (source === 'user' && userId !== null) {
    const [pointer] = await query<CurrentEpisodePointer>(
      `SELECT e.season_number, e.episode_number, e.still_path
         FROM episodes e
        WHERE e.series_id = ?
          AND (e.season_number, e.episode_number) > (
                SELECT furthest.season_number, furthest.episode_number
                  FROM episode_ratings er
                  JOIN episodes furthest ON er.episode_id = furthest.id
                 WHERE furthest.series_id = ? AND er.user_id = ?
                 ORDER BY furthest.season_number DESC,
                          furthest.episode_number DESC
                 LIMIT 1
              )
        ORDER BY e.season_number ASC, e.episode_number ASC
        LIMIT 1`,
      [localSeriesId, localSeriesId, userId],
    );
    currentEpisode = pointer ?? null;
  }

  return { cells, currentEpisode };
}

/**
 * Every episode of one season, with its rating under the requested `source` and
 * whether the authenticated user has logged it. Caches the season's episodes
 * first if they are missing or stale.
 */
export async function getSeasonEpisodeList(
  localSeriesId: number,
  tmdbSeriesId: number,
  seasonNumber: number,
  source: RatingSource,
  userId: number | null,
): Promise<EpisodeListRow[]> {
  await ensureSeasonEpisodesCached(localSeriesId, tmdbSeriesId, seasonNumber);

  const rows = await query<EpisodeListDbRow>(
    `SELECT e.id,
            e.episode_number,
            e.name,
            e.overview,
            e.still_path,
            e.air_date,
            e.runtime_min,
            (SELECT AVG(er.value) FROM episode_ratings er
              WHERE er.episode_id = e.id
                AND er.value IS NOT NULL
                AND (? = 'app' OR er.user_id = ?)) AS value,
            EXISTS(SELECT 1 FROM episode_ratings er2
                    WHERE er2.episode_id = e.id AND er2.user_id = ?) AS is_logged
       FROM episodes e
      WHERE e.series_id = ? AND e.season_number = ?
      ORDER BY e.episode_number ASC`,
    [source, userId ?? 0, userId ?? 0, localSeriesId, seasonNumber],
  );

  return rows.map((row) => ({
    id: row.id,
    episode_number: row.episode_number,
    name: row.name,
    overview: row.overview,
    still_path: row.still_path,
    air_date: row.air_date,
    runtime_min: row.runtime_min,
    value: toNumber(row.value),
    is_logged: Number(row.is_logged) === 1,
  }));
}

/**
 * Marks every not-yet-logged episode of a season as watched, without a rating.
 * Existing logs are left untouched so a bulk action never overwrites a rating
 * the user entered by hand.
 *
 * @returns How many episodes this call newly logged.
 */
export async function logEntireSeason(
  localSeriesId: number,
  tmdbSeriesId: number,
  seasonNumber: number,
  userId: number,
): Promise<{ loggedCount: number }> {
  await ensureSeasonEpisodesCached(localSeriesId, tmdbSeriesId, seasonNumber);

  // One INSERT ... SELECT rather than a row-per-episode loop: the unique key on
  // (user_id, episode_id) makes INSERT IGNORE skip anything already logged.
  const result = await execute(
    `INSERT IGNORE INTO episode_ratings (user_id, episode_id, value, watched_on)
     SELECT ?, e.id, NULL, CURDATE()
       FROM episodes e
      WHERE e.series_id = ? AND e.season_number = ?`,
    [userId, localSeriesId, seasonNumber],
  );

  return { loggedCount: result.affectedRows };
}

/**
 * Creates or updates the authenticated user's log for a single episode, plus an
 * optional written review.
 *
 * A user has at most one log per episode (`UNIQUE(user_id, episode_id)`), so
 * this upserts rather than erroring on a repeat log.
 *
 * @throws If a review is supplied without a rating value.
 */
export async function createEpisodeRating(
  userId: number,
  data: CreateEpisodeRatingInput,
): Promise<{ episodeRatingId: number; episodeReviewId: number | null }> {
  if (data.review && data.value === null) {
    throw new AppError('A review requires a rating value', 400);
  }

  const localSeriesId = await resolveLocalSeriesId(data.tmdb_series_id);
  const episodeId = await resolveEpisodeId(
    localSeriesId,
    data.tmdb_series_id,
    data.season_number,
    data.episode_number,
  );

  await execute(
    `INSERT INTO episode_ratings (user_id, episode_id, value, watched_on, is_rewatch)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       value      = VALUES(value),
       watched_on = VALUES(watched_on),
       is_rewatch = VALUES(is_rewatch)`,
    [
      userId,
      episodeId,
      data.value,
      data.watched_on ?? null,
      data.is_rewatch ?? false,
    ],
  );

  const [row] = await query<{ id: number }>(
    `SELECT id FROM episode_ratings WHERE user_id = ? AND episode_id = ? LIMIT 1`,
    [userId, episodeId],
  );
  if (!row) {
    throw new AppError('Episode rating write failed unexpectedly', 500);
  }
  const episodeRatingId = row.id;

  const episodeReviewId = data.review
    ? await upsertEpisodeReview(
        episodeRatingId,
        userId,
        data.review.body,
        data.review.contains_spoilers,
        data.review.backdrop_paths,
      )
    : null;

  return { episodeRatingId, episodeReviewId };
}

/**
 * Updates an existing episode log. Every field is optional; omitted fields keep
 * their current value.
 *
 * @throws If the log does not exist or belongs to another user.
 */
export async function updateEpisodeRating(
  episodeRatingId: number,
  userId: number,
  data: UpdateEpisodeRatingInput,
): Promise<{ episodeRatingId: number; episodeReviewId: number | null }> {
  await assertOwnsEpisodeRating(episodeRatingId, userId);

  const setClauses: string[] = [];
  const params: (string | number | boolean | null)[] = [];

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
    params.push(episodeRatingId);
    await execute(
      `UPDATE episode_ratings SET ${setClauses.join(', ')} WHERE id = ?`,
      params,
    );
  }

  let episodeReviewId: number | null = null;
  if (data.review !== undefined) {
    if (data.review === null) {
      await execute(`DELETE FROM episode_reviews WHERE episode_rating_id = ?`, [
        episodeRatingId,
      ]);
    } else {
      episodeReviewId = await upsertEpisodeReview(
        episodeRatingId,
        userId,
        data.review.body,
        data.review.contains_spoilers,
        data.review.backdrop_paths,
      );
    }
  }

  return { episodeRatingId, episodeReviewId };
}

/**
 * Deletes an episode log. The linked review is removed by the foreign key's
 * ON DELETE CASCADE.
 *
 * @throws If the log does not exist or belongs to another user.
 */
export async function deleteEpisodeRating(
  episodeRatingId: number,
  userId: number,
): Promise<void> {
  await assertOwnsEpisodeRating(episodeRatingId, userId);
  await execute(`DELETE FROM episode_ratings WHERE id = ?`, [episodeRatingId]);
}

/**
 * Inserts or replaces the review attached to an episode log, along with any
 * TMDB images attached to it.
 *
 * @param backdropPaths - TMDB paths to attach, replacing whatever was there.
 */
async function upsertEpisodeReview(
  episodeRatingId: number,
  userId: number,
  body: string,
  containsSpoilers: boolean,
  backdropPaths: string[] = [],
): Promise<number> {
  await execute(
    `INSERT INTO episode_reviews (episode_rating_id, user_id, body, contains_spoilers)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       body              = VALUES(body),
       contains_spoilers = VALUES(contains_spoilers)`,
    [episodeRatingId, userId, body, containsSpoilers],
  );

  const [review] = await query<{ id: number }>(
    `SELECT id FROM episode_reviews WHERE episode_rating_id = ? LIMIT 1`,
    [episodeRatingId],
  );
  if (!review) {
    throw new AppError('Episode review write failed unexpectedly', 500);
  }

  // Replaced wholesale rather than merged: this is an upsert, so the paths sent
  // are the complete intended set and re-saving must not stack duplicates.
  await execute(`DELETE FROM review_media WHERE episode_review_id = ?`, [
    review.id,
  ]);

  for (let position = 0; position < backdropPaths.length; position++) {
    const path = backdropPaths[position];
    if (path === undefined) continue;
    await execute(
      `INSERT INTO review_media
         (episode_review_id, media_type, source, source_id, url, preview_url, position)
       VALUES (?, 'image', 'tmdb', ?, ?, ?, ?)`,
      [
        review.id,
        path,
        `https://image.tmdb.org/t/p/w1280${path}`,
        `https://image.tmdb.org/t/p/w780${path}`,
        position,
      ],
    );
  }

  return review.id;
}

/** Throws unless the given episode log exists and belongs to the user. */
async function assertOwnsEpisodeRating(
  episodeRatingId: number,
  userId: number,
): Promise<void> {
  const [row] = await query<{ user_id: number }>(
    `SELECT user_id FROM episode_ratings WHERE id = ? LIMIT 1`,
    [episodeRatingId],
  );
  if (!row) {
    throw new AppError('Episode rating not found', 404);
  }
  if (row.user_id !== userId) {
    throw new AppError('Forbidden', 403);
  }
}
