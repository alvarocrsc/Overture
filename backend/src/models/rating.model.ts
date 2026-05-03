export interface Rating {
  id: number;
  user_id: number;
  film_id: number | null;
  series_id: number | null;
  import_job_id: number | null;
  value: number;
  is_rewatch: boolean;
  watched_on: string | null;
  letterboxd_uri: string | null;
  created_at: Date;
  updated_at: Date;
}
