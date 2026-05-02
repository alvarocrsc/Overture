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
  tmdb_rating: number | null;
  tmdb_vote_count: number | null;
  popularity: number | null;
  tagline: string | null;
  status: string | null;
  original_language: string | null;
  cached_at: Date;
}
