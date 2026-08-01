/** A cached TMDB episode belonging to a season. */
export interface Episode {
  id: number;
  season_id: number;
  series_id: number;
  tmdb_episode_id: number;
  season_number: number;
  episode_number: number;
  name: string | null;
  overview: string | null;
  still_path: string | null;
  air_date: string | null;
  runtime_min: number | null;
  tmdb_rating: number | null;
  cached_at: string;
}

/**
 * A user's log of a single episode.
 *
 * Deliberately separate from `ratings`: episodes are scored 0.0-10.0 while
 * films and series use the 0.5-5.0 star scale, and the two scales must never
 * share a column. `value` is nullable so an episode can be marked watched
 * without being rated — which is what the bulk "log entire season" action does.
 */
export interface EpisodeRating {
  id: number;
  user_id: number;
  episode_id: number;
  value: number | null;
  is_rewatch: boolean;
  watched_on: string | null;
  created_at: string;
  updated_at: string;
}

/** An optional written review attached to an episode log. */
export interface EpisodeReview {
  id: number;
  episode_rating_id: number;
  user_id: number;
  body: string;
  contains_spoilers: boolean;
  created_at: string;
  updated_at: string;
}
