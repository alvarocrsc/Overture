import type { WatchlistItemRow } from '@/src/hooks/useWatchlist';
import type { MediaType, NormalizedListItem } from '@/src/types/lists.types';

/**
 * Collapses a raw {@link WatchlistItemRow} — which carries parallel `film_*`
 * and `series_*` columns — into a single media-agnostic
 * {@link NormalizedListItem}, the shape every shared list component consumes.
 *
 * This lets the watchlist reuse the list detail screen's grid, expanded feed,
 * header collage and count line unchanged. The media type is inferred from
 * whichever tmdb id is present; films take precedence if (unexpectedly) both
 * are set.
 *
 * @param row - The raw watchlist row from the API.
 * @param index - The row's position in the watchlist, used for `position`
 *   (the watchlist is unranked, so this only affects tie-break ordering).
 * @returns A flattened item, or null when neither a film nor a series is linked.
 */
export function normalizeWatchlistItem(
  row: WatchlistItemRow,
  index: number,
): NormalizedListItem | null {
  const position = index + 1;
  const filmTmdbId = row.film_tmdb_id;
  const seriesTmdbId = row.series_tmdb_id;

  if (filmTmdbId != null) {
    const year =
      row.film_release_year != null
        ? String(row.film_release_year)
        : row.film_release_date
          ? row.film_release_date.slice(0, 4)
          : null;
    return {
      itemId: row.id,
      position,
      mediaType: 'film' satisfies MediaType,
      tmdbId: filmTmdbId,
      title: row.film_title ?? '',
      posterPath: row.film_poster,
      backdropPath: row.film_backdrop,
      overview: row.film_overview,
      year,
      directorOrCreator: row.film_director,
      runtimeOrSeasons: row.film_runtime_min,
    };
  }

  if (seriesTmdbId != null) {
    const year =
      row.series_first_air_year != null
        ? String(row.series_first_air_year)
        : row.series_first_air_date
          ? row.series_first_air_date.slice(0, 4)
          : null;
    return {
      itemId: row.id,
      position,
      mediaType: 'series' satisfies MediaType,
      tmdbId: seriesTmdbId,
      title: row.series_title ?? '',
      posterPath: row.series_poster,
      backdropPath: row.series_backdrop,
      overview: row.series_overview,
      year,
      directorOrCreator: row.series_creator,
      runtimeOrSeasons: row.series_number_of_seasons,
    };
  }

  return null;
}

/**
 * Normalizes a watchlist's rows, dropping any that reference neither a film
 * nor a series.
 *
 * @param rows - The raw watchlist rows.
 * @returns The normalized, filtered items.
 */
export function normalizeWatchlistItems(
  rows: WatchlistItemRow[],
): NormalizedListItem[] {
  const result: NormalizedListItem[] = [];
  rows.forEach((row, index) => {
    const normalized = normalizeWatchlistItem(row, index);
    if (normalized) result.push(normalized);
  });
  return result;
}
