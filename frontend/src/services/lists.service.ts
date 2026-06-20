/**
 * Lists service — thin wrappers around the /api/v1/lists endpoints.
 *
 * All functions return the unwrapped payload (`data`) from the backend
 * envelope `{ data: T }`. Errors propagate as axios errors and are
 * surfaced by the calling TanStack Query hook.
 */
import api from '@/src/lib/api';
import type {
  AddListItemPayload,
  CreateListPayload,
  FolderContents,
  FolderTreeData,
  ListDetail,
  ListFolder,
  ListSummary,
} from '@/src/types/lists.types';

// Re-export the list types so existing imports from this module keep working.
export type {
  AddListItemPayload,
  CreateListPayload,
  FolderContents,
  FolderTreeData,
  ListDetail,
  ListFolder,
  ListItem,
  ListSummary,
  ListViewMode,
} from '@/src/types/lists.types';

// ---------------------------------------------------------------------------
// Types — response envelopes specific to this service.
// ---------------------------------------------------------------------------

/** Paginated envelope for GET /lists/me. */
interface MyListsResponse {
  data: ListSummary[];
  total: number;
  page: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Fetches the authenticated user's lists (both owned and saved).
 * @returns The first page of list summaries (up to `limit`).
 */
export async function getMyLists(
  page: number = 1,
  limit: number = 100,
): Promise<ListSummary[]> {
  const res = await api.get<MyListsResponse>('/lists/me', {
    params: { page, limit },
  });
  return res.data.data;
}

/**
 * Fetches the public lists owned by a specific user.
 * Used when viewing another user's profile.
 * @param userId - The target user's internal ID.
 */
export async function getUserLists(userId: number): Promise<ListSummary[]> {
  const res = await api.get<{ data: ListSummary[] }>(`/lists/user/${userId}`);
  return res.data.data;
}

/**
 * Fetches a single list with its items.
 * @param listId - Internal list ID.
 */
export async function getListById(listId: number): Promise<ListDetail> {
  const res = await api.get<{ data: ListDetail }>(`/lists/${listId}`);
  return res.data.data;
}

/**
 * Adds a film or series (by TMDB id) to a list.
 * Exactly one of `film_id` or `series_id` must be provided.
 * @returns The new list_items row id.
 */
export async function addItemToList(
  listId: number,
  payload: AddListItemPayload,
): Promise<{ itemId: number }> {
  const res = await api.post<{ data: { itemId: number }; message: string }>(
    `/lists/${listId}/items`,
    payload,
  );
  return res.data.data;
}

/**
 * Removes an item from a list by its list_items row id.
 */
export async function removeItemFromList(
  listId: number,
  itemId: number,
): Promise<void> {
  await api.delete(`/lists/${listId}/items/${itemId}`);
}

/**
 * Likes a list on behalf of the authenticated user.
 * @param listId - Internal list ID.
 */
export async function likeList(listId: number): Promise<void> {
  await api.post(`/lists/${listId}/like`);
}

/**
 * Removes the authenticated user's like from a list.
 * @param listId - Internal list ID.
 */
export async function unlikeList(listId: number): Promise<void> {
  await api.delete(`/lists/${listId}/like`);
}

/**
 * Creates a new list owned by the authenticated user.
 * @param payload - The list's title and optional metadata.
 * @returns The newly created list summary.
 */
export async function createList(
  payload: CreateListPayload,
): Promise<ListSummary> {
  const res = await api.post<{ data: ListSummary; message: string }>(
    '/lists',
    payload,
  );
  return res.data.data;
}

/**
 * Uploads (or replaces) a list's icon image.
 * @param listId - Internal list ID.
 * @param imageUri - Local file URI from the image picker.
 * @returns The hosted Cloudinary URL of the saved icon.
 */
export async function uploadListIcon(
  listId: number,
  imageUri: string,
): Promise<string> {
  const formData = new FormData();
  formData.append('icon', {
    uri: imageUri,
    name: 'list-icon.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  const res = await api.post<{ data: { icon_url: string }; message: string }>(
    `/lists/${listId}/icon`,
    formData,
    {
      // Let React Native's networking layer set `multipart/form-data` together
      // with the boundary. Forcing the header here (or inheriting the
      // instance's JSON default) drops the boundary, which makes multer parse
      // no file and reject the upload. `transformRequest` keeps the FormData
      // untouched so axios does not try to serialize it.
      headers: { 'Content-Type': undefined },
      transformRequest: (data) => data,
    },
  );
  return res.data.data.icon_url;
}

/**
 * Fetches the contents (subfolders + lists) of a folder.
 * @param folderId - The folder to open, or null for the root level.
 */
export async function fetchFolderContents(
  folderId: number | null,
): Promise<FolderContents> {
  const res = await api.get<{
    data: { folders: ListFolder[]; lists: ListSummary[] };
    currentFolder: ListFolder | null;
  }>('/lists/folder-contents', {
    params: folderId === null ? {} : { folder_id: folderId },
  });
  return {
    folders: res.data.data.folders,
    lists: res.data.data.lists,
    currentFolder: res.data.currentFolder,
  };
}

/**
 * Fetches the user's full folder tree (flat) plus the root-level list count.
 * Used to render the move-to-folder picker.
 */
export async function fetchFolderTree(): Promise<FolderTreeData> {
  const res = await api.get<{ data: FolderTreeData }>('/lists/folders/tree');
  return res.data.data;
}

/**
 * Creates a folder owned by the authenticated user.
 * @param name - The folder name.
 * @param parentFolderId - The parent folder, or null for a root folder.
 * @returns The newly created folder.
 */
export async function createFolder(
  name: string,
  parentFolderId: number | null,
): Promise<ListFolder> {
  const res = await api.post<{ data: ListFolder; message: string }>(
    '/lists/folders',
    { name, parent_folder_id: parentFolderId },
  );
  return res.data.data;
}

/**
 * Moves a list into a folder (or back to the root level when `folderId` is
 * null). Implemented via the list update endpoint.
 * @param listId - Internal list ID.
 * @param folderId - The destination folder, or null for the root level.
 */
export async function moveListToFolder(
  listId: number,
  folderId: number | null,
): Promise<void> {
  await api.put(`/lists/${listId}`, { folder_id: folderId });
}

/**
 * Deletes a list owned by the authenticated user.
 * @param listId - Internal list ID.
 */
export async function deleteList(listId: number): Promise<void> {
  await api.delete(`/lists/${listId}`);
}
