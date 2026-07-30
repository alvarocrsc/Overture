import { useCallback, useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import api from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';

export interface WatchlistMembershipRow {
  id: number;
  tmdb_id: number;
  media_type: 'film' | 'series';
}

export const WATCHLIST_MEMBERSHIP_KEY = ['watchlist', 'membership'] as const;

/**
 * A full watchlist entry joined with its film/series data. Mirrors the backend
 * `WatchlistRow` shape and carries everything the shared list components need
 * to render the watchlist exactly like a list (poster, backdrop, overview,
 * year and director/creator credit for the expanded view).
 */
export interface WatchlistItemRow {
  id: number;
  priority: number;
  added_at: string;
  film_tmdb_id: number | null;
  film_title: string | null;
  film_poster: string | null;
  film_backdrop: string | null;
  film_overview: string | null;
  film_release_date: string | null;
  film_release_year: number | null;
  film_director: string | null;
  film_runtime_min: number | null;
  series_tmdb_id: number | null;
  series_title: string | null;
  series_poster: string | null;
  series_backdrop: string | null;
  series_overview: string | null;
  series_first_air_date: string | null;
  series_first_air_year: number | null;
  series_creator: string | null;
  series_number_of_seasons: number | null;
}

interface WatchlistPageResponse {
  data: WatchlistItemRow[];
  total: number;
  page: number;
  limit: number;
}

/** Query key for the full watchlist listing (all entries). */
export const WATCHLIST_ITEMS_KEY = ['watchlist', 'items'] as const;

/** Backend clamps `limit` to 100, so page through until every entry is loaded. */
const WATCHLIST_PAGE_SIZE = 100;

/**
 * Fetches every entry on the current user's watchlist by walking the paginated
 * endpoint until it is exhausted. A watchlist is personal and typically fits in
 * a single page, so this is usually one request — but it stays correct for the
 * rare oversized watchlist, mirroring how a list loads all of its items at once.
 */
async function fetchAllWatchlistItems(): Promise<WatchlistItemRow[]> {
  const all: WatchlistItemRow[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const res = await api.get<WatchlistPageResponse>('/watchlist', {
      params: { page, limit: WATCHLIST_PAGE_SIZE },
    });
    all.push(...res.data.data);
    const loaded = res.data.page * res.data.limit;
    hasMore = res.data.data.length > 0 && loaded < res.data.total;
    page += 1;
  }
  return all;
}

/**
 * Loads the current user's full watchlist (all entries, priority-ordered).
 *
 * Keyed under `['watchlist', 'items']` so it is invalidated by the same
 * `['watchlist']` cache busts every save / unsave control already fires —
 * bookmarking a title anywhere refreshes the watchlist screen automatically.
 *
 * Disabled when the user is not signed in.
 */
export function useWatchlistItems(): UseQueryResult<WatchlistItemRow[]> {
  const { user } = useAuth();
  return useQuery({
    queryKey: WATCHLIST_ITEMS_KEY,
    queryFn: fetchAllWatchlistItems,
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

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
