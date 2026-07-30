import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import api from '@/src/lib/api';
import type { MediaType } from '@/src/types/lists.types';

interface TrailerResponse {
  data: {
    key: string;
    site: string;
    name: string;
  } | null;
}

/**
 * Lazily fetches the best available YouTube trailer key for a film or series.
 *
 * Films are served by `GET /films/:tmdbId/trailer` and series by
 * `GET /series/:tmdbId/trailer`. Both endpoints run the backend's coverage
 * fallback chain (TMDB official → any trailer → teaser → YouTube search) and
 * return the resolved key, or null when none exists.
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
      const path =
        mediaType === 'film'
          ? `/films/${tmdbId}/trailer`
          : `/series/${tmdbId}/trailer`;
      const res = await api.get<TrailerResponse>(path);
      return res.data.data?.key ?? null;
    },
    enabled: enabled && tmdbId != null,
    staleTime: Infinity,
  });
}
