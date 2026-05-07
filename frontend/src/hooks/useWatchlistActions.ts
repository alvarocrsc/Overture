import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';

interface AddPayload {
  tmdbId: number;
  type: 'film' | 'series';
}

/**
 * Provides a mutation for adding a film or series to the current
 * user's watchlist. Invalidates the cached watchlist on success.
 */
export function useWatchlistActions() {
  const qc = useQueryClient();

  const add = useMutation({
    mutationFn: async ({ tmdbId, type }: AddPayload): Promise<void> => {
      await api.post('/watchlist', { tmdb_id: tmdbId, type });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  return {
    addToWatchlist: (tmdbId: number, type: 'film' | 'series') =>
      add.mutate({ tmdbId, type }),
    isAdding: add.isPending,
  };
}
