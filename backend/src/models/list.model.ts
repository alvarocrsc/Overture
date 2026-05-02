export interface List {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  is_ranked: boolean;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ListItem {
  id: number;
  list_id: number;
  film_id: number | null;
  series_id: number | null;
  position: number;
  note: string | null;
}
