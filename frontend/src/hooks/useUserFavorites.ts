import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import api from '@/src/lib/api';
import type { UserFavorite } from '@/src/types/profile.types';

interface FavoritesResponse {
  data: UserFavorite[];
}

/**
 * Fetches a user's pinned 4 favorites.
 *
 * @param userId - When omitted, fetches the authenticated user's favorites
 *                 from `/users/me/favorites`. When provided, fetches the
 *                 target user's favorites from `/users/:id/favorites`.
 */
export function useUserFavorites(
  userId?: number,
): UseQueryResult<UserFavorite[]> {
  const isMe = userId == null;
  return useQuery({
    queryKey: ['user-favorites', isMe ? 'me' : userId],
    queryFn: async (): Promise<UserFavorite[]> => {
      const url = isMe ? '/users/me/favorites' : `/users/${userId}/favorites`;
      const res = await api.get<FavoritesResponse>(url);
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
