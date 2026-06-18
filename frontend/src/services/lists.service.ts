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
  ListDetail,
  ListSummary,
} from '@/src/types/lists.types';

// Re-export the list types so existing imports from this module keep working.
export type {
  AddListItemPayload,
  CreateListPayload,
  ListDetail,
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
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.data.icon_url;
}
