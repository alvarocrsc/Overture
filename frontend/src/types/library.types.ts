import type { MediaType } from '@/src/types/lists.types';

/**
 * A single logged title (film or series) shown in the library poster grid:
 * the poster, the user's star rating, and the like / review state that drive
 * the icons beneath each poster.
 */
export interface LoggedTitle {
  /** The `ratings` row id — stable list key. */
  ratingId: number;
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  /** Star value 0.5–5.0 the user gave this title. */
  ratingValue: number;
  /** True when the user currently likes the title (from `title_likes`). */
  isLiked: boolean;
  /**
   * The user's review for this title, or null if they never wrote one. Drives
   * both the review icon and whether tapping opens the review or the title.
   * One per title under the current schema (see useLoggedTitles).
   */
  reviewId: number | null;
}
