import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import api from '@/src/lib/api';
import type {
  FilmDetail,
  FilmImages,
  FilmDistribution,
  FilmCredits,
  FilmWatchedByRow,
  FilmWatchlistedByRow,
  FilmMyLogRow,
  FilmDisplayPrefs,
} from '@/src/types/film.types';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const FIVE_MIN_MS = 5 * 60 * 1000;

interface ApiEnvelope<T> {
  data: T;
}

export const filmKeys = {
  detail: (tmdbId: number) => ['film', tmdbId] as const,
  images: (tmdbId: number) => ['film', tmdbId, 'images'] as const,
  distribution: (tmdbId: number) => ['film', tmdbId, 'distribution'] as const,
  credits: (tmdbId: number) => ['film', tmdbId, 'credits'] as const,
  watchedBy: (tmdbId: number) => ['film', tmdbId, 'watched-by'] as const,
  watchlistedBy: (tmdbId: number) => ['film', tmdbId, 'watchlisted-by'] as const,
  myLogs: (tmdbId: number) => ['film', tmdbId, 'my-logs'] as const,
  displayPrefs: (tmdbId: number) => ['film', tmdbId, 'display-prefs'] as const,
};

/**
 * Fetches the full film detail (cached record + per-user enrichment).
 *
 * @param tmdbId - The TMDB movie ID, or undefined to skip the query.
 */
export function useFilmDetail(
  tmdbId: number | undefined,
): UseQueryResult<FilmDetail> {
  return useQuery({
    queryKey: tmdbId != null ? filmKeys.detail(tmdbId) : ['film', 'none'],
    queryFn: async (): Promise<FilmDetail> => {
      const res = await api.get<ApiEnvelope<FilmDetail>>(`/films/${tmdbId}`);
      return res.data.data;
    },
    enabled: tmdbId != null,
    staleTime: FIVE_MIN_MS,
  });
}

/**
 * Fetches the categorised image assets (posters, backdrops, logos) for a film.
 * Cached for a week since image lists rarely change.
 */
export function useFilmImages(
  tmdbId: number | undefined,
): UseQueryResult<FilmImages> {
  return useQuery({
    queryKey: tmdbId != null ? filmKeys.images(tmdbId) : ['film', 'none', 'images'],
    queryFn: async (): Promise<FilmImages> => {
      const res = await api.get<ApiEnvelope<FilmImages>>(`/films/${tmdbId}/images`);
      return res.data.data;
    },
    enabled: tmdbId != null,
    staleTime: WEEK_MS,
  });
}

/**
 * Fetches the app-wide rating distribution + average for a film.
 */
export function useFilmDistribution(
  tmdbId: number | undefined,
): UseQueryResult<FilmDistribution> {
  return useQuery({
    queryKey:
      tmdbId != null ? filmKeys.distribution(tmdbId) : ['film', 'none', 'distribution'],
    queryFn: async (): Promise<FilmDistribution> => {
      const res = await api.get<ApiEnvelope<FilmDistribution>>(
        `/films/${tmdbId}/distribution`,
      );
      return res.data.data;
    },
    enabled: tmdbId != null,
    staleTime: FIVE_MIN_MS,
  });
}

/**
 * Fetches cast and directors for a film. Cached for a week.
 */
export function useFilmCredits(
  tmdbId: number | undefined,
): UseQueryResult<FilmCredits> {
  return useQuery({
    queryKey: tmdbId != null ? filmKeys.credits(tmdbId) : ['film', 'none', 'credits'],
    queryFn: async (): Promise<FilmCredits> => {
      const res = await api.get<ApiEnvelope<FilmCredits>>(`/films/${tmdbId}/credits`);
      return res.data.data;
    },
    enabled: tmdbId != null,
    staleTime: WEEK_MS,
  });
}

/**
 * Fetches up to 20 users who have logged this film. Friends-first when
 * authenticated.
 */
export function useWatchedBy(
  tmdbId: number | undefined,
): UseQueryResult<FilmWatchedByRow[]> {
  return useQuery({
    queryKey:
      tmdbId != null ? filmKeys.watchedBy(tmdbId) : ['film', 'none', 'watched-by'],
    queryFn: async (): Promise<FilmWatchedByRow[]> => {
      const res = await api.get<ApiEnvelope<FilmWatchedByRow[]>>(
        `/films/${tmdbId}/watched-by`,
      );
      return res.data.data;
    },
    enabled: tmdbId != null,
    staleTime: FIVE_MIN_MS,
  });
}

/**
 * Fetches up to 20 users who have this film in their watchlist. Friends-first
 * when authenticated.
 */
export function useWantToWatch(
  tmdbId: number | undefined,
): UseQueryResult<FilmWatchlistedByRow[]> {
  return useQuery({
    queryKey:
      tmdbId != null
        ? filmKeys.watchlistedBy(tmdbId)
        : ['film', 'none', 'watchlisted-by'],
    queryFn: async (): Promise<FilmWatchlistedByRow[]> => {
      const res = await api.get<ApiEnvelope<FilmWatchlistedByRow[]>>(
        `/films/${tmdbId}/watchlisted-by`,
      );
      return res.data.data;
    },
    enabled: tmdbId != null,
    staleTime: FIVE_MIN_MS,
  });
}

/**
 * Fetches all of the authenticated user's ratings for a film, including
 * rewatches, ordered by most recent first. Requires authentication.
 */
export function useFilmMyLogs(
  tmdbId: number | undefined,
): UseQueryResult<FilmMyLogRow[]> {
  return useQuery({
    queryKey: tmdbId != null ? filmKeys.myLogs(tmdbId) : ['film', 'none', 'my-logs'],
    queryFn: async (): Promise<FilmMyLogRow[]> => {
      const res = await api.get<ApiEnvelope<FilmMyLogRow[]>>(
        `/films/${tmdbId}/my-logs`,
      );
      return res.data.data;
    },
    enabled: tmdbId != null,
    staleTime: FIVE_MIN_MS,
  });
}

/**
 * Fetches the authenticated user's saved display prefs (custom poster/backdrop)
 * for a film. Returns null when no prefs have been saved.
 */
export function useFilmDisplayPrefs(
  tmdbId: number | undefined,
): UseQueryResult<FilmDisplayPrefs | null> {
  return useQuery({
    queryKey:
      tmdbId != null ? filmKeys.displayPrefs(tmdbId) : ['film', 'none', 'display-prefs'],
    queryFn: async (): Promise<FilmDisplayPrefs | null> => {
      const res = await api.get<ApiEnvelope<FilmDisplayPrefs | null>>(
        `/films/${tmdbId}/display-prefs`,
      );
      return res.data.data;
    },
    enabled: tmdbId != null,
    staleTime: HOUR_MS,
  });
}
