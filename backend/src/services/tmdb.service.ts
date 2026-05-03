import { tmdbFetch } from '../config/tmdb';
import type {
  TmdbMovie,
  TmdbMovieDetail,
  TmdbImageResult,
  TmdbCreditsResult,
  TmdbSeries,
  TmdbSeriesDetail,
} from '../types/tmdb.types';

/** Shape of all TMDB endpoints that return a paginated results array. */
interface TmdbPagedResponse<T> {
  results: T[];
  page: number;
  total_results: number;
  total_pages: number;
}

/**
 * Fetches the trending films for the current week from TMDB.
 * @returns An array of TmdbMovie objects.
 */
export async function getTrendingFilms(): Promise<TmdbMovie[]> {
  const data = await tmdbFetch<TmdbPagedResponse<TmdbMovie>>('/trending/movie/week');
  return data.results;
}

/**
 * Fetches currently playing films from TMDB.
 * @returns An array of TmdbMovie objects.
 */
export async function getNewReleases(): Promise<TmdbMovie[]> {
  const data = await tmdbFetch<TmdbPagedResponse<TmdbMovie>>('/movie/now_playing');
  return data.results;
}

/**
 * Searches TMDB for films matching the given query string.
 * @param searchQuery - The user-provided search term.
 * @returns An array of TmdbMovie objects.
 */
export async function searchFilms(searchQuery: string): Promise<TmdbMovie[]> {
  const data = await tmdbFetch<TmdbPagedResponse<TmdbMovie>>('/search/movie', {
    query: searchQuery,
  });
  return data.results;
}

/**
 * Fetches full details for a single film from TMDB.
 * @param tmdbId - The TMDB movie ID.
 * @returns A TmdbMovieDetail object including genres and runtime.
 */
export async function getFilmById(tmdbId: number): Promise<TmdbMovieDetail> {
  return tmdbFetch<TmdbMovieDetail>(`/movie/${tmdbId}`);
}

/**
 * Fetches image assets (backdrops, posters, logos) for a film from TMDB.
 * Requests both English-labelled and language-neutral images in a single call.
 * @param tmdbId - The TMDB movie ID.
 * @returns A TmdbImageResult object.
 */
export async function getFilmImages(tmdbId: number): Promise<TmdbImageResult> {
  return tmdbFetch<TmdbImageResult>(`/movie/${tmdbId}/images`, {
    include_image_language: 'en,null',
  });
}

/**
 * Fetches cast and crew credits for a film from TMDB.
 * @param tmdbId - The TMDB movie ID.
 * @returns A TmdbCreditsResult containing cast and crew arrays.
 */
export async function getFilmCredits(tmdbId: number): Promise<TmdbCreditsResult> {
  return tmdbFetch<TmdbCreditsResult>(`/movie/${tmdbId}/credits`);
}

// ─── Series (TV) ─────────────────────────────────────────────────────────────

/**
 * Fetches the trending TV series for the current week from TMDB.
 * @returns An array of TmdbSeries objects.
 */
export async function getTrendingSeries(): Promise<TmdbSeries[]> {
  const data = await tmdbFetch<TmdbPagedResponse<TmdbSeries>>('/trending/tv/week');
  return data.results;
}

/**
 * Fetches TV series currently on the air from TMDB.
 * @returns An array of TmdbSeries objects.
 */
export async function getNewSeries(): Promise<TmdbSeries[]> {
  const data = await tmdbFetch<TmdbPagedResponse<TmdbSeries>>('/tv/on_the_air');
  return data.results;
}

/**
 * Searches TMDB for TV series matching the given query string.
 * @param searchQuery - The user-provided search term.
 * @returns An array of TmdbSeries objects.
 */
export async function searchSeries(searchQuery: string): Promise<TmdbSeries[]> {
  const data = await tmdbFetch<TmdbPagedResponse<TmdbSeries>>('/search/tv', {
    query: searchQuery,
  });
  return data.results;
}

/**
 * Fetches full details for a single TV series from TMDB.
 * @param tmdbId - The TMDB series ID.
 * @returns A TmdbSeriesDetail object including genres and season/episode counts.
 */
export async function getSeriesById(tmdbId: number): Promise<TmdbSeriesDetail> {
  return tmdbFetch<TmdbSeriesDetail>(`/tv/${tmdbId}`);
}

/**
 * Fetches image assets for a TV series from TMDB.
 * Requests both English-labelled and language-neutral images in a single call.
 * @param tmdbId - The TMDB series ID.
 * @returns A TmdbImageResult object.
 */
export async function getSeriesImages(tmdbId: number): Promise<TmdbImageResult> {
  return tmdbFetch<TmdbImageResult>(`/tv/${tmdbId}/images`, {
    include_image_language: 'en,null',
  });
}

/**
 * Fetches cast and crew credits for a TV series from TMDB.
 * @param tmdbId - The TMDB series ID.
 * @returns A TmdbCreditsResult containing cast and crew arrays.
 */
export async function getSeriesCredits(tmdbId: number): Promise<TmdbCreditsResult> {
  return tmdbFetch<TmdbCreditsResult>(`/tv/${tmdbId}/credits`);
}
