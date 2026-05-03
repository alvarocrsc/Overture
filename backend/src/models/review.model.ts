export interface Review {
  id: number;
  rating_id: number;
  user_id: number;
  import_job_id: number | null;
  body: string;
  contains_spoilers: boolean;
  liked_title: boolean;
  likes_count: number;
  original_date: string | null;
  created_at: Date;
  updated_at: Date;
}
