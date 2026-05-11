import { useInfiniteQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';

/** A single film result returned by the trending and search endpoints. */
export interface FilmResult {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_date?: string | null;
  director?: string | null;
}

/** Paginated response shape from GET /films/trending and GET /films/search. */
interface PaginatedFilmsResult {
  data: FilmResult[];
  page: number;
  total_pages: number;
}

async function fetchTrendingFilms(page: number): Promise<PaginatedFilmsResult> {
  const res = await api.get<PaginatedFilmsResult>('/films/trending', { params: { page } });
  return res.data;
}

async function fetchSearchFilms(query: string, page: number): Promise<PaginatedFilmsResult> {
  const res = await api.get<PaginatedFilmsResult>('/films/search', {
    params: { q: query, page },
  });
  return res.data;
}

/**
 * Fetches trending films with infinite pagination.
 * Each call to fetchNextPage loads the next TMDB page.
 */
export function useTrendingFilms() {
  return useInfiniteQuery({
    queryKey: ['films', 'trending'],
    queryFn: ({ pageParam }) => fetchTrendingFilms(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
  });
}

async function fetchTopRatedFilms(page: number): Promise<PaginatedFilmsResult> {
  const res = await api.get<PaginatedFilmsResult>('/films/top-rated', { params: { page } });
  return res.data;
}

/**
 * Fetches top-rated films with infinite pagination.
 * Each call to fetchNextPage loads the next TMDB page.
 */
export function useTopRatedFilms() {
  return useInfiniteQuery({
    queryKey: ['films', 'top-rated'],
    queryFn: ({ pageParam }) => fetchTopRatedFilms(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
  });
}

/**
 * Searches films with infinite pagination. Only active when query is non-empty.
 * The queryKey includes the query string so results are cached per unique term.
 *
 * @param query - The debounced search query.
 */
export function useSearchFilms(query: string) {
  return useInfiniteQuery({
    queryKey: ['films', 'search', query],
    queryFn: ({ pageParam }) => fetchSearchFilms(query, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    enabled: query.trim().length > 0,
  });
}
