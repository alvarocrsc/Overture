export interface List {
  id: number;
  user_id: number;
  folder_id: number | null;
  title: string;
  description: string | null;
  icon_url: string | null;
  view_mode: 'posters' | 'expanded';
  is_ranked: boolean;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * A user-owned folder that groups lists. Folders nest up to 3 levels deep
 * (Home/root is depth 0 and is not stored as a row — root-level folders are
 * depth 1). `lists_count` / `subfolders_count` count only DIRECT children.
 */
export interface ListFolder {
  id: number;
  name: string;
  parent_folder_id: number | null;
  depth: number;
  lists_count: number;
  subfolders_count: number;
  created_at: string;
  updated_at: string;
}

export interface ListItem {
  id: number;
  list_id: number;
  film_id: number | null;
  series_id: number | null;
  position: number;
  note: string | null;
}

export interface ListLike {
  user_id: number;
  list_id: number;
  created_at: Date;
}
