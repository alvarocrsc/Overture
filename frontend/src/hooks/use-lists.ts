/**
 * TanStack Query hooks for the lists feature.
 *
 * - `useMyLists` — returns the authenticated user's lists (owned + saved).
 * - `useListDetail(listId)` — fetches one list's metadata + items.
 * - `useListMembership(tmdbId, mediaType)` — derives membership for a
 *   title across every list owned by the user, fanning out one query
 *   per list via `useQueries`. Returns `{ rows, isLoading }` where each
 *   `rows[i]` is `{ list, itemId | null }`.
 * - `useToggleListItem` — mutation that adds/removes a single
 *   (tmdbId, mediaType) from a list. Patches the relevant `['list', id]`
 *   cache optimistically; reverts on error.
 */
import { useMemo } from 'react';
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import { useAuth } from '@/src/context/AuthContext';
import {
  addItemToList,
  createFolder,
  createList,
  deleteList,
  fetchFolderContents,
  fetchFolderTree,
  getListById,
  getMyLists,
  getUserLists,
  likeList,
  moveListToFolder,
  pinList,
  removeItemFromList,
  unlikeList,
  unpinList,
  uploadListIcon,
  type CreateListPayload,
  type FolderContents,
  type FolderTreeData,
  type ListDetail,
  type ListFolder,
  type ListItem,
  type ListSummary,
} from '@/src/services/lists.service';

/** Query key for the user's lists summary. */
export const MY_LISTS_KEY = ['lists', 'me'] as const;

/** Query key for a single list's full detail. */
export const listDetailKey = (listId: number): readonly unknown[] =>
  ['list', listId] as const;

/** Query key for another user's public lists. */
export const userListsKey = (userId: number) =>
  ['lists', 'user', userId] as const;

/** Query key for the contents of a folder (null = root level). */
export const folderContentsKey = (folderId: number | null) =>
  ['lists', 'folder-contents', folderId] as const;

/** Query key for the user's full folder tree. */
export const FOLDER_TREE_KEY = ['lists', 'folder-tree'] as const;

