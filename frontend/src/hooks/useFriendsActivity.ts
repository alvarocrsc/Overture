import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';

/** A single row in the Home → Friends' Activity carousel. */
export interface FriendsActivityRow {
  id: number;
  user_id: number;
  username: string;
  avatar_url: string | null;
  rating: number;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  has_review: boolean;
  review_id: number | null;
  media_type: 'film' | 'series';
}

interface FriendsActivityResponse {
  data: FriendsActivityRow[];
}

/**
 * Fetches the latest rating per followed user for the requested media type.
 * Powers the Friends' Activity carousel on the Home screen. The list is
 * filtered server-side so the home banner can switch between films and
 * series without re-fetching across both.
 */
export function useFriendsActivity(type: 'film' | 'series') {
  return useQuery({
    queryKey: ['friends-activity', type],
    queryFn: async (): Promise<FriendsActivityRow[]> => {
      const res = await api.get<FriendsActivityResponse>('/users/me/friends-activity', {
        params: { type },
      });
      return res.data.data;
    },
    staleTime: 60 * 1000,
  });
}
