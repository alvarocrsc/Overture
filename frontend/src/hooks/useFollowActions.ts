import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';

interface FollowActions {
  isFollowing: boolean;
  isPending: boolean;
  toggle: () => Promise<void>;
}

/**
 * Manages follow/unfollow state for a target user. Optimistically
 * flips local state, calls the backend, then invalidates the target
 * profile and the viewer's own profile so follower/following counts
 * refresh on both sides.
 *
 * @param targetUserId - The user being followed/unfollowed.
 * @param initialIsFollowing - Server-provided initial follow state.
 */
export function useFollowActions(
  targetUserId: number,
  initialIsFollowing: boolean,
): FollowActions {
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState<boolean>(initialIsFollowing);
  const [isPending, setIsPending] = useState<boolean>(false);

  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  const toggle = useCallback(async (): Promise<void> => {
    if (isPending) return;
    const next = !isFollowing;
    setIsFollowing(next);
    setIsPending(true);
    try {
      if (next) {
        await api.post(`/users/${targetUserId}/follow`);
      } else {
        await api.delete(`/users/${targetUserId}/follow`);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile', targetUserId] }),
        queryClient.invalidateQueries({ queryKey: ['profile', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['friends-activity'] }),
      ]);
    } catch {
      setIsFollowing(!next);
    } finally {
      setIsPending(false);
    }
  }, [isFollowing, isPending, queryClient, targetUserId]);

  return { isFollowing, isPending, toggle };
}
