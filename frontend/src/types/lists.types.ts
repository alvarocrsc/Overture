/**
 * Shared TypeScript types for the lists feature.
 *
 * These mirror the backend response shapes (snake_case preserved). Boolean
 * flags arrive over the wire as MySQL tinyint values, so they are typed as
 * `0 | 1` rather than `boolean` to match the actual runtime payload.
 */

/** How a list renders its items on the detail screen. */
export type ListViewMode = 'posters' | 'expanded';

/** Discriminates a list item between a film and a series. */
export type MediaType = 'film' | 'series';

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
  /** Backdrop path of the first list item, used as the cover thumbnail. */
  cover_backdrop_path: string | null;
  /** The folder this list sits in, or null when at the root level. */
  folder_id: number | null;
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
  film_backdrop: string | null;
  film_overview: string | null;
  film_release_date: string | null;
  film_release_year: number | null;
  film_director: string | null;
  film_runtime_min: number | null;
  series_tmdb_id: number | null;
  series_title: string | null;
  series_poster: string | null;
  series_backdrop: string | null;
  series_overview: string | null;
  series_first_air_date: string | null;
  series_first_air_year: number | null;
  series_creator: string | null;
  series_number_of_seasons: number | null;
}

/**
 * A list item flattened across the film/series duality into a single
 * media-agnostic shape, produced by `normalizeListItem`.
 */
export interface NormalizedListItem {
  /** The list_items row id (stable key). */
  itemId: number;
  position: number;
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  /** Release / first-air year as a string, or null when unknown. */
  year: string | null;
  /** Director (films) or creator (series), or null when unknown. */
  directorOrCreator: string | null;
  /** Runtime in minutes (films) or season count (series), or null. */
  runtimeOrSeasons: number | null;
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
  owner_name: string | null;
  owner_avatar: string | null;
  likes_count: number;
  is_liked: 0 | 1;
  comments_count: number;
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

/**
 * A folder that groups a user's lists. Folders nest up to 3 levels deep.
 * `lists_count` and `subfolders_count` count only direct children.
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

/**
 * The payload returned by GET /lists/folder-contents — the subfolders and
 * lists inside a folder, plus the folder itself (null at the root level).
 */
export interface FolderContents {
  folders: ListFolder[];
  lists: ListSummary[];
  currentFolder: ListFolder | null;
}

/**
 * The payload returned by GET /lists/folders/tree — every folder the user
 * owns (flat) plus the number of lists sitting at the root level.
 */
export interface FolderTreeData {
  folders: ListFolder[];
  rootListsCount: number;
}
