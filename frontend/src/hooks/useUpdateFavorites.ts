import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';

/** Body shape for a single favorite slot — must match the backend validator. */
export interface FavoriteInput {
  position: 1 | 2 | 3 | 4;
  tmdb_id: number;
  media_type: 'film' | 'series';
}

export function useUpdateFavorites() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (favorites: FavoriteInput[]): Promise<void> => {
      await api.put('/users/me/favorites', { items: favorites });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-favorites', 'me'] });
    },
  });
}
