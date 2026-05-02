export interface ReviewComment {
  id: number;
  review_id: number;
  user_id: number;
  parent_id: number | null;
  content: string;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}
