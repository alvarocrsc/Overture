import { query, execute } from '../config/db';
import * as tmdbService from './tmdb.service';
import { AppError } from '../utils/app-error';
import type { Series } from '../models/series.model';
import type { SeriesCredit } from '../models/series-credit.model';
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
}

/**
 * Upserts a single TmdbSeries into the local series table.
 * Uses COALESCE to preserve an already-cached episode_runtime when the incoming
 * episode_run_time array is empty (list endpoints often omit it).
 * @param series - The TMDB series object to cache.
 */
async function upsertSeries(series: TmdbSeries): Promise<void> {
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
export async function getTrendingSeries(): Promise<TmdbSeries[]> {
  const series = await tmdbService.getTrendingSeries();
  for (const s of series) {
    await upsertSeries(s);
  }
  return series;
}

/**
 * Fetches TV series currently on the air, upserts them into the local series
 * cache, and returns the TMDB response directly.
 * @returns An array of TmdbSeries objects.
 */
export async function getNewSeries(): Promise<TmdbSeries[]> {
  const series = await tmdbService.getNewSeries();
  for (const s of series) {
    await upsertSeries(s);
  }
  return series;
}

/**
 * Searches TMDB for TV series matching the query, upserts results into the
 * local series cache, and returns the TMDB response directly.
 * @param searchQuery - The user-provided search term.
 * @returns An array of TmdbSeries objects.
 */
export async function searchSeries(searchQuery: string): Promise<TmdbSeries[]> {
  const series = await tmdbService.searchSeries(searchQuery);
  for (const s of series) {
    await upsertSeries(s);
  }
  return series;
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
 * Returns credits for a series. Serves from the local series_credits cache when
 * available; otherwise fetches from TMDB, caches directors and top-15 cast,
 * then returns the result.
 * @param tmdbId - The TMDB series ID.
 * @returns A SeriesCreditsResponse with directors and cast arrays.
 */
export async function getSeriesCredits(tmdbId: number): Promise<SeriesCreditsResponse> {
  const [series] = await query<{ id: number }>(
    `SELECT id FROM series WHERE tmdb_id = ?`,
    [tmdbId],
  );

  if (series) {
    const localCredits = await query<SeriesCredit>(
      `SELECT id, series_id, person_tmdb_id, person_name, role, character_name,
              profile_path, popularity, cast_order
       FROM series_credits WHERE series_id = ?`,
      [series.id],
    );

    if (localCredits.length > 0) {
      return {
        directors: localCredits
          .filter((c) => c.role === 'director')
          .map((c) => ({
            person_tmdb_id: c.person_tmdb_id,
            person_name: c.person_name,
            profile_path: c.profile_path,
            popularity: c.popularity,
          })),
        cast: localCredits
          .filter((c) => c.role === 'actor')
          .map((c) => ({
            person_tmdb_id: c.person_tmdb_id,
            person_name: c.person_name,
            character_name: c.character_name,
            cast_order: c.cast_order,
            profile_path: c.profile_path,
            popularity: c.popularity,
          })),
      };
    }
  }

  // No local cache — fetch from TMDB.
  const credits = await tmdbService.getSeriesCredits(tmdbId);
  const directors = credits.crew.filter((m) => m.job === 'Director');
  const cast = credits.cast;

  if (series) {
    await execute(`DELETE FROM series_credits WHERE series_id = ?`, [series.id]);

    for (const director of directors) {
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
    directors: directors.map((m) => ({
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
  };
}
