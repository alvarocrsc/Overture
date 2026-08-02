import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import api from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import type { RatingFormat, UserProfile } from '@/src/types/profile.types';

/** Patch accepted by the rating format mutation. Omitted fields keep their value. */
export interface RatingFormatPatch {
  film_rating_format?: RatingFormat;
  series_rating_format?: RatingFormat;
}

interface ProfileResponse {
  data: UserProfile;
}

/**
 * Updates which scale the user sees ratings in.
 *
 * The format is a display lens applied everywhere at once, so on success this
 * refreshes the auth user (which every `useRatingFormat` call reads from) and
 * invalidates the profile queries that render ratings.
 */
export function useUpdateRatingFormat(): UseMutationResult<
  UserProfile,
  Error,
  RatingFormatPatch
> {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();

  return useMutation({
    mutationFn: async (patch: RatingFormatPatch): Promise<UserProfile> => {
      const res = await api.put<ProfileResponse>('/users/me', patch);
      return res.data.data;
    },
    onSuccess: (profile) => {
      updateUser({
        film_rating_format: profile.film_rating_format,
        series_rating_format: profile.series_rating_format,
      });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
