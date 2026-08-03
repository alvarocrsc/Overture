/**
 * Shape returned by GET /api/v1/users/:id and GET /api/v1/users/me.
 * The profile screen is composed entirely from this object plus a few
 * auxiliary endpoints (favorites, recent activity, rating distribution).
 */
/**
 * Which scale a user sees ratings in. A display choice only — every rating is
 * stored on the canonical 0.0-10.0 scale regardless. Episodes follow the
 * series setting.
 */
export type RatingFormat = 'stars' | 'numeric';

export interface UserProfile {
  id: number;
  username: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  accent_color: string;
  profile_backdrop_tmdb_id: number | null;
  /**
   * Which table the banner id points at. TMDB numbers films and series
   * independently, so the id alone does not identify a title. Null on a row
   * set before the column existed.
   */
  profile_backdrop_media_type: 'film' | 'series' | null;
  profile_backdrop_path: string | null;
  film_rating_format: RatingFormat;
  series_rating_format: RatingFormat;
  followers_count: number;
  following_count: number;
  films_count: number;
  series_count: number;
  watchlist_count: number;
  reviews_count: number;
  lists_count: number;
  diary_count: number;
  diary_this_year: number;
  films_this_year: number;
  series_this_year: number;
  is_following?: boolean;
}

/**
 * One selectable profile banner image, from GET /users/me/backdrop-options.
 *
 * Keyed by title rather than image path: the banner stores
 * `profile_backdrop_tmdb_id`, so what gets shown is always the title's primary
 * backdrop. `rating` is the user's own score, null for an unrated search hit.
 */
export interface BackdropOption {
  tmdb_id: number;
  media_type: 'film' | 'series';
  title: string;
  backdrop_path: string;
  rating: number | null;
}

/** Single entry on the user's pinned 4-favorites row. */
export interface UserFavorite {
  position: 1 | 2 | 3 | 4;
  film_id: number | null;
  series_id: number | null;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  media_type: 'film' | 'series';
}

/** A film or series log entry shown on the recent activity row. */
export interface RecentActivityItem {
  id: number;
  rating_value: number;
  is_rewatch: boolean;
  watched_on: string;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  media_type: 'film' | 'series';
  review_id?: number | null;
}
