import { query, queryMany, execute } from '../config/db';
import * as tmdbService from './tmdb.service';
import { AppError } from '../utils/app-error';
import type { Series } from '../models/series.model';
import type { TmdbSeries, TmdbImage } from '../types/tmdb.types';

/** A Series row enriched with its genre list. Genre IDs are TMDB genre IDs. */
export interface SeriesWithGenres extends Series {
  genres: Array<{ id: number; name: string }>;
}

/** Categorised image assets returned by getSeriesImages. */
export interface SeriesImagesResponse {
  /** Backdrops with an English title baked in (iso_639_1 = 'en'). */
  titledBackdrops: TmdbImage[];
  /** Language-neutral clean backdrops (iso_639_1 = null). */
  cleanBackdrops: TmdbImage[];
  posters: TmdbImage[];
  logos: TmdbImage[];
}

/** Credits response normalised to a consistent shape for both DB and TMDB sources. */
export interface SeriesCreditsResponse {
  directors: Array<{
    person_tmdb_id: number;
    person_name: string;
    profile_path: string | null;
    popularity: number | null;
  }>;
  cast: Array<{
    person_tmdb_id: number;
    person_name: string;
    character_name: string | null;
    cast_order: number | null;
    profile_path: string | null;
    popularity: number | null;
  }>;
  /**
   * Full crew across every season, plus a synthesised entry per show creator
   * (job === 'Creator', sourced from /tv/{id}.created_by). Sorted with
   * Creator first, then by department importance and TMDB popularity.
   */
  crew: Array<{
    person_tmdb_id: number;
    person_name: string;
    job: string;
    department: string;
    profile_path: string | null;
    popularity: number | null;
  }>;
}

/**
 * Upserts a single TmdbSeries into the local series table.
 * Uses COALESCE to preserve an already-cached episode_runtime when the incoming
 * episode_run_time array is empty (list endpoints often omit it).
 * @param series - The TMDB series object to cache.
 */
export async function upsertSeries(series: TmdbSeries): Promise<void> {
  const episodeRuntime = series.episode_run_time?.[0] ?? null;
  await execute(
    `INSERT INTO series
       (tmdb_id, title, original_title, overview, poster_path, backdrop_path,
        first_air_date, original_language, tmdb_rating, tmdb_popularity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title             = VALUES(title),
       original_title    = VALUES(original_title),
       overview          = VALUES(overview),
       poster_path       = VALUES(poster_path),
       backdrop_path     = VALUES(backdrop_path),
       first_air_date    = VALUES(first_air_date),
       original_language = VALUES(original_language),
       tmdb_rating       = VALUES(tmdb_rating),
       tmdb_popularity   = VALUES(tmdb_popularity),
       episode_runtime   = COALESCE(?, episode_runtime),
       cached_at         = NOW()`,
    [
      series.id,
      series.name,
      series.original_name ?? null,
      series.overview ?? null,
      series.poster_path ?? null,
      series.backdrop_path ?? null,
      series.first_air_date || null,
      series.original_language ?? null,
      series.vote_average ?? null,
      series.popularity ?? null,
      episodeRuntime,
    ],
  );
}

/**
 * Loads the genres for a locally cached series, returning them with TMDB genre IDs.
 * @param seriesId - The local DB series ID.
 * @returns An array of { id (tmdb_genre_id), name } objects.
 */
async function loadGenresForSeries(
  seriesId: number,
): Promise<Array<{ id: number; name: string }>> {
  const rows = await query<{ id: number | null; name: string }>(
    `SELECT g.tmdb_genre_id AS id, g.name
     FROM genres g
     JOIN series_genres sg ON sg.genre_id = g.id
     WHERE sg.series_id = ? AND g.tmdb_genre_id IS NOT NULL`,
    [seriesId],
  );
  // Non-null assertion is safe: WHERE clause filters out NULL tmdb_genre_id rows.
  return rows.map((r) => ({ id: r.id!, name: r.name }));
}

