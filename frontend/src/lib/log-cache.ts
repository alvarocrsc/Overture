import type { QueryClient } from '@tanstack/react-query';

import type { MediaType } from '@/src/types/lists.types';

/** The title whose logged state changed. */
export interface LogCacheTarget {
  mediaType: MediaType;
  tmdbId: number;
}

/**
 * Invalidates every cached surface that reflects what a user has logged, so a
 * new log or a deletion is visible app-wide without a manual refresh.
 *
 * Kept in one place because writing and deleting must refresh the same set —
 * two hand-maintained lists would drift, leaving stale counts behind after a
 * delete. Keys are matched by prefix, so `['watchlist']` also covers
 * `['watchlist', 'membership']`.
 */
export function invalidateLogCaches(
  queryClient: QueryClient,
  target: LogCacheTarget,
): void {
  queryClient.invalidateQueries({
    queryKey: [target.mediaType === 'film' ? 'film' : 'series', target.tmdbId],
  });
  queryClient.invalidateQueries({ queryKey: ['watchlist'] });
  queryClient.invalidateQueries({ queryKey: ['logged', 'membership'] });
  queryClient.invalidateQueries({ queryKey: ['stats'] });
  queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
  queryClient.invalidateQueries({ queryKey: ['ratings'] });
  queryClient.invalidateQueries({ queryKey: ['rating-distribution'] });
  queryClient.invalidateQueries({ queryKey: ['profile'] });
  queryClient.invalidateQueries({ queryKey: ['friends-activity'] });
  queryClient.invalidateQueries({ queryKey: ['divides'] });
}
