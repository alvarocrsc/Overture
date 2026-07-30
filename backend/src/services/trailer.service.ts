import { query, execute } from '../config/db';
import { tmdbFetch } from '../config/tmdb';
import { youtubeSearch, youtubeVideoDetails } from '../config/youtube';
import type { TmdbVideo } from '../types/tmdb.types';

/** The trailer contract returned to clients — a YouTube video key + label. */
export interface TrailerResult {
  key: string;
  site: 'YouTube';
  name: string;
}

type MediaType = 'film' | 'series';

/**
 * Extracts a four-digit year from a release / first-air date for use in the
 * YouTube search fallback query.
 *
 * The `films.release_date` / `series.first_air_date` columns are typed as
 * `string` but mysql2 hydrates DATE columns as JS `Date` objects, so both
 * runtime shapes are handled here.
 *
 * @param value - A 'YYYY-MM-DD' string, a Date, or null.
 * @returns The year as a string, or null when unavailable.
 */
export function releaseYear(value: string | Date | null): string | null {
  if (value == null) return null;
  if (value instanceof Date) return String(value.getFullYear());
  return value.slice(0, 4);
}

/** Cached trailer columns as stored on the `films` / `series` rows. */
interface TrailerCacheRow {
  trailer_key: string | null;
  trailer_source: string | null;
  trailer_checked_at: string | null;
}

/** The source tier a resolved trailer came from (matches the DB enum, sans 'none'). */
type TrailerSource = 'tmdb_trailer' | 'tmdb_teaser' | 'youtube_search';

// Re-check titles marked 'none' after 30 days, in case TMDB adds a trailer later.
const RECHECK_NONE_AFTER_DAYS = 30;

/** Trailers typically run 30s–6min; reject search hits outside this range. */
const MIN_TRAILER_SECONDS = 30;
const MAX_TRAILER_SECONDS = 360;

/**
 * Resolves the table a media type is cached in. `mediaType` is an internal
 * discriminator (never user input), so interpolating the resulting fixed
 * identifier into SQL is safe — table/column names cannot be parameterised.
 */
function tableFor(mediaType: MediaType): 'films' | 'series' {
  return mediaType === 'film' ? 'films' : 'series';
}

/**
 * Resolves a trailer for a film or series, serving a cached value when fresh
 * and otherwise running the full fallback chain and caching the outcome.
 *
 * The row identified by `localId` must already exist in its table (the
 * film/series services cache it before calling this).
 *
 * @param mediaType - Whether the title is a film or a series.
 * @param localId - The internal `films.id` / `series.id` primary key.
 * @param tmdbId - The TMDB id, used for the TMDB videos lookup.
 * @param title - The title, used for the YouTube search fallback and result name.
 * @param year - The release / first-air year (or null), used to refine the search.
 * @returns The resolved trailer, or null when none could be found.
 */
export async function resolveTrailer(
  mediaType: MediaType,
  localId: number,
  tmdbId: number,
  title: string,
  year: string | null,
): Promise<TrailerResult | null> {
  const table = tableFor(mediaType);

  const cached = await query<TrailerCacheRow>(
    `SELECT trailer_key, trailer_source, trailer_checked_at
       FROM ${table}
      WHERE id = ? LIMIT 1`,
    [localId],
  );
  const row = cached[0];

  if (row?.trailer_checked_at) {
    const ageMs = Date.now() - new Date(row.trailer_checked_at).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const isStaleNone =
      row.trailer_source === 'none' && ageDays > RECHECK_NONE_AFTER_DAYS;
    if (!isStaleNone) {
      return row.trailer_key
        ? { key: row.trailer_key, site: 'YouTube', name: title }
        : null;
    }
  }

  const resolved = await runFallbackChain(mediaType, tmdbId, title, year);

  await execute(
    `UPDATE ${table}
        SET trailer_key = ?, trailer_source = ?, trailer_checked_at = NOW()
      WHERE id = ?`,
    [resolved?.key ?? null, resolved?.source ?? 'none', localId],
  );

  return resolved ? { key: resolved.key, site: 'YouTube', name: title } : null;
}

/**
 * Runs the trailer fallback chain for a title, most-preferred source first:
 * TMDB official trailer → TMDB any trailer → TMDB teaser → YouTube search.
 *
 * @returns The resolved key + its source tier, or null when nothing qualifies.
 */
async function runFallbackChain(
  mediaType: MediaType,
  tmdbId: number,
  title: string,
  year: string | null,
): Promise<{ key: string; source: TrailerSource } | null> {
  const videosPath =
    mediaType === 'film' ? `/movie/${tmdbId}/videos` : `/tv/${tmdbId}/videos`;
  const videos = await tmdbFetch<{ results: TmdbVideo[] }>(videosPath).catch(
    () => ({ results: [] as TmdbVideo[] }),
  );

  const youtubeVideos = videos.results.filter((v) => v.site === 'YouTube');

  // Tier 1: official trailer, newest first.
  const officialTrailer = youtubeVideos
    .filter((v) => v.type === 'Trailer' && v.official)
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    )[0];
  if (officialTrailer) {
    return { key: officialTrailer.key, source: 'tmdb_trailer' };
  }

  // Tier 2: any trailer.
  const anyTrailer = youtubeVideos.find((v) => v.type === 'Trailer');
  if (anyTrailer) return { key: anyTrailer.key, source: 'tmdb_trailer' };

  // Tier 3: teaser as a substitute.
  const teaser = youtubeVideos.find((v) => v.type === 'Teaser');
  if (teaser) return { key: teaser.key, source: 'tmdb_teaser' };

  // Tier 4: YouTube search fallback (quota-costly — only reached when TMDB has nothing).
  const searchQuery = `${title} ${year ?? ''} official trailer`.trim();
  try {
    const searchRes = await youtubeSearch(searchQuery);
    for (const item of searchRes.items) {
      const details = await youtubeVideoDetails(item.id.videoId);
      // Skip results outside a trailer's typical length (full episodes, reactions, etc.).
      if (
        details &&
        details.durationSeconds >= MIN_TRAILER_SECONDS &&
        details.durationSeconds <= MAX_TRAILER_SECONDS
      ) {
        return { key: item.id.videoId, source: 'youtube_search' };
      }
    }
  } catch {
    // YouTube API failure (quota exhausted, network) — fail gracefully to 'none'.
    // TODO(youtube-quota): add retry-with-backoff / quota-aware handling.
  }

  return null;
}
