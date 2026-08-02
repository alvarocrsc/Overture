import { useAuth } from '@/src/context/AuthContext';
import type { MediaType } from '@/src/types/lists.types';
import type { RatingFormat } from '@/src/types/profile.types';

/** Defaults applied when signed out, matching the database column defaults. */
const DEFAULT_FILM_FORMAT: RatingFormat = 'stars';
const DEFAULT_SERIES_FORMAT: RatingFormat = 'numeric';

/**
 * The scale the current viewer wants ratings shown in for a given media type.
 *
 * This is the viewer's lens, not a property of the rating: a rating made by
 * someone else still renders in *your* chosen format wherever you see it.
 * Episodes deliberately have no setting of their own — they follow series, so
 * a season and its episodes never disagree.
 *
 * @param mediaType - Whose setting applies. Episodes pass 'series'.
 * @returns The format to render in.
 */
export function useRatingFormat(mediaType: MediaType): RatingFormat {
  const { user } = useAuth();

  if (mediaType === 'film') {
    return user?.film_rating_format ?? DEFAULT_FILM_FORMAT;
  }
  return user?.series_rating_format ?? DEFAULT_SERIES_FORMAT;
}