/** Loads the user's lists (owned + saved). Disabled when signed out. */
export function useMyLists(): UseQueryResult<ListSummary[]> {
  const { user } = useAuth();
  return useQuery({
    queryKey: MY_LISTS_KEY,
    queryFn: () => getMyLists(),
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

/**
 * Loads the public lists owned by another user.
 * @param userId - Internal user ID of the profile being viewed.
 */
export function useUserLists(
  userId: number | null,
): UseQueryResult<ListSummary[]> {
  return useQuery({
    queryKey: userId != null ? userListsKey(userId) : ['lists', 'user', null],
    queryFn: () => {
      if (userId == null) return Promise.reject(new Error('userId is null'));
      return getUserLists(userId);
    },
    enabled: userId != null,
    staleTime: 2 * 60 * 1000,
  });
}

/** Loads a single list's detail (with items). */
export function useListDetail(
  listId: number | null,
): UseQueryResult<ListDetail> {
  return useQuery({
    queryKey: listDetailKey(listId ?? -1),
    queryFn: () => {
      if (listId == null) {
        return Promise.reject(new Error('listId is null'));
      }
      return getListById(listId);
    },
    enabled: listId != null,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Optimistically toggles the authenticated user's like on a list.
 *
 * Patches the cached `['list', listId]` detail immediately — flipping
 * `is_liked` and adjusting `likes_count` by ±1 — then reverts on error.
 *
 * @param listId - Internal list ID.
 */
export function useLikeList(listId: number): {
  toggle: (currentlyLiked: boolean) => void;
  isPending: boolean;
} {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (currentlyLiked: boolean): Promise<void> => {
      if (currentlyLiked) {
        await unlikeList(listId);
      } else {
        await likeList(listId);
      }
    },
    onMutate: async (currentlyLiked: boolean) => {
      const key = listDetailKey(listId);
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<ListDetail>(key);
      if (snapshot) {
        qc.setQueryData<ListDetail>(key, {
          ...snapshot,
          is_liked: currentlyLiked ? 0 : 1,
          likes_count: Math.max(
            0,
            snapshot.likes_count + (currentlyLiked ? -1 : 1),
          ),
        });
      }
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        qc.setQueryData(listDetailKey(listId), ctx.snapshot);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: listDetailKey(listId) });
    },
  });

  return {
    toggle: (currentlyLiked: boolean) => {
      if (mutation.isPending) return;
      mutation.mutate(currentlyLiked);
    },
    isPending: mutation.isPending,
  };
}

/** One row in the `useListMembership` result. */
export interface ListMembershipRow {
  list: ListSummary;
  detail: ListDetail | undefined;
  /** The list_items.id when the title is in the list, otherwise null. */
  itemId: number | null;
  isLoading: boolean;
}

/** Locate the ListItem matching the given (tmdbId, mediaType) tuple. */
function findItem(
  detail: ListDetail | undefined,
  tmdbId: number,
  mediaType: 'film' | 'series',
): ListItem | undefined {
  if (!detail) return undefined;
  return detail.items.find((it) =>
    mediaType === 'film'
      ? it.film_tmdb_id === tmdbId
      : it.series_tmdb_id === tmdbId,
  );
}

/**
 * For each list owned by the user, runs a `useQuery` that fetches the
 * list's items and reports whether the given title is present.
 *
 * Only OWNED lists are returned — saved-but-not-owned lists are filtered
 * out because the backend forbids adding items to them.
 *
 * @param tmdbId - TMDB id of the film or series.
 * @param mediaType - 'film' or 'series'.
 */
export function useListMembership(
  tmdbId: number,
  mediaType: 'film' | 'series',
): { rows: ListMembershipRow[]; isLoading: boolean } {
  const listsQ = useMyLists();

  const ownedLists = useMemo<ListSummary[]>(
    () => (listsQ.data ?? []).filter((l) => l.is_saved === 0),
    [listsQ.data],
  );

  const detailResults = useQueries({
    queries: ownedLists.map((list) => ({
      queryKey: listDetailKey(list.id),
      queryFn: () => getListById(list.id),
      staleTime: 30 * 1000,
    })),
  });

  const rows = useMemo<ListMembershipRow[]>(() => {
    return ownedLists.map((list, idx) => {
      const result = detailResults[idx];
      const detail = result?.data;
      const item = findItem(detail, tmdbId, mediaType);
      return {
        list,
        detail,
        itemId: item ? item.id : null,
        isLoading: result?.isLoading ?? true,
      };
    });
  }, [ownedLists, detailResults, tmdbId, mediaType]);

  const isLoading =
    listsQ.isLoading || detailResults.some((r) => r.isLoading);

  return { rows, isLoading };
}

/**
 * Optimistically adds or removes a (tmdbId, mediaType) title to/from a
 * list. The optimistic patch updates the `['list', listId]` cache so
 * `useListMembership` re-derives membership immediately.
 */
export function useToggleListItem(
  tmdbId: number,
  mediaType: 'film' | 'series',
): {
  toggle: (args: { listId: number; itemId: number | null }) => void;
  isPending: boolean;
} {
  const qc = useQueryClient();

  const addMut = useMutation({
    mutationFn: async (listId: number): Promise<{ itemId: number }> => {
      const payload =
        mediaType === 'film'
          ? { film_id: tmdbId }
          : { series_id: tmdbId };
      return addItemToList(listId, payload);
    },
    onMutate: async (listId: number) => {
      const key = listDetailKey(listId);
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<ListDetail>(key);
      if (snapshot) {
        // Temporary negative id; replaced with real id after success.
        const tempItem: ListItem = {
          id: -Date.now(),
          position: snapshot.items.length + 1,
          note: null,
          added_at: new Date().toISOString(),
          film_tmdb_id: mediaType === 'film' ? tmdbId : null,
          film_title: null,
          film_poster: null,
          film_backdrop: null,
          film_overview: null,
          film_release_date: null,
          film_release_year: null,
          film_director: null,
          film_runtime_min: null,
          series_tmdb_id: mediaType === 'series' ? tmdbId : null,
          series_title: null,
          series_poster: null,
          series_backdrop: null,
          series_overview: null,
          series_first_air_date: null,
          series_first_air_year: null,
          series_creator: null,
          series_number_of_seasons: null,
        };
        qc.setQueryData<ListDetail>(key, {
          ...snapshot,
          items_count: snapshot.items_count + 1,
          items: [...snapshot.items, tempItem],
        });
      }
      return { snapshot };
    },
    onError: (_err, listId, ctx) => {
      if (ctx?.snapshot) {
        qc.setQueryData(listDetailKey(listId), ctx.snapshot);
      }
    },
    onSettled: (_data, _err, listId) => {
      void qc.invalidateQueries({ queryKey: listDetailKey(listId) });
    },
  });

  const removeMut = useMutation({
    mutationFn: async (vars: {
      listId: number;
      itemId: number;
    }): Promise<void> => {
      await removeItemFromList(vars.listId, vars.itemId);
    },
    onMutate: async (vars) => {
      const key = listDetailKey(vars.listId);
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<ListDetail>(key);
      if (snapshot) {
        qc.setQueryData<ListDetail>(key, {
          ...snapshot,
          items_count: Math.max(snapshot.items_count - 1, 0),
          items: snapshot.items.filter((it) => it.id !== vars.itemId),
        });
      }
      return { snapshot };
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.snapshot) {
        qc.setQueryData(listDetailKey(vars.listId), ctx.snapshot);
      }
    },
    onSettled: (_data, _err, vars) => {
      void qc.invalidateQueries({ queryKey: listDetailKey(vars.listId) });
    },
  });

  const toggle = ({
    listId,
    itemId,
  }: {
    listId: number;
    itemId: number | null;
  }): void => {
    if (addMut.isPending || removeMut.isPending) return;
    if (itemId == null) {
      addMut.mutate(listId);
    } else {
      removeMut.mutate({ listId, itemId });
    }
  };

  return { toggle, isPending: addMut.isPending || removeMut.isPending };
}

/**
 * Creates a new list. Invalidates the user's lists summary on success so
 * the Add to List drawer shows the new list immediately.
 */
export function useCreateList(): {
  create: (payload: CreateListPayload) => Promise<ListSummary>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (payload: CreateListPayload): Promise<ListSummary> =>
      createList(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: MY_LISTS_KEY });
    },
  });
  return { create: mut.mutateAsync, isPending: mut.isPending };
}

