import { query, execute } from '../config/db';
import cloudinary from '../config/cloudinary';
import { AppError } from '../utils/app-error';
import type {
  CreateListInput,
  UpdateListInput,
  AddListItemInput,
} from '../validators/list.validators';
import type { ListFolder } from '../models/list.model';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** A list row joined with owner info, as returned by getMyLists. */
export interface ListSummaryRow {
  id: number;
  title: string;
  description: string | null;
  icon_url: string | null;
  view_mode: 'posters' | 'expanded';
  is_public: number;
  is_ranked: number;
  items_count: number;
  created_at: Date;
  updated_at: Date;
  owner_username: string;
  owner_avatar: string | null;
  is_saved: number;
  /** Backdrop path of the first list item — used as a cover image thumbnail. */
  cover_backdrop_path: string | null;
}

/** Full list row with owner info, as returned by getListById. */
export interface ListDetailRow {
  id: number;
  title: string;
  description: string | null;
  icon_url: string | null;
  view_mode: 'posters' | 'expanded';
  is_public: number;
  is_ranked: number;
  items_count: number;
  created_at: Date;
  updated_at: Date;
  owner_id: number;
  owner_username: string;
  owner_name: string | null;
  owner_avatar: string | null;
  likes_count: number;
  is_liked: number;
  comments_count: number;
}

