import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';

export interface WatchlistMembershipRow {
  id: number;
  tmdb_id: number;
  media_type: 'film' | 'series';
}

export const WATCHLIST_MEMBERSHIP_KEY = ['watchlist', 'membership'] as const;

/**
 * Loads the lightweight watchlist membership table for the current user.
 * This is the single source of truth used by every "save to watchlist"
 * surface in the app — film/series detail headers, Discover trending,
 * Log search results, and Log recent searches.
 *
 * Disabled when the user is not signed in.
 */
export function useWatchlistMembership() {
  const { user } = useAuth();
  return useQuery({
    queryKey: WATCHLIST_MEMBERSHIP_KEY,
    queryFn: async (): Promise<WatchlistMembershipRow[]> => {
      const res = await api.get<{ data: WatchlistMembershipRow[] }>(
        '/watchlist/membership',
      );
      return res.data.data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

interface Fallback {
  inWatchlist: boolean;
  watchlistId: number | null;
}

interface ToggleResult {
  inWatchlist: boolean;
  watchlistId: number | null;
  toggle: () => void;
  isPending: boolean;
}

/**
 * Returns the shared watchlist state + a toggle function for a single
 * (tmdbId, mediaType) pair. Used by every save / unsave control in the
 * app so a toggle in one surface is reflected in every other surface
 * immediately via the shared `['watchlist','membership']` cache.
 *
 * @param tmdbId - TMDB id of the title.
 * @param mediaType - 'film' or 'series'.
 * @param fallback - Optional initial state (e.g. from the detail
 *   endpoint) used until the membership query has loaded.
 */
export function useWatchlistToggle(
  tmdbId: number,
  mediaType: 'film' | 'series',
  fallback?: Fallback,
): ToggleResult {
  const qc = useQueryClient();
  const { data: membership, isSuccess } = useWatchlistMembership();

  const match = useMemo(() => {
    if (!membership) return null;
    return (
      membership.find(
        (m) => m.tmdb_id === tmdbId && m.media_type === mediaType,
      ) ?? null
    );
  }, [membership, tmdbId, mediaType]);

  const inWatchlist = isSuccess
    ? match !== null
    : (fallback?.inWatchlist ?? false);
  const watchlistId = isSuccess
    ? (match?.id ?? null)
    : (fallback?.watchlistId ?? null);

  const invalidateAffected = useCallback((): void => {
    qc.invalidateQueries({ queryKey: WATCHLIST_MEMBERSHIP_KEY });
    qc.invalidateQueries({ queryKey: ['watchlist'] });
    qc.invalidateQueries({
      queryKey: mediaType === 'film' ? ['film', tmdbId] : ['series', tmdbId],
    });
  }, [qc, tmdbId, mediaType]);

  const optimisticAdd = useCallback((): WatchlistMembershipRow[] => {
    const current = qc.getQueryData<WatchlistMembershipRow[]>(
      WATCHLIST_MEMBERSHIP_KEY,
    );
    const next: WatchlistMembershipRow[] = [
      ...(current ?? []),
      { id: -tmdbId, tmdb_id: tmdbId, media_type: mediaType },
    ];
    qc.setQueryData(WATCHLIST_MEMBERSHIP_KEY, next);
    return current ?? [];
  }, [qc, tmdbId, mediaType]);

  const optimisticRemove = useCallback((): WatchlistMembershipRow[] => {
    const current = qc.getQueryData<WatchlistMembershipRow[]>(
      WATCHLIST_MEMBERSHIP_KEY,
    );
    const next = (current ?? []).filter(
      (m) => !(m.tmdb_id === tmdbId && m.media_type === mediaType),
    );
    qc.setQueryData(WATCHLIST_MEMBERSHIP_KEY, next);
    return current ?? [];
  }, [qc, tmdbId, mediaType]);

  const addMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const payload =
        mediaType === 'film' ? { film_id: tmdbId } : { series_id: tmdbId };
      await api.post('/watchlist', payload);
    },
    onMutate: optimisticAdd,
    onError: (_err, _vars, snapshot) => {
      if (snapshot) qc.setQueryData(WATCHLIST_MEMBERSHIP_KEY, snapshot);
    },
    onSettled: invalidateAffected,
  });

  const removeMutation = useMutation({
    mutationFn: async (rowId: number): Promise<void> => {
      await api.delete(`/watchlist/${rowId}`);
    },
    onMutate: optimisticRemove,
    onError: (_err, _vars, snapshot) => {
      if (snapshot) qc.setQueryData(WATCHLIST_MEMBERSHIP_KEY, snapshot);
    },
    onSettled: invalidateAffected,
  });

  const toggle = useCallback((): void => {
    if (addMutation.isPending || removeMutation.isPending) return;
    if (inWatchlist && watchlistId != null) {
      removeMutation.mutate(watchlistId);
    } else if (!inWatchlist) {
      addMutation.mutate();
    }
  }, [addMutation, removeMutation, inWatchlist, watchlistId]);

  return {
    inWatchlist,
    watchlistId,
    toggle,
    isPending: addMutation.isPending || removeMutation.isPending,
  };
}
