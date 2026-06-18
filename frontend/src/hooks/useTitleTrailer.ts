import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import api from '@/src/lib/api';
import type { MediaType } from '@/src/types/lists.types';

interface TrailerResponse {
  data: {
    key: string;
    site: string;
    type: string;
    official: boolean;
  } | null;
}

/**
 * Lazily fetches the official YouTube trailer key for a film or series.
 *
 * Films are served by `GET /films/:tmdbId/trailer`. There is currently no
 * series trailer endpoint, so series always resolve to `null`.
 *
 * TODO(series-trailer): wire up a real series trailer endpoint and fetch it
 * here once it ships on the backend.
 *
 * @param mediaType - Whether the title is a film or a series.
 * @param tmdbId - The TMDB id, or undefined to skip the query.
 * @param enabled - When false, the query stays idle (used to defer fetching
 *   until the item is actually visible).
 * @returns Query result whose `data` is the trailer key string or null.
 */
export function useTitleTrailer(
  mediaType: MediaType,
  tmdbId: number | undefined,
  enabled: boolean = true,
): UseQueryResult<string | null> {
  return useQuery({
    queryKey: ['trailer', mediaType, tmdbId],
    queryFn: async (): Promise<string | null> => {
      if (mediaType !== 'film') return null;
      const res = await api.get<TrailerResponse>(`/films/${tmdbId}/trailer`);
      return res.data.data?.key ?? null;
    },
    enabled: enabled && tmdbId != null && mediaType === 'film',
    staleTime: Infinity,
  });
}
