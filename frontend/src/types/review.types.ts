/**
 * Shared types for the review screen. These mirror the backend response shapes
 * exactly (see `reviews.service.ts`).
 */

/**
 * How a log entry is addressed. Reviews are the usual case; ratings are used
 * for the signed-in user's own logs, which open the screen even when nothing
 * was written.
 */
export type LogEntrySource = 'review' | 'rating';

/** One image attached to a review. */
export interface ReviewBackdrop {
  url: string;
  position: number;
}

/**
 * A log entry: the rating, plus the review written about it when there is one.
 * `id` is the review's primary key and is null for a rating with no review —
 * everything below it (body, likes, comments, backdrops) is then empty.
 */
export interface LogEntryDetail {
  id: number | null;
  rating_id: number;
  user_id: number;
  username: string;
  avatar_url: string | null;
  value: number;
  body: string;
  contains_spoilers: boolean;
  liked_title: boolean;
  likes_count: number;
  created_at: string;
  updated_at: string;
  watched_on: string | null;
  is_rewatch: boolean;
  is_liked: boolean;
  film_tmdb_id: number | null;
  film_title: string | null;
  film_poster: string | null;
  film_backdrop_path: string | null;
  film_year: string | null;
  film_director: string | null;
  series_tmdb_id: number | null;
  series_title: string | null;
  series_poster: string | null;
  series_backdrop_path: string | null;
  series_year: string | null;
  series_creator: string | null;
  backdrops: ReviewBackdrop[];
}
