export interface UserFavorite {
  id: number;
  user_id: number;
  film_id: number | null;
  series_id: number | null;
  position: number;
}
