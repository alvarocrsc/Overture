import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import type { UserProfile } from '@/src/types/profile.types';

interface ProfileResponse {
  data: UserProfile;
}

/**
 * Fetches a user's public profile from `GET /users/:id`.
 * Disabled when `userId` is undefined or non-positive.
 *
 * @param userId - Numeric user id.
 */
export function useProfile(
  userId: number | undefined,
): UseQueryResult<UserProfile> {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: typeof userId === 'number' && userId > 0,
    queryFn: async (): Promise<UserProfile> => {
      const res = await api.get<ProfileResponse>(`/users/${userId!}`);
      return res.data.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetches the authenticated user's own profile from `GET /users/me`.
 * Disabled until the auth context has a user.
 */
export function useMyProfile(): UseQueryResult<UserProfile> {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', 'me', user?.id],
    enabled: user != null,
    queryFn: async (): Promise<UserProfile> => {
      const res = await api.get<ProfileResponse>('/users/me');
      return res.data.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}