/**
 * Uploads (or replaces) a list's icon. Invalidates the affected list's
 * detail and the lists summary on success.
 */
export function useUploadListIcon(): {
  upload: (args: { listId: number; imageUri: string }) => Promise<string>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (args: {
      listId: number;
      imageUri: string;
    }): Promise<string> => uploadListIcon(args.listId, args.imageUri),
    onSuccess: (_url, args) => {
      void qc.invalidateQueries({ queryKey: listDetailKey(args.listId) });
      void qc.invalidateQueries({ queryKey: MY_LISTS_KEY });
    },
  });
  return { upload: mut.mutateAsync, isPending: mut.isPending };
}

/**
 * Invalidates the user's lists summary and every list's detail.
 * Use after the Add to List drawer is dismissed so other surfaces
 * (film/series detail, profile) reflect the changes.
 */
export function useInvalidateLists(): () => void {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: MY_LISTS_KEY });
    void qc.invalidateQueries({ queryKey: ['list'] });
  };
}

/**
 * Loads the contents (subfolders + lists) of a folder. Passing `null`
 * loads the root level. Disabled when signed out.
 * @param folderId - The folder to open, or null for the root level.
 */
export function useFolderContents(
  folderId: number | null,
): UseQueryResult<FolderContents> {
  const { user } = useAuth();
  return useQuery({
    queryKey: folderContentsKey(folderId),
    queryFn: () => fetchFolderContents(folderId),
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}

/** Loads the user's full folder tree (flat) + root list count. */
export function useFolderTree(): UseQueryResult<FolderTreeData> {
  const { user } = useAuth();
  return useQuery({
    queryKey: FOLDER_TREE_KEY,
    queryFn: () => fetchFolderTree(),
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}

/**
 * Creates a folder. Invalidates the affected folder-contents view and the
 * folder tree so the new folder appears immediately.
 */
export function useCreateFolder(): {
  create: (args: {
    name: string;
    parentFolderId: number | null;
  }) => Promise<ListFolder>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (args: {
      name: string;
      parentFolderId: number | null;
    }): Promise<ListFolder> => createFolder(args.name, args.parentFolderId),
    onSuccess: (_folder, args) => {
      void qc.invalidateQueries({
        queryKey: folderContentsKey(args.parentFolderId),
      });
      void qc.invalidateQueries({ queryKey: FOLDER_TREE_KEY });
    },
  });
  return { create: mut.mutateAsync, isPending: mut.isPending };
}

/**
 * Moves a list into a folder (or back to the root when `folderId` is null).
 * Invalidates every folder-contents view, the folder tree, and the flat
 * lists summary so the list disappears from its old location.
 */
export function useMoveListToFolder(): {
  move: (args: { listId: number; folderId: number | null }) => Promise<void>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (args: {
      listId: number;
      folderId: number | null;
    }): Promise<void> => moveListToFolder(args.listId, args.folderId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lists', 'folder-contents'] });
      void qc.invalidateQueries({ queryKey: FOLDER_TREE_KEY });
      void qc.invalidateQueries({ queryKey: MY_LISTS_KEY });
    },
  });
  return { move: mut.mutateAsync, isPending: mut.isPending };
}

/**
 * Pins a list inside its current folder. Invalidates the folder-contents
 * view the list lives in so the re-ordered list appears immediately.
 * @param folderId - The folder the list lives in (null = root).
 */
export function usePinList(folderId: number | null): {
  pin: (listId: number) => Promise<void>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (listId: number): Promise<void> => pinList(listId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: folderContentsKey(folderId) });
    },
  });
  return { pin: mut.mutateAsync, isPending: mut.isPending };
}

/**
 * Removes the pin from a list. Invalidates the same folder-contents view.
 * @param folderId - The folder the list lives in (null = root).
 */
export function useUnpinList(folderId: number | null): {
  unpin: (listId: number) => Promise<void>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (listId: number): Promise<void> => unpinList(listId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: folderContentsKey(folderId) });
    },
  });
  return { unpin: mut.mutateAsync, isPending: mut.isPending };
}

/**
 * Deletes a list. Invalidates every folder-contents view and the flat
 * lists summary so the deleted list disappears everywhere.
 */
export function useDeleteList(): {
  remove: (listId: number) => Promise<void>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (listId: number): Promise<void> => deleteList(listId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lists', 'folder-contents'] });
      void qc.invalidateQueries({ queryKey: FOLDER_TREE_KEY });
      void qc.invalidateQueries({ queryKey: MY_LISTS_KEY });
    },
  });
  return { remove: mut.mutateAsync, isPending: mut.isPending };
}
