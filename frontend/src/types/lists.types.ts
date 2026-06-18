/**
 * Shared TypeScript types for the lists feature.
 *
 * These mirror the backend response shapes (snake_case preserved). Boolean
 * flags arrive over the wire as MySQL tinyint values, so they are typed as
 * `0 | 1` rather than `boolean` to match the actual runtime payload.
 */

/** How a list renders its items on the detail screen. */
export type ListViewMode = 'posters' | 'expanded';

/** A row returned by GET /lists/me — owned + saved lists. */
export interface ListSummary {
  id: number;
  title: string;
  description: string | null;
  icon_url: string | null;
  view_mode: ListViewMode;
  is_public: 0 | 1;
  is_ranked: 0 | 1;
  items_count: number;
  created_at: string;
  updated_at: string;
  owner_username: string;
  owner_avatar: string | null;
  /** 0 for owned, 1 for saved (read-only). */
  is_saved: 0 | 1;
}

/** A single film/series row inside a list's items array. */
export interface ListItem {
  id: number;
  position: number;
  note: string | null;
  added_at: string;
  film_tmdb_id: number | null;
  film_title: string | null;
  film_poster: string | null;
  film_release_date: string | null;
  series_tmdb_id: number | null;
  series_title: string | null;
  series_poster: string | null;
  series_first_air_date: string | null;
}

/** Full detail returned by GET /lists/:id. */
export interface ListDetail {
  id: number;
  title: string;
  description: string | null;
  icon_url: string | null;
  view_mode: ListViewMode;
  is_public: 0 | 1;
  is_ranked: 0 | 1;
  items_count: number;
  created_at: string;
  updated_at: string;
  owner_id: number;
  owner_username: string;
  owner_avatar: string | null;
  items: ListItem[];
}

/** Body accepted by POST /lists/:id/items. */
export interface AddListItemPayload {
  film_id?: number;
  series_id?: number;
  position?: number;
  note?: string | null;
}

/** Body accepted by POST /lists when creating a new list. */
export interface CreateListPayload {
  title: string;
  description?: string;
  is_public?: boolean;
  is_ranked?: boolean;
  view_mode?: ListViewMode;
}
