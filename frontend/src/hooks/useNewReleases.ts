import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';

interface TmdbFilm {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
}

interface NewReleasesResponse {
  data: TmdbFilm[];
}

/**
 * Fetches new film releases from the backend TMDB proxy.
 * Falls back to an empty array while loading or on error.
 */
export function useNewFilms() {
  return useQuery({
    queryKey: ['films', 'new-releases'],
    queryFn: async () => {
      const response = await api.get<NewReleasesResponse>('/films/new-releases');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetches new series releases from the backend TMDB proxy.
 * Falls back to an empty array while loading or on error.
 */
export function useNewSeries() {
  return useQuery({
    queryKey: ['series', 'new-releases'],
    queryFn: async () => {
      const response = await api.get<NewReleasesResponse>('/series/new-releases');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
