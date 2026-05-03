/** A film as returned by TMDB list/search endpoints (trending, now_playing, search/movie). */
export interface TmdbMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  /** Runtime in minutes. Only present on detail endpoint — null on list responses. */
  runtime: number | null;
  original_language: string;
  vote_average: number;
  popularity: number;
}

/** Full film detail returned by TMDB's /movie/{id} endpoint. */
export interface TmdbMovieDetail extends TmdbMovie {
  genres: Array<{ id: number; name: string }>;
  runtime: number;
}

/** A single image asset from TMDB (backdrop, poster, or logo). */
export interface TmdbImage {
  file_path: string;
  width: number;
  height: number;
  /** Language the image is labelled for, or null for language-neutral images. */
  iso_639_1: string | null;
  vote_average: number;
}

/** Image assets for a film as returned by TMDB's /movie/{id}/images endpoint. */
export interface TmdbImageResult {
  backdrops: TmdbImage[];
  posters: TmdbImage[];
  logos: TmdbImage[];
}

/** A single cast member from TMDB's credits endpoint. */
export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
  popularity: number;
}

/** A single crew member from TMDB's credits endpoint. */
export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
  popularity: number;
}

/** Cast and crew for a film as returned by TMDB's /movie/{id}/credits endpoint. */
export interface TmdbCreditsResult {
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

// ─── Series (TV) types ────────────────────────────────────────────────────────

/**
 * A TV series as returned by TMDB list/search endpoints
 * (trending/tv, tv/on_the_air, search/tv).
 */
export interface TmdbSeries {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  /** Average episode runtime in minutes per episode. May be absent on list responses. */
  episode_run_time: number[] | undefined;
  original_language: string;
  vote_average: number;
  popularity: number;
}

/** Full series detail returned by TMDB's /tv/{id} endpoint. */
export interface TmdbSeriesDetail extends TmdbSeries {
  genres: Array<{ id: number; name: string }>;
  last_air_date: string | null;
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
}

/**
 * Image assets for a series as returned by TMDB's /tv/{id}/images endpoint.
 * Reuses TmdbImageResult since the shape is identical.
 */
export type TmdbSeriesImageResult = TmdbImageResult;

/**
 * A single TV cast member. TMDB uses `character` on TV credits too.
 * Reuses TmdbCastMember since the shape is identical.
 */
export type TmdbSeriesCastMember = TmdbCastMember;

/**
 * A single TV crew member.
 * Reuses TmdbCrewMember since the shape is identical.
 */
export type TmdbSeriesCrewMember = TmdbCrewMember;

/**
 * Cast and crew for a series as returned by TMDB's /tv/{id}/credits endpoint.
 * Reuses TmdbCreditsResult since the shape is identical.
 */
export type TmdbSeriesCreditsResult = TmdbCreditsResult;

// ─── Search response types ────────────────────────────────────────────────────

/** Paginated movie search response from TMDB's /search/movie endpoint. */
export interface TmdbSearchResponse {
  results: TmdbMovie[];
  total_results: number;
  total_pages: number;
}

/** Paginated TV search response from TMDB's /search/tv endpoint. */
export interface TmdbTvSearchResponse {
  results: TmdbSeries[];
  total_results: number;
  total_pages: number;
}

/** A person as returned by TMDB's /search/person endpoint. */
export interface TmdbPerson {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
  known_for: Array<{ title?: string; name?: string; media_type: string }>;
}

/** Paginated person search response from TMDB's /search/person endpoint. */
export interface TmdbPersonSearchResponse {
  results: TmdbPerson[];
  total_results: number;
  total_pages: number;
}