/**
 * Fetches the trending TV series for the current week, upserts them into the
 * local series cache, and returns the TMDB response directly.
 * @returns An array of TmdbSeries objects.
 */
export async function getTrendingSeries(
  userId: number | null = null,
): Promise<TmdbSeries[]> {
  const series = await tmdbService.getTrendingSeries();
  for (const s of series) {
    await upsertSeries(s);
  }
  return applySeriesDisplayPrefs(series, userId);
}

/**
 * Fetches TV series currently on the air, upserts them into the local series
 * cache, and returns the TMDB response directly.
 * @returns An array of TmdbSeries objects.
 */
export async function getNewSeries(
  userId: number | null = null,
): Promise<TmdbSeries[]> {
  const series = await tmdbService.getNewSeries();
  for (const s of series) {
    await upsertSeries(s);
  }
  return applySeriesDisplayPrefs(series, userId);
}

/**
 * Searches TMDB for TV series matching the query, upserts results into the
 * local series cache, and returns the TMDB response directly.
 * @param searchQuery - The user-provided search term.
 * @returns An array of TmdbSeries objects.
 */
export async function searchSeries(
  searchQuery: string,
  userId: number | null = null,
): Promise<TmdbSeries[]> {
  const series = await tmdbService.searchSeries(searchQuery);
  for (const s of series) {
    await upsertSeries(s);
  }
  return applySeriesDisplayPrefs(series, userId);
}

/**
 * Overlays the authenticated user's saved custom poster / backdrop overrides
 * onto a list of TmdbSeries results, keyed by TMDB id. No-ops when userId is
 * null or the list is empty.
 * @param items - The TMDB series to enrich.
 * @param userId - Authenticated user ID, or null.
 * @returns A new array of series with poster_path / backdrop_path overridden
 *          where the user has saved a custom selection.
 */
export async function applySeriesDisplayPrefs<T extends TmdbSeries>(
  items: T[],
  userId: number | null,
): Promise<T[]> {
  if (userId === null || items.length === 0) return items;
  const tmdbIds = items.map((s) => s.id);
  const rows = await queryMany<{
    tmdb_id: number;
    custom_poster_path: string | null;
    custom_backdrop_path: string | null;
  }>(
    `SELECT s.tmdb_id, p.custom_poster_path, p.custom_backdrop_path
     FROM user_title_display_prefs p
     JOIN series s ON s.id = p.series_id
     WHERE p.user_id = ? AND s.tmdb_id IN (?)`,
    [userId, tmdbIds],
  );
  if (rows.length === 0) return items;
  const map = new Map(rows.map((r) => [r.tmdb_id, r]));
  return items.map((s) => {
    const override = map.get(s.id);
    if (!override) return s;
    return {
      ...s,
      poster_path: override.custom_poster_path ?? s.poster_path,
      backdrop_path: override.custom_backdrop_path ?? s.backdrop_path,
    };
  });
}

/**
 * Returns full details for a series. Serves from the local cache when fresh
 * (< 7 days old); otherwise fetches from TMDB, upserts the series, genres, and
 * credits into the local DB, then returns the enriched result.
 * @param tmdbId - The TMDB series ID.
 * @returns A SeriesWithGenres object.
 */
