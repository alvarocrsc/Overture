import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import api from '@/src/lib/api';
import type {
  SeriesDetail,
  SeriesImages,
  SeriesDistribution,
  SeriesCredits,
  SeriesWatchedByRow,
  SeriesWatchlistedByRow,
  SeriesMyLogRow,
  SeriesDisplayPrefs,
} from '@/src/types/series.types';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const FIVE_MIN_MS = 5 * 60 * 1000;

interface ApiEnvelope<T> {
  data: T;
}

/** React Query key factory for series detail queries. */
export const seriesKeys = {
  detail: (tmdbId: number) => ['series', tmdbId] as const,
  images: (tmdbId: number) => ['series', tmdbId, 'images'] as const,
  distribution: (tmdbId: number) => ['series', tmdbId, 'distribution'] as const,
  credits: (tmdbId: number) => ['series', tmdbId, 'credits'] as const,
  watchedBy: (tmdbId: number) => ['series', tmdbId, 'watched-by'] as const,
  watchlistedBy: (tmdbId: number) => ['series', tmdbId, 'watchlisted-by'] as const,
  myLogs: (tmdbId: number) => ['series', tmdbId, 'my-logs'] as const,
  displayPrefs: (tmdbId: number) => ['series', tmdbId, 'display-prefs'] as const,
};

/** Fetches the full series detail (cached record + per-user enrichment). */
export function useSeriesDetail(
  tmdbId: number | undefined,
): UseQueryResult<SeriesDetail> {
  return useQuery({
    queryKey: tmdbId != null ? seriesKeys.detail(tmdbId) : ['series', 'none'],
    queryFn: async (): Promise<SeriesDetail> => {
      const res = await api.get<ApiEnvelope<SeriesDetail>>(`/series/${tmdbId}`);
      return res.data.data;
    },
    enabled: tmdbId != null,
    staleTime: FIVE_MIN_MS,
  });
}

/** Fetches the categorised image assets for a series. */
export function useSeriesImages(
  tmdbId: number | undefined,
): UseQueryResult<SeriesImages> {
  return useQuery({
    queryKey:
      tmdbId != null ? seriesKeys.images(tmdbId) : ['series', 'none', 'images'],
    queryFn: async (): Promise<SeriesImages> => {
      const res = await api.get<ApiEnvelope<SeriesImages>>(
        `/series/${tmdbId}/images`,
      );
      return res.data.data;
    },
    enabled: tmdbId != null,
    staleTime: WEEK_MS,
  });
}

/** Fetches the app-wide rating distribution + average for a series. */
export function useSeriesDistribution(
  tmdbId: number | undefined,
): UseQueryResult<SeriesDistribution> {
  return useQuery({
    queryKey:
      tmdbId != null
        ? seriesKeys.distribution(tmdbId)
        : ['series', 'none', 'distribution'],
    queryFn: async (): Promise<SeriesDistribution> => {
      const res = await api.get<ApiEnvelope<SeriesDistribution>>(
        `/series/${tmdbId}/distribution`,
      );
      return res.data.data;
    },
    enabled: tmdbId != null,
    staleTime: FIVE_MIN_MS,
  });
}

/** Fetches cast and creators for a series. */
export function useSeriesCredits(
  tmdbId: number | undefined,
): UseQueryResult<SeriesCredits> {
  return useQuery({
    queryKey:
      tmdbId != null ? seriesKeys.credits(tmdbId) : ['series', 'none', 'credits'],
    queryFn: async (): Promise<SeriesCredits> => {
      const res = await api.get<ApiEnvelope<SeriesCredits>>(
        `/series/${tmdbId}/credits`,
      );
      return res.data.data;
    },
    enabled: tmdbId != null,
    staleTime: WEEK_MS,
  });
}

/** Fetches up to 20 users who have logged this series. */
export function useSeriesWatchedBy(
  tmdbId: number | undefined,
): UseQueryResult<SeriesWatchedByRow[]> {
  return useQuery({
    queryKey:
      tmdbId != null ? seriesKeys.watchedBy(tmdbId) : ['series', 'none', 'watched-by'],
    queryFn: async (): Promise<SeriesWatchedByRow[]> => {
      const res = await api.get<ApiEnvelope<SeriesWatchedByRow[]>>(
        `/series/${tmdbId}/watched-by`,
      );
      return res.data.data;
    },
    enabled: tmdbId != null,
    staleTime: FIVE_MIN_MS,
  });
}

/** Fetches up to 20 users who have this series in their watchlist. */
export function useSeriesWantToWatch(
  tmdbId: number | undefined,
): UseQueryResult<SeriesWatchlistedByRow[]> {
  return useQuery({
    queryKey:
      tmdbId != null
        ? seriesKeys.watchlistedBy(tmdbId)
        : ['series', 'none', 'watchlisted-by'],
    queryFn: async (): Promise<SeriesWatchlistedByRow[]> => {
      const res = await api.get<ApiEnvelope<SeriesWatchlistedByRow[]>>(
        `/series/${tmdbId}/watchlisted-by`,
      );
      return res.data.data;
    },
    enabled: tmdbId != null,
    staleTime: FIVE_MIN_MS,
  });
}

/** Fetches the authenticated user's ratings for a series. */
export function useSeriesMyLogs(
  tmdbId: number | undefined,
): UseQueryResult<SeriesMyLogRow[]> {
  return useQuery({
    queryKey:
      tmdbId != null ? seriesKeys.myLogs(tmdbId) : ['series', 'none', 'my-logs'],
    queryFn: async (): Promise<SeriesMyLogRow[]> => {
      const res = await api.get<ApiEnvelope<SeriesMyLogRow[]>>(
        `/series/${tmdbId}/my-logs`,
      );
      return res.data.data;
    },
    enabled: tmdbId != null,
    staleTime: FIVE_MIN_MS,
  });
}

/** Fetches the authenticated user's saved display prefs for a series. */
export function useSeriesDisplayPrefs(
  tmdbId: number | undefined,
): UseQueryResult<SeriesDisplayPrefs | null> {
  return useQuery({
    queryKey:
      tmdbId != null
        ? seriesKeys.displayPrefs(tmdbId)
        : ['series', 'none', 'display-prefs'],
    queryFn: async (): Promise<SeriesDisplayPrefs | null> => {
      const res = await api.get<ApiEnvelope<SeriesDisplayPrefs | null>>(
        `/series/${tmdbId}/display-prefs`,
      );
      return res.data.data;
    },
    enabled: tmdbId != null,
    staleTime: HOUR_MS,
  });
}
