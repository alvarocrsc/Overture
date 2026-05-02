export interface TitleLike {
  id: number;
  user_id: number;
  film_id: number | null;
  series_id: number | null;
  created_at: Date;
}