export async function getSeriesById(tmdbId: number): Promise<SeriesWithGenres> {
  const [cached] = await query<Series>(
    `SELECT id, tmdb_id, title, original_title, overview, poster_path,
            backdrop_path, first_air_date, last_air_date, seasons_count,
            episodes_count, episode_runtime, status, original_language,
            tmdb_rating, tmdb_popularity, cached_at
     FROM series
     WHERE tmdb_id = ?
       AND cached_at > NOW() - INTERVAL 7 DAY
       AND seasons_count IS NOT NULL`,
    [tmdbId],
  );

  if (cached) {
    const genres = await loadGenresForSeries(cached.id);
    return { ...cached, genres };
  }

  // Stale or missing — fetch full detail + credits from TMDB in parallel.
  const [detail, credits] = await Promise.all([
    tmdbService.getSeriesById(tmdbId),
    tmdbService.getSeriesCredits(tmdbId),
  ]);

  // Upsert the series row with all detail fields.
  const episodeRuntime = detail.episode_run_time?.[0] ?? null;
  await execute(
    `INSERT INTO series
       (tmdb_id, title, original_title, overview, poster_path, backdrop_path,
        first_air_date, last_air_date, seasons_count, episodes_count,
        episode_runtime, status, original_language, tmdb_rating, tmdb_popularity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title             = VALUES(title),
       original_title    = VALUES(original_title),
       overview          = VALUES(overview),
       poster_path       = VALUES(poster_path),
       backdrop_path     = VALUES(backdrop_path),
       first_air_date    = VALUES(first_air_date),
       last_air_date     = VALUES(last_air_date),
       seasons_count     = VALUES(seasons_count),
       episodes_count    = VALUES(episodes_count),
       episode_runtime   = VALUES(episode_runtime),
       status            = VALUES(status),
       original_language = VALUES(original_language),
       tmdb_rating       = VALUES(tmdb_rating),
       tmdb_popularity   = VALUES(tmdb_popularity),
       cached_at         = NOW()`,
    [
      detail.id,
      detail.name,
      detail.original_name ?? null,
      detail.overview ?? null,
      detail.poster_path ?? null,
      detail.backdrop_path ?? null,
      detail.first_air_date || null,
      detail.last_air_date ?? null,
      detail.number_of_seasons ?? null,
      detail.number_of_episodes ?? null,
      episodeRuntime,
      detail.status ?? null,
      detail.original_language ?? null,
      detail.vote_average ?? null,
      detail.popularity ?? null,
    ],
  );

  const [inserted] = await query<{ id: number }>(
    `SELECT id FROM series WHERE tmdb_id = ?`,
    [tmdbId],
  );
  if (!inserted) {
    throw new AppError('Series cache write failed unexpectedly', 500);
  }
  const seriesId = inserted.id;

  // Upsert genres, then (re-)link series_genres.
  for (const genre of detail.genres) {
    await execute(
      `INSERT INTO genres (name, tmdb_genre_id) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [genre.name, genre.id],
    );
  }

  await execute(`DELETE FROM series_genres WHERE series_id = ?`, [seriesId]);

  for (const genre of detail.genres) {
    const [genreRow] = await query<{ id: number }>(
      `SELECT id FROM genres WHERE tmdb_genre_id = ?`,
      [genre.id],
    );
    if (genreRow) {
      await execute(
        `INSERT IGNORE INTO series_genres (series_id, genre_id) VALUES (?, ?)`,
        [seriesId, genreRow.id],
      );
    }
  }

  // Cache credits: all directors and full cast.
  await execute(`DELETE FROM series_credits WHERE series_id = ?`, [seriesId]);

  const directors = credits.crew.filter((m) => m.job === 'Director');
  const cast = credits.cast;

  for (const director of directors) {
    await execute(
      `INSERT INTO series_credits
         (series_id, person_tmdb_id, person_name, role, profile_path, popularity)
       VALUES (?, ?, ?, 'director', ?, ?)`,
      [seriesId, director.id, director.name, director.profile_path ?? null, director.popularity ?? null],
    );
  }

  for (const actor of cast) {
    await execute(
      `INSERT INTO series_credits
         (series_id, person_tmdb_id, person_name, role, character_name,
          profile_path, popularity, cast_order)
       VALUES (?, ?, ?, 'actor', ?, ?, ?, ?)`,
      [
        seriesId,
        actor.id,
        actor.name,
        actor.character ?? null,
        actor.profile_path ?? null,
        actor.popularity ?? null,
        actor.order ?? null,
      ],
    );
  }

  return {
    id: inserted.id,
    tmdb_id: detail.id,
    title: detail.name,
    original_title: detail.original_name ?? null,
    overview: detail.overview ?? null,
    poster_path: detail.poster_path ?? null,
    backdrop_path: detail.backdrop_path ?? null,
    first_air_date: detail.first_air_date || null,
    last_air_date: detail.last_air_date ?? null,
    seasons_count: detail.number_of_seasons ?? null,
    episodes_count: detail.number_of_episodes ?? null,
    episode_runtime: episodeRuntime,
    status: detail.status ?? null,
    original_language: detail.original_language ?? null,
    tmdb_rating: detail.vote_average ?? null,
    tmdb_popularity: detail.popularity ?? null,
    cached_at: new Date(),
    genres: detail.genres,
  };
}

/**
 * Fetches image assets for a series from TMDB and categorises backdrops by
 * language: titled (iso_639_1 = 'en') and clean (iso_639_1 = null).
 * @param tmdbId - The TMDB series ID.
 * @returns A SeriesImagesResponse with categorised image arrays.
 */
export async function getSeriesImages(tmdbId: number): Promise<SeriesImagesResponse> {
  const images = await tmdbService.getSeriesImages(tmdbId);
  return {
    titledBackdrops: images.backdrops.filter((img) => img.iso_639_1 === 'en'),
    cleanBackdrops: images.backdrops.filter((img) => img.iso_639_1 === null),
    posters: images.posters,
    logos: images.logos,
  };
}

/**
 * Returns credits for a series. Always fetches season-aggregated cast and
 * crew from TMDB's /tv/{id}/aggregate_credits (the regular /credits endpoint
 * returns the most recent season only and is empty for many shows). Also
 * pulls /tv/{id} so the show creators can be surfaced under the Crew tab as
 * synthesised entries with job === 'Creator'.
 *
 * The local series_credits cache is refreshed with the top-billed actors so
 * downstream features (carousels, recommendations) can keep querying it; the
 * cache cannot store arbitrary crew jobs because series_credits.role is an
 * ENUM('director','actor','writer'), so the full crew is always returned
 * straight from TMDB rather than persisted.
 *
 * @param tmdbId - The TMDB series ID.
 * @returns A SeriesCreditsResponse with directors, cast, and full crew arrays.
 */
export async function getSeriesCredits(tmdbId: number): Promise<SeriesCreditsResponse> {
  const [series] = await query<{ id: number }>(
    `SELECT id FROM series WHERE tmdb_id = ?`,
    [tmdbId],
  );

  const [credits, detail] = await Promise.all([
    tmdbService.getSeriesAggregateCredits(tmdbId),
    tmdbService.getSeriesById(tmdbId),
  ]);

  // Flatten aggregate crew: TMDB reports one entry per person with a `jobs`
  // array; we expand into one row per (person, job) so the UI can show, say,
  // both "Writer" and "Executive Producer" for the same person.
  const flatCrew = credits.crew.flatMap((member) =>
    member.jobs.map((j) => ({
      id: member.id,
      name: member.name,
      profile_path: member.profile_path,
      department: member.department,
      popularity: member.popularity,
      job: j.job,
      episode_count: j.episode_count,
    })),
  );

  // Synthesise a Creator entry per show creator. created_by is the canonical
  // source for "Created by" on TMDB and is missing from the credits endpoints.
  const creators = (detail.created_by ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    profile_path: c.profile_path,
    department: 'Creators',
    popularity: null as number | null,
    job: 'Creator',
    episode_count: 0,
  }));

  // Deduplicate: if a creator also appears in flatCrew under a real job, keep
  // both rows so the UI shows "Creator" plus their other credits.
  const allCrew = [...creators, ...flatCrew];

  // Department priority places Creators/Directors first so the Crew tab leads
  // with the most prominent collaborators.
  const departmentRank: Record<string, number> = {
    Creators: 0,
    Directing: 1,
    Writing: 2,
    Production: 3,
    Editing: 4,
    Camera: 5,
    Sound: 6,
    Art: 7,
    'Visual Effects': 8,
    'Costume & Make-Up': 9,
    Lighting: 10,
    Crew: 11,
    Actors: 99,
  };
  const sortedCrew = allCrew.sort((a, b) => {
    const ra = departmentRank[a.department] ?? 50;
    const rb = departmentRank[b.department] ?? 50;
    if (ra !== rb) return ra - rb;
    return (b.popularity ?? 0) - (a.popularity ?? 0);
  });

  // Pick the most appearances-per-character as the displayed character name.
  const cast = credits.cast.map((member) => {
    const primaryRole = member.roles.slice().sort(
      (a, b) => b.episode_count - a.episode_count,
    )[0];
    return {
      id: member.id,
      name: member.name,
      profile_path: member.profile_path,
      character: primaryRole?.character ?? null,
      order: member.order,
      popularity: member.popularity,
    };
  });

  const directorsTmdb = flatCrew.filter((m) => m.job === 'Director');

  if (series) {
    // Refresh director/actor cache rows so other features (carousels,
    // recommendations) still return populated lists.
    await execute(`DELETE FROM series_credits WHERE series_id = ?`, [series.id]);

    for (const director of directorsTmdb) {
      await execute(
        `INSERT INTO series_credits
           (series_id, person_tmdb_id, person_name, role, profile_path, popularity)
         VALUES (?, ?, ?, 'director', ?, ?)`,
        [series.id, director.id, director.name, director.profile_path ?? null, director.popularity ?? null],
      );
    }

    for (const actor of cast) {
      await execute(
        `INSERT INTO series_credits
           (series_id, person_tmdb_id, person_name, role, character_name,
            profile_path, popularity, cast_order)
         VALUES (?, ?, ?, 'actor', ?, ?, ?, ?)`,
        [
          series.id,
          actor.id,
          actor.name,
          actor.character ?? null,
          actor.profile_path ?? null,
          actor.popularity ?? null,
          actor.order ?? null,
        ],
      );
    }
  }

  return {
    directors: directorsTmdb.map((m) => ({
      person_tmdb_id: m.id,
      person_name: m.name,
      profile_path: m.profile_path ?? null,
      popularity: m.popularity ?? null,
    })),
    cast: cast.map((m) => ({
      person_tmdb_id: m.id,
      person_name: m.name,
      character_name: m.character ?? null,
      cast_order: m.order ?? null,
      profile_path: m.profile_path ?? null,
      popularity: m.popularity ?? null,
    })),
    crew: sortedCrew.map((m) => ({
      person_tmdb_id: m.id,
      person_name: m.name,
      job: m.job,
      department: m.department,
      profile_path: m.profile_path ?? null,
      popularity: m.popularity ?? null,
    })),
  };
}

// ─── Detail enrichment ───────────────────────────────────────────────────────

/** Per-user enrichment fields layered on top of the base series cache. */
export interface SeriesUserContext {
  is_logged: boolean;
  is_in_watchlist: boolean;
  /** ID of the watchlist row when is_in_watchlist is true, else null. */
  watchlist_id: number | null;
  is_liked: boolean;
  user_rating: number | null;
  user_log_count: number;
}

/** Custom display paths the authenticated user has saved for this title. */
export interface SeriesDisplayPrefs {
  custom_poster_path: string | null;
  custom_backdrop_path: string | null;
}

/** Full series detail returned by GET /series/:tmdbId. */
export interface SeriesDetailResponse extends SeriesWithGenres {
  custom_poster_path: string | null;
  custom_backdrop_path: string | null;
  is_logged: boolean;
  is_in_watchlist: boolean;
  /** ID of the watchlist row when is_in_watchlist is true, else null. */
  watchlist_id: number | null;
  is_liked: boolean;
  user_rating: number | null;
  user_log_count: number;
}

async function loadSeriesUserContext(
  seriesId: number,
  userId: number | null,
): Promise<SeriesUserContext> {
  if (userId === null) {
    return {
      is_logged: false,
      is_in_watchlist: false,
      watchlist_id: null,
      is_liked: false,
      user_rating: null,
      user_log_count: 0,
    };
  }

  const [ratingAgg] = await query<{
    log_count: number;
    latest_value: number | null;
  }>(
    `SELECT COUNT(*) AS log_count,
            (SELECT value FROM ratings
             WHERE user_id = ? AND series_id = ?
             ORDER BY created_at DESC LIMIT 1) AS latest_value
     FROM ratings
     WHERE user_id = ? AND series_id = ?`,
    [userId, seriesId, userId, seriesId],
  );

  const [watchlistRow] = await query<{ watchlist_id: number }>(
    `SELECT w.id AS watchlist_id
     FROM watchlist w
     WHERE w.user_id = ? AND w.series_id = ?
     LIMIT 1`,
    [userId, seriesId],
  );

  const [likeRow] = await query<{ id: number }>(
    `SELECT id FROM title_likes WHERE user_id = ? AND series_id = ? LIMIT 1`,
    [userId, seriesId],
  );

  const logCount = Number(ratingAgg?.log_count ?? 0);
  const latestValue =
    ratingAgg?.latest_value !== null && ratingAgg?.latest_value !== undefined
      ? Number(ratingAgg.latest_value)
      : null;

  return {
    is_logged: logCount > 0,
    is_in_watchlist: Boolean(watchlistRow),
    watchlist_id: watchlistRow?.watchlist_id ?? null,
    is_liked: Boolean(likeRow),
    user_rating: latestValue,
    user_log_count: logCount,
  };
}

async function loadSeriesDisplayPrefs(
  seriesId: number,
  userId: number | null,
): Promise<SeriesDisplayPrefs> {
  if (userId === null) {
    return { custom_poster_path: null, custom_backdrop_path: null };
  }
  const [row] = await query<SeriesDisplayPrefs>(
    `SELECT custom_poster_path, custom_backdrop_path
     FROM user_title_display_prefs
     WHERE user_id = ? AND series_id = ?
     LIMIT 1`,
    [userId, seriesId],
  );
  return {
    custom_poster_path: row?.custom_poster_path ?? null,
    custom_backdrop_path: row?.custom_backdrop_path ?? null,
  };
}

/**
 * Returns full series detail enriched with per-user context and display prefs.
 */
export async function getSeriesDetail(
  tmdbId: number,
  userId: number | null,
): Promise<SeriesDetailResponse> {
  const base = await getSeriesById(tmdbId);
  const [userCtx, displayPrefs] = await Promise.all([
    loadSeriesUserContext(base.id, userId),
    loadSeriesDisplayPrefs(base.id, userId),
  ]);
  return {
    ...base,
    custom_poster_path: displayPrefs.custom_poster_path,
    custom_backdrop_path: displayPrefs.custom_backdrop_path,
    ...userCtx,
  };
}

// ─── Rating distribution ─────────────────────────────────────────────────────

export interface SeriesDistributionBin {
  value: number;
  count: number;
}

export interface SeriesDistributionResponse {
  distribution: SeriesDistributionBin[];
  average: number | null;
}

export async function getSeriesRatingDistribution(
  tmdbId: number,
): Promise<SeriesDistributionResponse> {
  const [s] = await query<{ id: number }>(
    `SELECT id FROM series WHERE tmdb_id = ?`,
    [tmdbId],
  );
  if (!s) return { distribution: [], average: null };

  const [rows, [avgRow]] = await Promise.all([
    query<{ value: number | string; count: number | string }>(
      `SELECT value, COUNT(*) AS count
       FROM ratings
       WHERE series_id = ? AND is_rewatch = 0
       GROUP BY value
       ORDER BY value ASC`,
      [s.id],
    ),
    query<{ avg: number | string | null }>(
      `SELECT AVG(value) AS avg FROM ratings
       WHERE series_id = ? AND is_rewatch = 0`,
      [s.id],
    ),
  ]);

  return {
    distribution: rows.map((r) => ({
      value: Number(r.value),
      count: Number(r.count),
    })),
    average:
      avgRow?.avg !== null && avgRow?.avg !== undefined
        ? Number(avgRow.avg)
        : null,
  };
}

// ─── Watched by / Want to watch ──────────────────────────────────────────────

export interface SeriesWatchedByRow {
  user_id: number;
  username: string;
  avatar_url: string | null;
  rating: number | null;
  is_rewatch: boolean;
  has_review: boolean;
  review_id: number | null;
}

export interface SeriesWatchlistedByRow {
  user_id: number;
  username: string;
  avatar_url: string | null;
}

const SOCIAL_LIMIT = 20;

export async function getSeriesWatchedBy(
  tmdbId: number,
  userId: number | null,
): Promise<SeriesWatchedByRow[]> {
  const [s] = await query<{ id: number }>(
    `SELECT id FROM series WHERE tmdb_id = ?`,
    [tmdbId],
  );
  if (!s) return [];

  const rows = await query<{
    user_id: number;
    username: string;
    avatar_url: string | null;
    rating: number | string;
    is_rewatch: number;
    has_review: number;
    review_id: number | null;
    is_friend: number;
  }>(
    `SELECT
       u.id AS user_id,
       u.username,
       u.avatar_url,
       r.value AS rating,
       r.is_rewatch,
       (CASE WHEN rv.id IS NOT NULL THEN 1 ELSE 0 END) AS has_review,
       rv.id AS review_id,
       (CASE WHEN ? IS NOT NULL AND f.follower_id IS NOT NULL THEN 1 ELSE 0 END) AS is_friend
     FROM (
       SELECT r2.*,
              ROW_NUMBER() OVER (
                PARTITION BY r2.user_id
                ORDER BY r2.watched_on DESC, r2.created_at DESC, r2.id DESC
              ) AS rn
         FROM ratings r2
        WHERE r2.series_id = ?
     ) r
     JOIN users u ON u.id = r.user_id
     LEFT JOIN reviews rv ON rv.rating_id = r.id
     LEFT JOIN follows f ON f.follower_id = ? AND f.following_id = u.id
     WHERE r.rn = 1
       AND (? IS NULL OR u.id != ?)
     ORDER BY is_friend DESC, r.created_at DESC, r.id DESC
     LIMIT ${SOCIAL_LIMIT}`,
    [userId, s.id, userId, userId, userId],
  );

  return rows.map((r) => ({
    user_id: r.user_id,
    username: r.username,
    avatar_url: r.avatar_url,
    rating: Number(r.rating),
    is_rewatch: Boolean(r.is_rewatch),
    has_review: Boolean(r.has_review),
    review_id: r.review_id,
  }));
}

export async function getSeriesWatchlistedBy(
  tmdbId: number,
  userId: number | null,
): Promise<SeriesWatchlistedByRow[]> {
  const [s] = await query<{ id: number }>(
    `SELECT id FROM series WHERE tmdb_id = ?`,
    [tmdbId],
  );
  if (!s) return [];

  const rows = await query<{
    user_id: number;
    username: string;
    avatar_url: string | null;
    is_friend: number;
  }>(
    `SELECT
       u.id AS user_id,
       u.username,
       u.avatar_url,
       (CASE WHEN ? IS NOT NULL AND f.follower_id IS NOT NULL THEN 1 ELSE 0 END) AS is_friend
     FROM watchlist w
     JOIN users u ON u.id = w.user_id
     LEFT JOIN follows f ON f.follower_id = ? AND f.following_id = u.id
     WHERE w.series_id = ?
       AND (? IS NULL OR u.id != ?)
     ORDER BY is_friend DESC, w.added_at DESC
     LIMIT ${SOCIAL_LIMIT}`,
    [userId, userId, s.id, userId, userId],
  );

  return rows.map((r) => ({
    user_id: r.user_id,
    username: r.username,
    avatar_url: r.avatar_url,
  }));
}

// ─── My logs ─────────────────────────────────────────────────────────────────

export interface SeriesMyLogRow {
  id: number;
  value: number;
  watched_on: string | null;
  is_rewatch: boolean;
  review_id: number | null;
  created_at: Date;
}

export async function getSeriesMyLogs(
  tmdbId: number,
  userId: number,
): Promise<SeriesMyLogRow[]> {
  const [s] = await query<{ id: number }>(
    `SELECT id FROM series WHERE tmdb_id = ?`,
    [tmdbId],
  );
  if (!s) return [];

  const rows = await query<{
    id: number;
    value: number | string;
    watched_on: string | null;
    is_rewatch: number;
    review_id: number | null;
    created_at: Date;
  }>(
    `SELECT r.id, r.value, r.watched_on, r.is_rewatch, rv.id AS review_id, r.created_at
     FROM ratings r
     LEFT JOIN reviews rv ON rv.rating_id = r.id
     WHERE r.user_id = ? AND r.series_id = ?
     ORDER BY r.created_at DESC`,
    [userId, s.id],
  );

  return rows.map((r) => ({
    id: r.id,
    value: Number(r.value),
    watched_on: r.watched_on,
    is_rewatch: Boolean(r.is_rewatch),
    review_id: r.review_id,
    created_at: r.created_at,
  }));
}

// ─── Display prefs ───────────────────────────────────────────────────────────

export async function getSeriesDisplayPrefs(
  tmdbId: number,
  userId: number,
): Promise<SeriesDisplayPrefs | null> {
  const [s] = await query<{ id: number }>(
    `SELECT id FROM series WHERE tmdb_id = ?`,
    [tmdbId],
  );
  if (!s) return null;
  const [row] = await query<SeriesDisplayPrefs>(
    `SELECT custom_poster_path, custom_backdrop_path
     FROM user_title_display_prefs
     WHERE user_id = ? AND series_id = ? LIMIT 1`,
    [userId, s.id],
  );
  return row
    ? {
        custom_poster_path: row.custom_poster_path ?? null,
        custom_backdrop_path: row.custom_backdrop_path ?? null,
      }
    : null;
}

export async function setSeriesDisplayPrefs(
  tmdbId: number,
  userId: number,
  posterPath: string | null | undefined,
  backdropPath: string | null | undefined,
): Promise<SeriesDisplayPrefs> {
  const base = await getSeriesById(tmdbId);
  const seriesId = base.id;

  const [existing] = await query<SeriesDisplayPrefs>(
    `SELECT custom_poster_path, custom_backdrop_path
     FROM user_title_display_prefs
     WHERE user_id = ? AND series_id = ? LIMIT 1`,
    [userId, seriesId],
  );

  const nextPoster =
    posterPath === undefined
      ? existing?.custom_poster_path ?? null
      : posterPath;
  const nextBackdrop =
    backdropPath === undefined
      ? existing?.custom_backdrop_path ?? null
      : backdropPath;

  await execute(
    `INSERT INTO user_title_display_prefs
       (user_id, series_id, custom_poster_path, custom_backdrop_path)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       custom_poster_path   = VALUES(custom_poster_path),
       custom_backdrop_path = VALUES(custom_backdrop_path)`,
    [userId, seriesId, nextPoster, nextBackdrop],
  );

  return {
    custom_poster_path: nextPoster,
    custom_backdrop_path: nextBackdrop,
  };
}

// ─── Likes ───────────────────────────────────────────────────────────────────

/**
 * Hearts a series for the authenticated user. Idempotent — re-liking silently
 * succeeds. Throws 404 if the series does not exist (after the local cache
 * hydration handled by getSeriesById).
 * @param tmdbId - The TMDB series ID.
 * @param userId - Authenticated user ID.
 */
export async function likeSeries(tmdbId: number, userId: number): Promise<void> {
  const base = await getSeriesById(tmdbId);
  await execute(
    `INSERT IGNORE INTO title_likes (user_id, series_id) VALUES (?, ?)`,
    [userId, base.id],
  );
}

/**
 * Removes a heart on a series for the authenticated user. Idempotent — a
 * missing row is treated as success.
 * @param tmdbId - The TMDB series ID.
 * @param userId - Authenticated user ID.
 */
export async function unlikeSeries(tmdbId: number, userId: number): Promise<void> {
  const [s] = await query<{ id: number }>(
    `SELECT id FROM series WHERE tmdb_id = ?`,
    [tmdbId],
  );
  if (!s) return;
  await execute(
    `DELETE FROM title_likes WHERE user_id = ? AND series_id = ?`,
    [userId, s.id],
  );
}
