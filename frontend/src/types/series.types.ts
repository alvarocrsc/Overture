import type { Genre, TmdbImage } from './film.types';

/** Full series detail returned by GET /series/:tmdbId. */
export interface SeriesDetail {
  id: number;
  tmdb_id: number;
  title: string;
  original_title: string | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string | null;
  last_air_date: string | null;
  seasons_count: number | null;
  episodes_count: number | null;
  episode_runtime: number | null;
  status: string | null;
  original_language: string | null;
  tmdb_rating: number | null;
  tmdb_popularity: number | null;
  cached_at: string;
  genres: Genre[];
  custom_poster_path: string | null;
  custom_backdrop_path: string | null;
  is_logged: boolean;
  is_in_watchlist: boolean;
  /** ID of the watchlist row when is_in_watchlist is true, else null. */
  watchlist_id: number | null;
  is_liked: boolean;
  user_rating: number | null;
  user_log_count: number;
}

/** Categorised image assets returned by GET /series/:tmdbId/images. */
export interface SeriesImages {
  titledBackdrops: TmdbImage[];
  cleanBackdrops: TmdbImage[];
  posters: TmdbImage[];
  logos: TmdbImage[];
}

export interface SeriesDistributionBin {
  value: number;
  count: number;
}

export interface SeriesDistribution {
  distribution: SeriesDistributionBin[];
  average: number | null;
}

export interface SeriesCastMember {
  person_tmdb_id: number;
  person_name: string;
  character_name: string | null;
  cast_order: number | null;
  profile_path: string | null;
  popularity: number | null;
}

export interface SeriesDirector {
  person_tmdb_id: number;
  person_name: string;
  profile_path: string | null;
  popularity: number | null;
}

/**
 * A crew member from GET /series/:tmdbId/credits. 
 */
export interface SeriesCrewMember {
  person_tmdb_id: number;
  person_name: string;
  job: string;
  department: string;
  profile_path: string | null;
  popularity: number | null;
}

export interface SeriesCredits {
  directors: SeriesDirector[];
  cast: SeriesCastMember[];
  crew: SeriesCrewMember[];
}

export interface SeriesWatchedByRow {
  user_id: number;
  username: string;
  avatar_url: string | null;
  rating: number | null;
  is_rewatch: boolean;
  has_review: boolean;
  review_id: number | null;
}

export interface SeriesWatchlistedByRow {
  user_id: number;
  username: string;
  avatar_url: string | null;
}

export interface SeriesMyLogRow {
  id: number;
  value: number;
  watched_on: string | null;
  is_rewatch: boolean;
  review_id: number | null;
  created_at: string;
}

export interface SeriesDisplayPrefs {
  custom_poster_path: string | null;
  custom_backdrop_path: string | null;
}
