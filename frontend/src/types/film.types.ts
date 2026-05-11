/**
 * TMDB image metadata as returned by the /images endpoints.
 */
export interface TmdbImage {
  file_path: string;
  width: number;
  height: number;
  iso_639_1: string | null;
  vote_average: number;
}

/**
 * Genre tag attached to a film or series.
 */
export interface Genre {
  id: number;
  name: string;
}

/**
 * Full film detail returned by GET /films/:tmdbId.
 */
export interface FilmDetail {
  id: number;
  tmdb_id: number;
  title: string;
  original_title: string | null;
  tagline: string | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  runtime_min: number | null;
  original_language: string | null;
  tmdb_rating: number | null;
  tmdb_popularity: number | null;
  cached_at: string;
  genres: Genre[];
  director: string | null;
  /** Custom poster path saved by the authenticated user, if any. */
  custom_poster_path: string | null;
  /** Custom backdrop path saved by the authenticated user, if any. */
  custom_backdrop_path: string | null;
  is_logged: boolean;
  is_in_watchlist: boolean;
  /** ID of the watchlist row when is_in_watchlist is true, else null. */
  watchlist_id: number | null;
  is_liked: boolean;
  /** Latest rating value from the authenticated user, or null. */
  user_rating: number | null;
  /** How many times the authenticated user has logged this film. */
  user_log_count: number;
}

/**
 * Categorised image assets returned by GET /films/:tmdbId/images.
 */
export interface FilmImages {
  /** Backdrops with English title. */
  titledBackdrops: TmdbImage[];
  /** Language-neutral backdrops. */
  cleanBackdrops: TmdbImage[];
  posters: TmdbImage[];
  logos: TmdbImage[];
}

export interface FilmDistributionBin {
  value: number;
  count: number;
}

/** Response shape for GET /films/:tmdbId/distribution. */
export interface FilmDistribution {
  distribution: FilmDistributionBin[];
  /** App-wide average rating, excluding rewatches. Null when no ratings exist. */
  average: number | null;
}

/** A cast member returned by GET /films/:tmdbId/credits. */
export interface FilmCastMember {
  person_tmdb_id: number;
  person_name: string;
  character_name: string | null;
  cast_order: number | null;
  profile_path: string | null;
  popularity: number | null;
}

/** A director returned by GET /films/:tmdbId/credits. */
export interface FilmDirector {
  person_tmdb_id: number;
  person_name: string;
  profile_path: string | null;
  popularity: number | null;
}

/**
 * A crew member returned by GET /films/:tmdbId/credits. Each entry represents
 * a single (person, job) pairing so the same person can appear once per role.
 */
export interface FilmCrewMember {
  person_tmdb_id: number;
  person_name: string;
  job: string;
  department: string;
  profile_path: string | null;
  popularity: number | null;
}

/** Response shape for GET /films/:tmdbId/credits. */
export interface FilmCredits {
  directors: FilmDirector[];
  cast: FilmCastMember[];
  crew: FilmCrewMember[];
}

/** A single entry in the "watched by" list. */
export interface FilmWatchedByRow {
  user_id: number;
  username: string;
  avatar_url: string | null;
  rating: number | null;
  is_rewatch: boolean;
  has_review: boolean;
  review_id: number | null;
}

/** A single entry in the "want to watch" list. */
export interface FilmWatchlistedByRow {
  user_id: number;
  username: string;
  avatar_url: string | null;
}

/** A single rating row in the authenticated user's log history for a film. */
export interface FilmMyLogRow {
  id: number;
  value: number;
  watched_on: string | null;
  is_rewatch: boolean;
  review_id: number | null;
  created_at: string;
}

/** Custom display paths the authenticated user has saved for a title. */
export interface FilmDisplayPrefs {
  custom_poster_path: string | null;
  custom_backdrop_path: string | null;
}
