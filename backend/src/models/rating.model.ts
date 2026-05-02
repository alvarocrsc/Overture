export interface Rating {
  id: number;
  user_id: number;
  film_id: number | null;
  series_id: number | null;
  rating: number;
  watched_on: string | null;
  is_rewatch: boolean;
  letterboxd_uri: string | null;
  import_job_id: number | null;
  created_at: Date;
  updated_at: Date;
}
