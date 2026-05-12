import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';

export interface LoggedMembershipRow {
  tmdb_id: number;
  media_type: 'film' | 'series';
}

export const LOGGED_MEMBERSHIP_KEY = ['logged', 'membership'] as const;

/**
 * Loads the lightweight "what have I logged" lookup table for the current
 * user. Single source of truth for the log/tick icon across the Log
 * screen (recents + active search) and the Discover trending carousel.
 */
export function useLoggedMembership() {
  const { user } = useAuth();
  return useQuery({
    queryKey: LOGGED_MEMBERSHIP_KEY,
    queryFn: async (): Promise<LoggedMembershipRow[]> => {
      const res = await api.get<{ data: LoggedMembershipRow[] }>(
        '/ratings/me/logged',
      );
      return res.data.data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Returns whether a single (tmdbId, mediaType) appears in the shared
 * logged-membership cache. Falls back to `false` while the query is
 * loading or the user is not signed in.
 *
 * @param tmdbId - TMDB id of the title.
 * @param mediaType - 'film' or 'series'.
 * @param fallback - Optional initial state (e.g. from the detail
 *   endpoint) used until the membership query has loaded.
 */
export function useLoggedStatus(
  tmdbId: number,
  mediaType: 'film' | 'series',
  fallback?: boolean,
): boolean {
  const { data, isSuccess } = useLoggedMembership();
  return useMemo<boolean>(() => {
    if (!isSuccess) return fallback ?? false;
    return (
      data?.some(
        (m) => m.tmdb_id === tmdbId && m.media_type === mediaType,
      ) ?? false
    );
  }, [data, isSuccess, tmdbId, mediaType, fallback]);
}
