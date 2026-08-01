import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import * as episodeRatingsService from '@/src/services/episode-ratings.service';
import type {
  CreateEpisodeRatingPayload,
  EpisodeListRow,
  EpisodeRatingsGrid,
  RatingSource,
  SeasonSummary,
} from '@/src/types/episode-ratings.types';

const ONE_MINUTE_MS = 60 * 1000;

/**
 * Query keys for the episode ratings feature, nested under the series they
 * belong to so a single invalidation of `['series', tmdbId]` refreshes the
 * grid, the carousel and any open season list at once.
 */
export const episodeRatingKeys = {
  seasons: (tmdbId: number, source: RatingSource) =>
    ['series', tmdbId, 'seasons', source] as const,
  grid: (tmdbId: number, source: RatingSource) =>
    ['series', tmdbId, 'episode-ratings', source] as const,
  season: (tmdbId: number, seasonNumber: number, source: RatingSource) =>
    ['series', tmdbId, 'season', seasonNumber, source] as const,
};

/** Season summaries for the carousel. */
export function useSeasonSummaries(
  tmdbId: number,
  source: RatingSource,
): UseQueryResult<SeasonSummary[]> {
  return useQuery({
    queryKey: episodeRatingKeys.seasons(tmdbId, source),
    queryFn: () => episodeRatingsService.fetchSeasonSummaries(tmdbId, source),
    staleTime: ONE_MINUTE_MS,
  });
}

/** Sparse cells for the ratings grid, plus the watch-progress pointer. */
export function useEpisodeRatingsGrid(
  tmdbId: number,
  source: RatingSource,
): UseQueryResult<EpisodeRatingsGrid> {
  return useQuery({
    queryKey: episodeRatingKeys.grid(tmdbId, source),
    queryFn: () => episodeRatingsService.fetchEpisodeRatingsGrid(tmdbId, source),
    staleTime: ONE_MINUTE_MS,
  });
}

/**
 * Episodes of one season. Idle until a season is actually expanded, which is
 * what keeps the server-side episode caching lazy — one TMDB call per season,
 * only when opened.
 */
export function useSeasonEpisodes(
  tmdbId: number,
  seasonNumber: number | null,
  source: RatingSource,
): UseQueryResult<EpisodeListRow[]> {
  return useQuery({
    queryKey: episodeRatingKeys.season(tmdbId, seasonNumber ?? -1, source),
    queryFn: () => {
      if (seasonNumber === null) {
        return Promise.reject(new Error('No season expanded'));
      }
      return episodeRatingsService.fetchSeasonEpisodes(
        tmdbId,
        seasonNumber,
        source,
      );
    },
    enabled: seasonNumber !== null,
    staleTime: ONE_MINUTE_MS,
  });
}

/** Bulk-logs a whole season, then refreshes every view of this series. */
export function useLogEntireSeason(
  tmdbId: number,
): UseMutationResult<{ loggedCount: number }, Error, number> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (seasonNumber: number) =>
      episodeRatingsService.logEntireSeason(tmdbId, seasonNumber),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['series', tmdbId] });
    },
  });
}

/** Logs a single episode, then refreshes every view of this series. */
export function useCreateEpisodeRating(
  tmdbId: number,
): UseMutationResult<
  { episodeRatingId: number; episodeReviewId: number | null },
  Error,
  CreateEpisodeRatingPayload
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEpisodeRatingPayload) =>
      episodeRatingsService.createEpisodeRating(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['series', tmdbId] });
    },
  });
}
