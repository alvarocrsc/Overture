export interface Film {
  id: number;
  tmdb_id: number;
  title: string;
  original_title: string | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  runtime_min: number | null;
  original_language: string | null;
  tmdb_rating: number | null;
  tmdb_popularity: number | null;
  cached_at: Date;
}
