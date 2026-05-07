import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';

/**
 * Raw shape returned by GET /films/trending. Backend enriches the trending
 * projection with backdrop, overview, release_date and tmdb_rating beyond
 * the slim search-result shape used elsewhere.
 */
export interface TrendingFilmRaw {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string | null;
  tmdb_rating: number | null;
}

interface PaginatedTrendingResponse {
  data: TrendingFilmRaw[];
  page: number;
  total_pages: number;
}

/**
 * Fetches the first page of trending films or series for the Discover screen.
 * Cached for 10 minutes since trending data changes slowly.
 *
 * @param type - Whether to fetch trending films or series. Defaults to 'films'.
 */
export function useTrending(type: 'films' | 'series' = 'films') {
  return useQuery({
    queryKey: ['trending', type],
    queryFn: async (): Promise<TrendingFilmRaw[]> => {
      const endpoint = type === 'films' ? '/films/trending' : '/series/trending';
      const res = await api.get<PaginatedTrendingResponse>(endpoint);
      return res.data.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}
