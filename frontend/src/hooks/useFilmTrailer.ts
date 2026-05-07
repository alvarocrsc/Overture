import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';

interface TrailerResponse {
  data: {
    /** YouTube video ID. */
    key: string;
    site: string;
    type: string;
    official: boolean;
  } | null;
}

/**
 * Fetches the official YouTube trailer key for a film. The backend filters
 * TMDB's video list to a single best match (site = YouTube, type = Trailer,
 * official = true) and returns null when no suitable video exists.
 *
 * Cached per film for 1 hour since trailers are effectively immutable.
 *
 * @param tmdbId - The TMDB movie ID, or undefined to skip the query.
 * @returns React Query result whose `data` is the trailer key string or null.
 */
export function useFilmTrailer(tmdbId: number | undefined) {
  return useQuery({
    queryKey: ['film-trailer', tmdbId],
    queryFn: async (): Promise<string | null> => {
      const res = await api.get<TrailerResponse>(`/films/${tmdbId}/trailer`);
      return res.data.data?.key ?? null;
    },
    enabled: tmdbId != null,
    staleTime: 60 * 60 * 1000,
  });
}
