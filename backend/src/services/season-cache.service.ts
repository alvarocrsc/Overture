import { query, execute } from '../config/db';
import { tmdbFetch } from '../config/tmdb';
import { AppError } from '../utils/app-error';
import type { TmdbSeasonDetail, TmdbSeasonSummary } from '../types/tmdb.types';

/** Episode caches are refreshed once they pass this age, matching films/series. */
const CACHE_TTL_DAYS = 7;

/**
 * TMDB numbers "Specials" as season 0. They are skipped everywhere in this
 * feature: they do not belong to the numbered run of a show and would distort
 * both the ratings grid and the season carousel.
 *
 * TODO(specials): revisit if users ask to track specials.
 */
const SPECIALS_SEASON_NUMBER = 0;

/**
 * Upserts the `seasons` rows for a series from the series' own TMDB detail
 * response, which already embeds a `seasons` array — so this costs no extra
 * TMDB call. Episodes are NOT touched here; they are cached lazily, one season
 * at a time, by {@link ensureSeasonEpisodesCached}.
 *
 * @param localSeriesId - The internal `series.id`.
 * @param tmdbSeasons - The `seasons` array from the TMDB `/tv/{id}` response.
 */
export async function cacheSeasonsFromSeriesPayload(
  localSeriesId: number,
  tmdbSeasons: TmdbSeasonSummary[] | undefined,
): Promise<void> {
  if (!tmdbSeasons) return;

  for (const season of tmdbSeasons) {
    if (season.season_number === SPECIALS_SEASON_NUMBER) continue;

    await execute(
      `INSERT INTO seasons
         (series_id, tmdb_season_id, season_number, name, overview, poster_path,
          air_date, episode_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name          = VALUES(name),
         overview      = VALUES(overview),
         poster_path   = VALUES(poster_path),
         air_date      = VALUES(air_date),
         episode_count = VALUES(episode_count),
         cached_at     = NOW()`,
      [
        localSeriesId,
        season.id,
        season.season_number,
        season.name || null,
        season.overview || null,
        season.poster_path ?? null,
        season.air_date || null,
        season.episode_count ?? null,
      ],
    );
  }
}

/**
 * Ensures one season's full episode list is cached locally, fetching from TMDB
 * only when the episodes are missing or stale. A single TMDB call caches the
 * whole season.
 *
 * Staleness is measured from the episodes' own `cached_at`, not the season
 * row's: the season row is touched every time the parent series is refreshed,
 * so using it would make never-refreshed episodes look permanently fresh.
 *
 * @param localSeriesId - The internal `series.id`.
 * @param tmdbSeriesId - The TMDB series id, for the TMDB call.
 * @param seasonNumber - The season to cache.
 * @returns The internal `seasons.id` for that season.
 * @throws If the season is not present locally (the series must be cached first).
 */
export async function ensureSeasonEpisodesCached(
  localSeriesId: number,
  tmdbSeriesId: number,
  seasonNumber: number,
): Promise<{ seasonId: number }> {
  const [season] = await query<{ id: number }>(
    `SELECT id FROM seasons WHERE series_id = ? AND season_number = ? LIMIT 1`,
    [localSeriesId, seasonNumber],
  );
  if (!season) {
    throw new AppError('Season not found for this series', 404);
  }
  const seasonId = season.id;

  const [freshness] = await query<{ total: number; is_fresh: number }>(
    `SELECT COUNT(*) AS total,
            COALESCE(MAX(cached_at) > NOW() - INTERVAL ? DAY, 0) AS is_fresh
       FROM episodes
      WHERE season_id = ?`,
    [CACHE_TTL_DAYS, seasonId],
  );

  if (freshness && freshness.total > 0 && Number(freshness.is_fresh) === 1) {
    return { seasonId };
  }

  const tmdbSeason = await tmdbFetch<TmdbSeasonDetail>(
    `/tv/${tmdbSeriesId}/season/${seasonNumber}`,
  );

  for (const episode of tmdbSeason.episodes) {
    await execute(
      `INSERT INTO episodes
         (season_id, series_id, tmdb_episode_id, season_number, episode_number,
          name, overview, still_path, air_date, runtime_min, tmdb_rating)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name        = VALUES(name),
         overview    = VALUES(overview),
         still_path  = VALUES(still_path),
         air_date    = VALUES(air_date),
         runtime_min = VALUES(runtime_min),
         tmdb_rating = VALUES(tmdb_rating),
         cached_at   = NOW()`,
      [
        seasonId,
        localSeriesId,
        episode.id,
        seasonNumber,
        episode.episode_number,
        episode.name || null,
        episode.overview || null,
        episode.still_path ?? null,
        episode.air_date || null,
        episode.runtime ?? null,
        episode.vote_average ?? null,
      ],
    );
  }

  return { seasonId };
}

/**
 * Resolves the internal `episodes.id` for a (season, episode) pair, caching the
 * season on demand when the episode is not yet known locally. Used when logging
 * an episode the user may have reached without ever opening its season.
 *
 * @throws If the episode does not exist on TMDB even after caching the season.
 */
export async function resolveEpisodeId(
  localSeriesId: number,
  tmdbSeriesId: number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<number> {
  const [existing] = await query<{ id: number }>(
    `SELECT id FROM episodes
      WHERE series_id = ? AND season_number = ? AND episode_number = ? LIMIT 1`,
    [localSeriesId, seasonNumber, episodeNumber],
  );
  if (existing) return existing.id;

  await ensureSeasonEpisodesCached(localSeriesId, tmdbSeriesId, seasonNumber);

  const [resolved] = await query<{ id: number }>(
    `SELECT id FROM episodes
      WHERE series_id = ? AND season_number = ? AND episode_number = ? LIMIT 1`,
    [localSeriesId, seasonNumber, episodeNumber],
  );
  if (!resolved) {
    throw new AppError('Episode not found', 404);
  }
  return resolved.id;
}

/**
 * Resolves the internal `series.id` for a TMDB series id.
 * @throws If the series has not been cached yet.
 */
export async function resolveLocalSeriesId(tmdbId: number): Promise<number> {
  const [series] = await query<{ id: number }>(
    `SELECT id FROM series WHERE tmdb_id = ? LIMIT 1`,
    [tmdbId],
  );
  if (!series) {
    throw new AppError('Series not found', 404);
  }
  return series.id;
}
