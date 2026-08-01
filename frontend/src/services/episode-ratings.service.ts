/**
 * Episode ratings service — thin wrappers around the /api/v1 episode endpoints.
 *
 * Every function returns the unwrapped `data` payload from the backend
 * envelope. Errors propagate as axios errors for the calling hook to surface.
 */
import api from '@/src/lib/api';
import type {
  CreateEpisodeRatingPayload,
  EpisodeListRow,
  EpisodeRatingsGrid,
  RatingSource,
  SeasonSummary,
} from '@/src/types/episode-ratings.types';

/** Backend success envelope. */
interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

/** Season summaries for the carousel, averaged per `source`. */
export async function fetchSeasonSummaries(
  tmdbId: number,
  source: RatingSource,
): Promise<SeasonSummary[]> {
  const res = await api.get<ApiEnvelope<SeasonSummary[]>>(
    `/series/${tmdbId}/seasons`,
    { params: { type: source } },
  );
  return res.data.data;
}

/** Sparse cell data for the ratings grid, plus the watch-progress pointer. */
export async function fetchEpisodeRatingsGrid(
  tmdbId: number,
  source: RatingSource,
): Promise<EpisodeRatingsGrid> {
  const res = await api.get<ApiEnvelope<EpisodeRatingsGrid>>(
    `/series/${tmdbId}/episode-ratings`,
    { params: { type: source } },
  );
  return res.data.data;
}

/** Every episode of one season. Caches the season server-side on first call. */
export async function fetchSeasonEpisodes(
  tmdbId: number,
  seasonNumber: number,
  source: RatingSource,
): Promise<EpisodeListRow[]> {
  const res = await api.get<ApiEnvelope<EpisodeListRow[]>>(
    `/series/${tmdbId}/season/${seasonNumber}`,
    { params: { type: source } },
  );
  return res.data.data;
}

/** Marks every not-yet-logged episode of a season as watched. */
export async function logEntireSeason(
  tmdbId: number,
  seasonNumber: number,
): Promise<{ loggedCount: number }> {
  const res = await api.post<ApiEnvelope<{ loggedCount: number }>>(
    `/series/${tmdbId}/season/${seasonNumber}/log-all`,
  );
  return res.data.data;
}

/** Creates or updates the user's log for a single episode. */
export async function createEpisodeRating(
  payload: CreateEpisodeRatingPayload,
): Promise<{ episodeRatingId: number; episodeReviewId: number | null }> {
  const res = await api.post<
    ApiEnvelope<{ episodeRatingId: number; episodeReviewId: number | null }>
  >('/episode-ratings', payload);
  return res.data.data;
}
