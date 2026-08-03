import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import api from '@/src/lib/api';
import { invalidateLogCaches, type LogCacheTarget } from '@/src/lib/log-cache';
import type { LogEntryDetail, LogEntrySource } from '@/src/types/review.types';

interface SingleResponse<T> {
  data: T;
}

/** Query keys for the review screen's own data. */
export const logEntryKeys = {
  entry: (source: LogEntrySource, id: number) =>
    ['log-entry', source, id] as const,
  comments: (reviewId: number) => ['review-comments', reviewId] as const,
};

/**
 * Loads the log entry behind the review screen, addressed either by review id
 * or — for the signed-in user's own logs, which open even when nothing was
 * written — by rating id.
 *
 * @param id - The review or rating primary key; the query is idle while null.
 * @param source - Which of the two `id` refers to.
 */
export function useLogEntry(
  id: number | null,
  source: LogEntrySource,
): UseQueryResult<LogEntryDetail> {
  return useQuery({
    queryKey: logEntryKeys.entry(source, id ?? -1),
    enabled: id != null,
    queryFn: async (): Promise<LogEntryDetail> => {
      const path =
        source === 'rating' ? `/reviews/by-rating/${id}` : `/reviews/${id}`;
      const res = await api.get<SingleResponse<LogEntryDetail>>(path);
      return res.data.data;
    },
  });
}

/** What the delete mutation needs to clean up after itself. */
export interface DeleteLogEntryVars extends LogCacheTarget {
  ratingId: number;
}

/**
 * Deletes a log entry — the rating, and with it any review attached to it.
 *
 * The rating is the row that gets deleted even when the entry has a review:
 * `reviews.rating_id` cascades, so removing the rating takes the review, its
 * media, likes and comments with it. Deleting the review alone would strand a
 * rating the user meant to be rid of.
 *
 * The entry's own cache is deliberately left untouched so the screen can stay
 * rendered through its dismissal animation instead of refetching a row that no
 * longer exists.
 */
export function useDeleteLogEntry(): UseMutationResult<
  void,
  Error,
  DeleteLogEntryVars
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ratingId }: DeleteLogEntryVars): Promise<void> => {
      await api.delete(`/ratings/${ratingId}`);
    },
    onSuccess: (_result, { mediaType, tmdbId }) => {
      invalidateLogCaches(queryClient, { mediaType, tmdbId });
    },
  });
}
