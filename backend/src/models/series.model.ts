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
  episode_count: number | null;
  season_count: number | null;
  runtime_min: number | null;
  tmdb_rating: number | null;
  tmdb_vote_count: number | null;
  popularity: number | null;
  status: string | null;
  original_language: string | null;
  cached_at: Date;
}
