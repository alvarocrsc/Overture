import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';

import api from '@/src/lib/api';
import type { BackdropOption, UserProfile } from '@/src/types/profile.types';

interface ProfileResponse {
  data: UserProfile;
}

/** The title to show behind the banner, or null to clear it. */
export type ProfileBackdropSelection = Pick<
  BackdropOption,
  'tmdb_id' | 'media_type'
> | null;

/**
 * Sets (or clears) the title whose backdrop shows behind the profile banner.
 *
 * The media type travels with the id because TMDB numbers films and series
 * independently — without it a series could resolve to an unrelated film that
 * happens to share its id. Clearing sends only null; the backend drops the
 * type alongside it.
 *
 * Only the id pair is stored. The backend resolves the image from its films /
 * series cache on every profile read, so a title must be cached before it can
 * be chosen — rated titles are by definition, and searching upserts its results.
 */
export function useUpdateProfileBackdrop(): UseMutationResult<
  UserProfile,
  Error,
  ProfileBackdropSelection
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      selection: ProfileBackdropSelection,
    ): Promise<UserProfile> => {
      const res = await api.put<ProfileResponse>('/users/me', {
        profile_backdrop_tmdb_id: selection?.tmdb_id ?? null,
        ...(selection ? { profile_backdrop_media_type: selection.media_type } : {}),
      });
      return res.data.data;
    },
    onSuccess: () => {
      // Covers both ['profile', 'me', id] and ['profile', id] — the banner is
      // rendered from whichever the viewing screen happens to hold.
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
