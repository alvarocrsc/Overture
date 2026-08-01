/**
 * Shared types for the episode ratings feature. These mirror the backend
 * response shapes exactly.
 *
 * Note the scale: episodes are rated 0.0-10.0, unlike films and series which
 * use 0.5-5.0 stars. The two never mix.
 */

/** Whose ratings a view reflects: the signed-in user's, or the app-wide average. */
export type RatingSource = 'user' | 'app';

/** One season's row in the seasons carousel. */
export interface SeasonSummary {
  season_number: number;
  name: string | null;
  poster_path: string | null;
  episode_count: number;
  /** How many episodes of this season the signed-in user has logged. */
  watched_count: number;
  avg_rating: number | null;
}

/** A single populated cell of the episode ratings grid. */
export interface GridCell {
  season_number: number;
  episode_number: number;
  value: number;
}

/** Watch-progress pointer: the furthest episode the user has logged. */
export interface CurrentEpisodePointer {
  season_number: number;
  episode_number: number;
  still_path: string | null;
}

/**
 * Sparse grid payload — only cells carrying a value are sent. Grid dimensions
 * come from the season summaries, and anything absent renders as an empty cell.
 */
export interface EpisodeRatingsGrid {
  cells: GridCell[];
  currentEpisode: CurrentEpisodePointer | null;
}

/** One episode row in an expanded season's list. */
export interface EpisodeListRow {
  id: number;
  episode_number: number;
  name: string | null;
  overview: string | null;
  still_path: string | null;
  air_date: string | null;
  runtime_min: number | null;
  value: number | null;
  is_logged: boolean;
}

/** Body accepted by POST /episode-ratings. */
export interface CreateEpisodeRatingPayload {
  tmdb_series_id: number;
  season_number: number;
  episode_number: number;
  /** Null marks the episode watched without rating it. */
  value: number | null;
  watched_on?: string | null;
  is_rewatch?: boolean;
  review?: { body: string; contains_spoilers: boolean } | null;
}
