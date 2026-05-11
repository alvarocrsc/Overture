import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import api from '@/src/lib/api';
import type { RecentActivityItem } from '@/src/types/profile.types';

/**
 * Backend row shape returned by GET /ratings/user/:userId — keeps both
 * film and series fields, only one populated per row.
 */
interface BackendRatingRow {
  id: number;
  value: number;
  is_rewatch: number | boolean;
  watched_on: string;
  film_tmdb_id: number | null;
  film_title: string | null;
  film_poster: string | null;
  series_tmdb_id: number | null;
  series_title: string | null;
  series_poster: string | null;
  review_id: number | null;
}

interface PaginatedResponse {
  data: BackendRatingRow[];
  total: number;
  page: number;
  limit: number;
}

/** Normalises a backend rating row to a `RecentActivityItem`. */
function normalise(row: BackendRatingRow): RecentActivityItem | null {
  const isFilm = row.film_tmdb_id != null;
  const tmdb_id = isFilm ? row.film_tmdb_id : row.series_tmdb_id;
  const title = isFilm ? row.film_title : row.series_title;
  const poster_path = isFilm ? row.film_poster : row.series_poster;
  if (tmdb_id == null || title == null) return null;
  return {
    id: row.id,
    rating_value: Number(row.value),
    is_rewatch: Boolean(row.is_rewatch),
    watched_on: row.watched_on,
    tmdb_id,
    title,
    poster_path,
    media_type: isFilm ? 'film' : 'series',
    review_id: row.review_id,
  };
}

/**
 * Fetches the most recent 4 logged ratings for a user.
 * @param userId - Profile owner's id.
 */
export function useRecentActivity(
  userId: number | undefined,
): UseQueryResult<RecentActivityItem[]> {
  return useQuery({
    queryKey: ['recent-activity', userId],
    queryFn: async (): Promise<RecentActivityItem[]> => {
      if (userId == null) return [];
      const res = await api.get<PaginatedResponse>(`/ratings/user/${userId}`, {
        params: { limit: 4, page: 1 },
      });
      const rows = res.data?.data;
      if (!Array.isArray(rows)) return [];
      return rows
        .map(normalise)
        .filter((r): r is RecentActivityItem => r !== null);
    },
    enabled: userId != null,
    staleTime: 60 * 1000,
  });
}
