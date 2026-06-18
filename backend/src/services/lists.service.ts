import { query, execute } from '../config/db';
import cloudinary from '../config/cloudinary';
import { AppError } from '../utils/app-error';
import type {
  CreateListInput,
  UpdateListInput,
  AddListItemInput,
} from '../validators/list.validators';

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
  owner_avatar: string | null;
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
  film_release_date: string | null;
  series_tmdb_id: number | null;
  series_title: string | null;
  series_poster: string | null;
  series_first_air_date: string | null;
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
       u.username  AS owner_username,
       u.avatar_url AS owner_avatar,
       CASE WHEN l.user_id = ? THEN false ELSE true END AS is_saved
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
       CASE WHEN l.user_id = ? THEN false ELSE true END AS is_saved
     FROM lists l
     JOIN users u ON l.user_id = u.id
     WHERE l.id = ?`,
    [userId, result.insertId],
  );
  // The row was just inserted — it is guaranteed to exist.
  return summary!;
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
       u.avatar_url AS owner_avatar
     FROM lists l
     JOIN users u ON l.user_id = u.id
     WHERE l.id = ?`,
    [listId],
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
       f.release_date   AS film_release_date,
       s.tmdb_id        AS series_tmdb_id,
       s.title          AS series_title,
       s.poster_path    AS series_poster,
       s.first_air_date AS series_first_air_date
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
