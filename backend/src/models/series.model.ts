export interface Series {
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
  cached_at: Date;
}
