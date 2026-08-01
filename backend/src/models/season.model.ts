/**
 * A cached TMDB season belonging to a series.
 *
 * Season summaries come free with the `/tv/{id}` detail response, so these
 * rows are written eagerly whenever a series is cached. The episodes inside
 * them are cached separately and lazily — see `season-cache.service`.
 */
export interface Season {
  id: number;
  series_id: number;
  tmdb_season_id: number;
  season_number: number;
  name: string | null;
  overview: string | null;
  poster_path: string | null;
  air_date: string | null;
  episode_count: number | null;
  cached_at: string;
}
