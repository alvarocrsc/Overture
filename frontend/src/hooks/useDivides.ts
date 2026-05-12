import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';

export interface DividesRow {
  id: number;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  media_type: 'film' | 'series';
  friend_count: number;
  worst_rating: number;
  best_rating: number;
  rating_spread: number;
  positive_percent: number;
  negative_percent: number;
  worst_username: string;
  worst_avatar_url: string | null;
  best_username: string;
  best_avatar_url: string | null;
}

interface DividesResponse {
  data: DividesRow[];
}

/**
 * Fetches the titles that most divide the viewer's followed users for the
 * requested media type. Powers the Home → Divides Your Friends carousel.
 */
export function useDivides(type: 'film' | 'series') {
  return useQuery({
    queryKey: ['divides', type],
    queryFn: async (): Promise<DividesRow[]> => {
      const res = await api.get<DividesResponse>('/users/me/divides', {
        params: { type },
      });
      return res.data.data;
    },
    staleTime: 60 * 1000,
  });
}
