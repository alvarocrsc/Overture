import {
  useInfiniteQuery,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';

import api from '@/src/lib/api';
import type { BackdropOption } from '@/src/types/profile.types';

/** How many options to request per page. The backend caps `limit` at 40. */
const PAGE_SIZE = 20;

/** One page of the backend's response. */
interface BackdropOptionsPage {
  data: BackdropOption[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

/** Flattened result: every option loaded so far. */
export interface BackdropOptionsData {
  items: BackdropOption[];
}

async function fetchPage(
  searchQuery: string,
  page: number,
): Promise<BackdropOptionsPage> {
  const res = await api.get<BackdropOptionsPage>('/users/me/backdrop-options', {
    params: {
      page,
      limit: PAGE_SIZE,
      ...(searchQuery.length > 0 ? { q: searchQuery } : {}),
    },
  });
  return res.data;
}

/**
 * Infinitely-paginated banner options: the user's own titles ordered by how
 * highly they rated them, or a TMDB title search when `searchQuery` is set.
 *
 * The query key carries the search term, so typing swaps to a separate cached
 * list and clearing the field returns to the rated one without a refetch.
 *
 * @param searchQuery - Trimmed search term; empty string for the rated list.
 */
export function useBackdropOptions(
  searchQuery: string,
): UseInfiniteQueryResult<BackdropOptionsData> {
  return useInfiniteQuery({
    queryKey: ['backdrop-options', searchQuery],
    queryFn: ({ pageParam }) => fetchPage(searchQuery, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.page + 1 : undefined,
    staleTime: 60 * 1000,
    select: (data) => ({ items: data.pages.flatMap((p) => p.data) }),
  });
}
