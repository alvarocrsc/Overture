export interface Review {
  id: number;
  rating_id: number;
  user_id: number;
  content: string;
  liked_title: boolean;
  contains_spoilers: boolean;
  original_date: string | null;
  created_at: Date;
  updated_at: Date;
}
