import { useInfiniteQuery, type UseInfiniteQueryResult } from '@tanstack/react-query';
import api from '@/src/lib/api';
import type { MediaType } from '@/src/types/lists.types';
import type { LoggedTitle } from '@/src/types/library.types';

/** How many titles to request per page. The backend clamps `limit` to 100. */
const PAGE_SIZE = 60;

/**
 * Backend row shape from GET /ratings/user/:userId. Both film and series
 * columns are present; exactly one set is populated per row.
 */
interface BackendRatingRow {
  id: number;
  value: number;
  film_tmdb_id: number | null;
  film_title: string | null;
  film_poster: string | null;
  series_tmdb_id: number | null;
  series_title: string | null;
  series_poster: string | null;
  review_id: number | null;
  is_liked: number | boolean;
}

interface PaginatedResponse {
  data: BackendRatingRow[];
  total: number;
  page: number;
  limit: number;
}

/** Flattens a backend rating row into a media-agnostic `LoggedTitle`. */
function normalise(row: BackendRatingRow): LoggedTitle | null {
  const isFilm = row.film_tmdb_id != null;
  const tmdbId = isFilm ? row.film_tmdb_id : row.series_tmdb_id;
  const title = isFilm ? row.film_title : row.series_title;
  const posterPath = isFilm ? row.film_poster : row.series_poster;
  if (tmdbId == null || title == null) return null;
  return {
    ratingId: row.id,
    mediaType: isFilm ? 'film' : 'series',
    tmdbId,
    title,
    posterPath,
    ratingValue: Number(row.value),
    isLiked: Boolean(row.is_liked),
    reviewId: row.review_id,
  };
}

async function fetchLoggedTitlesPage(
  userId: number,
  mediaType: MediaType,
  page: number,
): Promise<PaginatedResponse> {
  const res = await api.get<PaginatedResponse>(`/ratings/user/${userId}`, {
    params: { type: mediaType, page, limit: PAGE_SIZE },
  });
  return res.data;
}

/**
 * Infinitely-paginated list of every film or series a user has logged, newest
 * first, with the star rating plus like / review state for each.
 *
 * Keyed under `['ratings', ...]` so it is invalidated by the same cache busts
 * the film/series action hooks and the importer already fire — logging,
 * liking, reviewing or importing a title refreshes the library automatically.
 *
 * The backend enforces one rating per (user, title) and one review per rating,
 * so each title appears exactly once with at most one `reviewId`. The query is
 * ordered newest-first, so if rewatch support later allows several
 * ratings/reviews per title, the most recent naturally surfaces.
 *
 * @param userId - Whose library to load; the query is disabled while undefined.
 * @param mediaType - 'film' or 'series'.
 */
export function useLoggedTitles(
  userId: number | undefined,
  mediaType: MediaType,
): UseInfiniteQueryResult<LoggedTitle[]> {
  return useInfiniteQuery({
    queryKey: ['ratings', 'logged-titles', userId, mediaType],
    queryFn: ({ pageParam }) =>
      fetchLoggedTitlesPage(userId as number, mediaType, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.page * lastPage.limit;
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
    enabled: userId != null,
    staleTime: 60 * 1000,
    select: (data) =>
      data.pages.flatMap((p) =>
        p.data
          .map(normalise)
          .filter((t): t is LoggedTitle => t !== null),
      ),
  });
}