/** A list_items row joined with film/series data. */
export interface ListItemRow {
  id: number;
  position: number;
  note: string | null;
  added_at: Date;
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

/** Minimal list ownership row used for auth checks. */
interface ListOwnerRow {
  id: number;
  user_id: number;
  is_public: number;
  is_ranked: number;
}

/** Internal ID lookup row. */
interface IdRow {
  id: number;
}

/** Duplicate-item check row. */
interface DuplicateRow {
  id: number;
}

/** Max position row. */
interface MaxPositionRow {
  max_pos: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetches a list row for ownership checks.
 * Throws 404 if the list does not exist.
 * @param listId - The list's primary key.
 * @returns The minimal list ownership row.
 */
async function fetchListOrThrow(listId: number): Promise<ListOwnerRow> {
  const [list] = await query<ListOwnerRow>(
    `SELECT id, user_id, is_public, is_ranked FROM lists WHERE id = ?`,
    [listId],
  );
  if (!list) throw new AppError('List not found', 404);
  return list;
}

/** Maximum allowed folder nesting depth. Root-level folders are depth 1. */
const MAX_FOLDER_DEPTH = 3;

/**
 * SELECT fragment that returns a full {@link ListFolder} with its direct
 * child counts. Dates are cast to strings so they match the model type.
 */
const FOLDER_SELECT = `
  SELECT
    f.id,
    f.name,
    f.parent_folder_id,
    f.depth,
    f.pin_order,
    (SELECT COUNT(*) FROM lists l WHERE l.folder_id = f.id) AS lists_count,
    (SELECT COUNT(*) FROM list_folders sf WHERE sf.parent_folder_id = f.id) AS subfolders_count,
    CAST(f.created_at AS CHAR) AS created_at,
    CAST(f.updated_at AS CHAR) AS updated_at
  FROM list_folders f
`;

/**
 * Fetches a folder owned by the user, including direct child counts.
 * Throws 404 if the folder does not exist or is not owned by the user.
 * @param folderId - The folder's primary key.
 * @param userId - The authenticated user's ID.
 * @returns The folder with its counts.
 */
async function fetchFolderForUser(
  folderId: number,
  userId: number,
): Promise<ListFolder> {
  const [folder] = await query<ListFolder>(
    `${FOLDER_SELECT} WHERE f.id = ? AND f.user_id = ?`,
    [folderId, userId],
  );
  if (!folder) throw new AppError('Folder not found', 404);
  return folder;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Returns a paginated list of lists created by or saved by the user.
 * @param userId - The authenticated user's ID.
 * @param page - Page number (1-based).
 * @param limit - Items per page (max 100).
 * @returns Paginated list summaries.
 */
export async function getMyLists(
  userId: number,
  page: number,
  limit: number,
): Promise<{ data: ListSummaryRow[]; total: number; page: number; limit: number }> {
  const clampedLimit = Math.min(limit, 100);
  const offset = (page - 1) * clampedLimit;

  const [countRow] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total
     FROM lists l
     WHERE l.user_id = ? OR l.id IN (
       SELECT list_id FROM saved_lists WHERE user_id = ?
     )`,
    [userId, userId],
  );
  // COUNT(*) always returns a row — non-null assertion is safe.
  const total = countRow!.total;

  const rows = await query<ListSummaryRow>(
    `SELECT
       l.id,
       l.title,
       l.description,
       l.icon_url,
       l.view_mode,
       l.is_public,
       l.is_ranked,
       l.items_count,
       l.created_at,
       l.updated_at,
       u.username   AS owner_username,
       u.avatar_url AS owner_avatar,
       CASE WHEN l.user_id = ? THEN false ELSE true END AS is_saved,
       (SELECT COALESCE(f2.backdrop_path, s2.backdrop_path)
        FROM list_items li2
        LEFT JOIN films  f2 ON li2.film_id   = f2.id
        LEFT JOIN series s2 ON li2.series_id = s2.id
        WHERE li2.list_id = l.id
        ORDER BY li2.position ASC, li2.added_at ASC
        LIMIT 1) AS cover_backdrop_path
     FROM lists l
     JOIN users u ON l.user_id = u.id
     WHERE l.user_id = ? OR l.id IN (
       SELECT list_id FROM saved_lists WHERE user_id = ?
     )
     ORDER BY l.updated_at DESC
     LIMIT ${clampedLimit} OFFSET ${offset}`,
    [userId, userId, userId],
  );

  return { data: rows, total, page, limit: clampedLimit };
}

/**
 * Returns a list of public lists owned by a specific user.
 * Used for viewing another user's lists from their profile page.
 *
 * When the requesting user is the same as the target user this
 * still only returns public lists — callers should prefer `getMyLists`
 * if they need private lists too.
 *
 * @param targetUserId - The user whose lists are fetched.
 * @returns An array of public list summaries ordered by last update.
 */
export async function getUserLists(
  targetUserId: number,
): Promise<ListSummaryRow[]> {
  const rows = await query<ListSummaryRow>(
    `SELECT
       l.id,
       l.title,
       l.description,
       l.icon_url,
       l.view_mode,
       l.is_public,
       l.is_ranked,
       l.items_count,
       l.created_at,
       l.updated_at,
       u.username   AS owner_username,
       u.avatar_url AS owner_avatar,
       0            AS is_saved,
       (SELECT COALESCE(f2.backdrop_path, s2.backdrop_path)
        FROM list_items li2
        LEFT JOIN films  f2 ON li2.film_id   = f2.id
        LEFT JOIN series s2 ON li2.series_id = s2.id
        WHERE li2.list_id = l.id
        ORDER BY li2.position ASC, li2.added_at ASC
        LIMIT 1) AS cover_backdrop_path
     FROM lists l
     JOIN users u ON l.user_id = u.id
     WHERE l.user_id = ? AND l.is_public = 1
     ORDER BY l.updated_at DESC`,
    [targetUserId],
  );
  return rows;
}

/**
 * Creates a new list for the authenticated user.
 * @param userId - The authenticated user's ID.
 * @param data - Validated input from createListSchema.
 * @returns The newly created list summary.
 */
export async function createList(
  userId: number,
  data: CreateListInput,
): Promise<ListSummaryRow> {
  const result = await execute(
    `INSERT INTO lists (user_id, title, description, icon_url, view_mode, is_public, is_ranked, items_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      userId,
      data.title,
      data.description ?? null,
      data.icon_url ?? null,
      data.view_mode,
      data.is_public ? 1 : 0,
      data.is_ranked ? 1 : 0,
    ],
  );

  const [summary] = await query<ListSummaryRow>(
    `SELECT
       l.id,
       l.title,
       l.description,
       l.icon_url,
       l.view_mode,
       l.is_public,
       l.is_ranked,
       l.items_count,
       l.created_at,
       l.updated_at,
       u.username   AS owner_username,
       u.avatar_url AS owner_avatar,
       CASE WHEN l.user_id = ? THEN false ELSE true END AS is_saved,
       NULL AS cover_backdrop_path
     FROM lists l
     JOIN users u ON l.user_id = u.id
     WHERE l.id = ?`,
    [userId, result.insertId],
  );
  // The row was just inserted — it is guaranteed to exist.
  return summary!;
}

/**
 * Returns the contents of a folder: its direct subfolders and the lists
 * placed directly inside it. Passing `null` returns the root level (lists
 * and folders with no parent).
 *
 * Folders belong to the user, so the lists returned are always owned by the
 * user and never "saved" copies — is_saved is therefore always 0.
 *
 * @param userId - The authenticated user's ID.
 * @param folderId - The folder to open, or null for the root level.
 * @returns The subfolders, lists, and the current folder (null at root).
 */
export async function getFolderContentsService(
  userId: number,
  folderId: number | null,
): Promise<{
  folders: ListFolder[];
  lists: ListSummaryRow[];
  currentFolder: ListFolder | null;
}> {
  const currentFolder =
    folderId === null ? null : await fetchFolderForUser(folderId, userId);

  const folders = await query<ListFolder>(
    `${FOLDER_SELECT}
     WHERE f.user_id = ? AND f.parent_folder_id <=> ?
     ORDER BY (f.pin_order IS NULL) ASC, f.pin_order ASC, f.created_at ASC`,
    [userId, folderId],
  );

  const lists = await query<ListSummaryRow>(
    `SELECT
       l.id,
       l.title,
       l.description,
       l.icon_url,
       l.view_mode,
       l.is_public,
       l.is_ranked,
       l.items_count,
       l.created_at,
       l.updated_at,
       l.pin_order,
       u.username   AS owner_username,
       u.avatar_url AS owner_avatar,
       false AS is_saved,
       (SELECT COALESCE(f2.backdrop_path, s2.backdrop_path)
        FROM list_items li2
        LEFT JOIN films  f2 ON li2.film_id   = f2.id
        LEFT JOIN series s2 ON li2.series_id = s2.id
        WHERE li2.list_id = l.id
        ORDER BY li2.position ASC, li2.added_at ASC
        LIMIT 1) AS cover_backdrop_path
     FROM lists l
     JOIN users u ON l.user_id = u.id
     WHERE l.user_id = ? AND l.folder_id <=> ?
     ORDER BY (l.pin_order IS NULL) ASC, l.pin_order ASC, l.created_at ASC`,
    [userId, folderId],
  );

  return { folders, lists, currentFolder };
}

/**
 * Pins a list inside its current folder (or root) for the given user.
 * Sets `pin_order = UNIX_TIMESTAMP()` on the target list so newly-pinned
 * items sort above older pins (ascending order means lower = higher up,
 * so we use a monotonically increasing epoch value which puts the most
 * recently pinned item first within the pinned group).
 * @param userId - The authenticated user's ID.
 * @param listId - The list to pin.
 */
export async function pinListService(
  userId: number,
  listId: number,
): Promise<void> {
  const list = await fetchListOrThrow(listId);
  if (list.user_id !== userId) throw new AppError('Forbidden', 403);
  await execute(
    `UPDATE lists SET pin_order = UNIX_TIMESTAMP() WHERE id = ?`,
    [listId],
  );
}

/**
 * Removes the pin from a list.
 * @param userId - The authenticated user's ID.
 * @param listId - The list to unpin.
 */
export async function unpinListService(
  userId: number,
  listId: number,
): Promise<void> {
  const list = await fetchListOrThrow(listId);
  if (list.user_id !== userId) throw new AppError('Forbidden', 403);
  await execute(
    `UPDATE lists SET pin_order = NULL WHERE id = ?`,
    [listId],
  );
}

/**
 * Returns every folder the user owns (flat) plus the number of lists that
 * sit at the root level (no folder). Used to render the move-to-folder tree.
 * @param userId - The authenticated user's ID.
 * @returns All folders flat and the root list count.
 */
export async function getFolderTreeService(
  userId: number,
): Promise<{ folders: ListFolder[]; rootListsCount: number }> {
  const folders = await query<ListFolder>(
    `${FOLDER_SELECT}
     WHERE f.user_id = ?
     ORDER BY f.created_at ASC`,
    [userId],
  );

  const [countRow] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM lists WHERE user_id = ? AND folder_id IS NULL`,
    [userId],
  );
  // COUNT(*) always returns a row — non-null assertion is safe.
  const rootListsCount = countRow!.total;

  return { folders, rootListsCount };
}

/**
 * Creates a folder for the user. Root folders are depth 1; nesting is capped
 * at {@link MAX_FOLDER_DEPTH} levels.
 * @param userId - The authenticated user's ID.
 * @param name - The folder name (already trimmed/validated).
 * @param parentFolderId - The parent folder, or null for a root folder.
 * @returns The newly created folder.
 */
export async function createFolderService(
  userId: number,
  name: string,
  parentFolderId: number | null,
): Promise<ListFolder> {
  let depth = 1;
  if (parentFolderId !== null) {
    const parent = await fetchFolderForUser(parentFolderId, userId);
    depth = parent.depth + 1;
    if (depth > MAX_FOLDER_DEPTH) {
      throw new AppError(
        `Maximum folder nesting depth (${MAX_FOLDER_DEPTH}) exceeded`,
        400,
      );
    }
  }

  const result = await execute(
    `INSERT INTO list_folders (user_id, parent_folder_id, name, depth)
     VALUES (?, ?, ?, ?)`,
    [userId, parentFolderId, name, depth],
  );

  // The row was just inserted — it is guaranteed to exist.
  return fetchFolderForUser(result.insertId, userId);
}

/**
 * Fetches a list's metadata and items.
 * Private lists are visible only to their owner; others receive a 404.
 * @param listId - The list's primary key.
 * @param requestingUserId - Optional authenticated user ID.
 * @returns The list with its items array.
 */
export async function getListById(
  listId: number,
  requestingUserId: number | undefined,
): Promise<ListDetailRow & { items: ListItemRow[] }> {
  const [list] = await query<ListDetailRow>(
    `SELECT
       l.id,
       l.title,
       l.description,
       l.icon_url,
       l.view_mode,
       l.is_public,
       l.is_ranked,
       l.items_count,
       l.created_at,
       l.updated_at,
       u.id         AS owner_id,
       u.username   AS owner_username,
       u.name       AS owner_name,
       u.avatar_url AS owner_avatar,
       (SELECT COUNT(*) FROM list_likes ll WHERE ll.list_id = l.id) AS likes_count,
       EXISTS(
         SELECT 1 FROM list_likes ll
         WHERE ll.list_id = l.id AND ll.user_id = ?
       ) AS is_liked,
       -- TODO(list-comments): wire up real comment count when list comments ship.
       0 AS comments_count
     FROM lists l
     JOIN users u ON l.user_id = u.id
     WHERE l.id = ?`,
    [requestingUserId ?? 0, listId],
  );
  if (!list) throw new AppError('List not found', 404);

  // Gate private lists — reveal nothing to non-owners.
  if (!list.is_public) {
    if (requestingUserId === undefined || requestingUserId !== list.owner_id) {
      throw new AppError('List not found', 404);
    }
  }

  const items = await query<ListItemRow>(
    `SELECT
       li.id,
       li.position,
       li.note,
       li.added_at,
       f.tmdb_id        AS film_tmdb_id,
       f.title          AS film_title,
       f.poster_path    AS film_poster,
       f.backdrop_path  AS film_backdrop,
       f.overview       AS film_overview,
       f.release_date   AS film_release_date,
       YEAR(f.release_date) AS film_release_year,
       (SELECT fc.person_name FROM film_credits fc
         WHERE fc.film_id = f.id AND fc.role = 'director'
         ORDER BY fc.id ASC LIMIT 1) AS film_director,
       f.runtime_min    AS film_runtime_min,
       s.tmdb_id        AS series_tmdb_id,
       s.title          AS series_title,
       s.poster_path    AS series_poster,
       s.backdrop_path  AS series_backdrop,
       s.overview       AS series_overview,
       s.first_air_date AS series_first_air_date,
       YEAR(s.first_air_date) AS series_first_air_year,
       (SELECT sc.person_name FROM series_credits sc
         WHERE sc.series_id = s.id AND sc.role = 'director'
         ORDER BY sc.id ASC LIMIT 1) AS series_creator,
       s.seasons_count  AS series_number_of_seasons
     FROM list_items li
     LEFT JOIN films  f ON li.film_id   = f.id
     LEFT JOIN series s ON li.series_id = s.id
     WHERE li.list_id = ?
     ORDER BY li.position ASC, li.added_at ASC`,
    [listId],
  );

  return { ...list, items };
}

/**
 * Partially updates a list's metadata.
 * Throws 403 if the caller does not own the list.
 * @param listId - The list's primary key.
 * @param userId - The authenticated user's ID.
 * @param data - Validated partial input from updateListSchema.
 * @returns The updated listId.
 */
export async function updateList(
  listId: number,
  userId: number,
  data: UpdateListInput,
): Promise<{ listId: number }> {
  const list = await fetchListOrThrow(listId);
  if (list.user_id !== userId) throw new AppError('Forbidden', 403);

  const setClauses: string[] = [];
  const params: (string | number | boolean | null)[] = [];

  if (data.title !== undefined) {
    setClauses.push('title = ?');
    params.push(data.title);
  }
  if ('description' in data) {
    setClauses.push('description = ?');
    params.push(data.description ?? null);
  }
  if ('icon_url' in data) {
    setClauses.push('icon_url = ?');
    params.push(data.icon_url ?? null);
  }
  if (data.view_mode !== undefined) {
    setClauses.push('view_mode = ?');
    params.push(data.view_mode);
  }
  if (data.is_public !== undefined) {
    setClauses.push('is_public = ?');
    params.push(data.is_public ? 1 : 0);
  }
  if (data.is_ranked !== undefined) {
    setClauses.push('is_ranked = ?');
    params.push(data.is_ranked ? 1 : 0);
  }
  if ('folder_id' in data) {
    // Verify the user owns the target folder before moving the list into it.
    if (data.folder_id != null) {
      await fetchFolderForUser(data.folder_id, userId);
    }
    setClauses.push('folder_id = ?');
    params.push(data.folder_id ?? null);
  }

  if (setClauses.length > 0) {
    params.push(listId);
    await execute(`UPDATE lists SET ${setClauses.join(', ')} WHERE id = ?`, params);
  }

  return { listId };
}

/**
 * Deletes a list and all its items (cascade).
 * Throws 403 if the caller does not own the list.
 * @param listId - The list's primary key.
 * @param userId - The authenticated user's ID.
 */
export async function deleteList(listId: number, userId: number): Promise<void> {
  const list = await fetchListOrThrow(listId);
  if (list.user_id !== userId) throw new AppError('Forbidden', 403);
  await execute(`DELETE FROM lists WHERE id = ?`, [listId]);
}

/**
 * Adds a film or series to a list.
 * film_id and series_id are TMDB IDs — resolved to internal IDs before insert.
 * @param listId - The list's primary key.
 * @param userId - The authenticated user's ID.
 * @param data - Validated input from addListItemSchema.
 * @returns The new itemId.
 */
export async function addListItem(
  listId: number,
  userId: number,
  data: AddListItemInput,
): Promise<{ itemId: number }> {
  const list = await fetchListOrThrow(listId);
  if (list.user_id !== userId) throw new AppError('Forbidden', 403);

  const hasBoth = data.film_id !== undefined && data.series_id !== undefined;
  const hasNeither = data.film_id === undefined && data.series_id === undefined;
  if (hasBoth || hasNeither) {
    throw new AppError('Provide either film_id or series_id, not both', 400);
  }

  let internalFilmId: number | null = null;
  let internalSeriesId: number | null = null;

  if (data.film_id !== undefined) {
    const [film] = await query<IdRow>(`SELECT id FROM films WHERE tmdb_id = ?`, [data.film_id]);
    if (!film) {
      throw new AppError('Film not found — visit /films/:tmdbId first to cache it', 404);
    }
    internalFilmId = film.id;
  }

  if (data.series_id !== undefined) {
    const [series] = await query<IdRow>(`SELECT id FROM series WHERE tmdb_id = ?`, [data.series_id]);
    if (!series) {
      throw new AppError('Series not found — visit /series/:tmdbId first to cache it', 404);
    }
    internalSeriesId = series.id;
  }

  const [duplicate] = await query<DuplicateRow>(
    `SELECT id FROM list_items
     WHERE list_id = ?
       AND (film_id = ? OR series_id = ?)`,
    [listId, internalFilmId ?? null, internalSeriesId ?? null],
  );
  if (duplicate) throw new AppError('Title already in this list', 409);

  let position = data.position;
  if (position === undefined) {
    const [maxRow] = await query<MaxPositionRow>(
      `SELECT COALESCE(MAX(position), 0) AS max_pos FROM list_items WHERE list_id = ?`,
      [listId],
    );
    // COALESCE always returns a value — non-null assertion is safe.
    position = (maxRow!.max_pos ?? 0) + 1;
  } else if (list.is_ranked) {
    const [posConflict] = await query<IdRow>(
      `SELECT id FROM list_items WHERE list_id = ? AND position = ?`,
      [listId, position],
    );
    if (posConflict) throw new AppError('A title already occupies that position', 409);
  }

  let result;
  try {
    result = await execute(
      `INSERT INTO list_items (list_id, film_id, series_id, position, note)
       VALUES (?, ?, ?, ?, ?)`,
      [listId, internalFilmId, internalSeriesId, position, data.note ?? null],
    );
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'errno' in err &&
      (err as { errno: number }).errno === 1062
    ) {
      throw new AppError('Title already in this list', 409);
    }
    throw err;
  }

  await execute(
    `UPDATE lists SET items_count = (SELECT COUNT(*) FROM list_items WHERE list_id = ?) WHERE id = ?`,
    [listId, listId],
  );

  return { itemId: result.insertId };
}

/**
 * Removes an item from a list and decrements the list's items_count.
 * Ownership is checked on the list, not the individual item.
 * @param listId - The list's primary key.
 * @param itemId - The list_items row primary key.
 * @param userId - The authenticated user's ID.
 */
export async function removeListItem(
  listId: number,
  itemId: number,
  userId: number,
): Promise<void> {
  const list = await fetchListOrThrow(listId);
  if (list.user_id !== userId) throw new AppError('Forbidden', 403);

  const [item] = await query<IdRow>(
    `SELECT id FROM list_items WHERE id = ? AND list_id = ?`,
    [itemId, listId],
  );
  if (!item) throw new AppError('Item not found in this list', 404);

  await execute(`DELETE FROM list_items WHERE id = ?`, [itemId]);
  await execute(
    `UPDATE lists SET items_count = (SELECT COUNT(*) FROM list_items WHERE list_id = ?) WHERE id = ?`,
    [listId, listId],
  );
}

/**
 * Saves a public list to the authenticated user's collection.
 * Users cannot save their own lists. Idempotent.
 * @param listId - The list's primary key.
 * @param userId - The authenticated user's ID.
 */
export async function saveList(listId: number, userId: number): Promise<void> {
  const list = await fetchListOrThrow(listId);

  if (list.user_id === userId) {
    throw new AppError('Cannot save your own list', 400);
  }
  if (!list.is_public) {
    throw new AppError('List not found', 404);
  }

  await execute(
    `INSERT IGNORE INTO saved_lists (user_id, list_id) VALUES (?, ?)`,
    [userId, listId],
  );
}

/**
 * Removes a saved list from the authenticated user's collection. Idempotent.
 * @param listId - The list's primary key.
 * @param userId - The authenticated user's ID.
 */
export async function unsaveList(listId: number, userId: number): Promise<void> {
  await fetchListOrThrow(listId);
  await execute(
    `DELETE FROM saved_lists WHERE user_id = ? AND list_id = ?`,
    [userId, listId],
  );
}

/**
 * Likes a list on behalf of the authenticated user.
 * Throws 409 if the user has already liked the list.
 * @param listId - The list's primary key.
 * @param userId - The authenticated user's ID.
 */
export async function likeList(listId: number, userId: number): Promise<void> {
  await fetchListOrThrow(listId);

  try {
    await execute(
      `INSERT INTO list_likes (user_id, list_id) VALUES (?, ?)`,
      [userId, listId],
    );
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'errno' in err &&
      (err as { errno: number }).errno === 1062
    ) {
      throw new AppError('Already liked', 409);
    }
    throw err;
  }
}

/**
 * Removes the authenticated user's like from a list. Idempotent.
 * @param listId - The list's primary key.
 * @param userId - The authenticated user's ID.
 */
export async function unlikeList(listId: number, userId: number): Promise<void> {
  await fetchListOrThrow(listId);
  await execute(
    `DELETE FROM list_likes WHERE user_id = ? AND list_id = ?`,
    [userId, listId],
  );
}

/**
 * Uploads a list icon image to Cloudinary and saves the resulting URL on
 * the list's `icon_url` column.
 *
 * The Cloudinary public id is `list_<listId>` with `overwrite: true`, so
 * each list only ever has one icon asset regardless of how many times it
 * is replaced.
 *
 * @param listId   The list's primary key.
 * @param userId   The authenticated user's id (must own the list).
 * @param buffer   The raw image bytes from multer's memory storage.
 * @param mimetype The MIME type of the uploaded file (jpeg/png/webp).
 * @returns        The new public Cloudinary `secure_url`.
 */
export async function uploadListIconService(
  listId: number,
  userId: number,
  buffer: Buffer,
  mimetype: string,
): Promise<{ icon_url: string }> {
  const list = await fetchListOrThrow(listId);
  if (list.user_id !== userId) throw new AppError('Forbidden', 403);

  const dataUri = `data:${mimetype};base64,${buffer.toString('base64')}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'overture/list-icons',
    public_id: `list_${listId}`,
    resource_type: 'image',
    overwrite: true,
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  });

  await execute('UPDATE lists SET icon_url = ? WHERE id = ?', [
    result.secure_url,
    listId,
  ]);

  return { icon_url: result.secure_url };
}
