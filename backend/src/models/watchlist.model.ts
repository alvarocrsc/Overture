export interface WatchlistItem {
  id: number;
  user_id: number;
  film_id: number | null;
  series_id: number | null;
  added_at: Date;
}
