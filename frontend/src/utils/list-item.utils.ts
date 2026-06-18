import type {
  ListItem,
  MediaType,
  NormalizedListItem,
} from '@/src/types/lists.types';

/**
 * Collapses a raw {@link ListItem} — which carries parallel `film_*` and
 * `series_*` columns — into a single media-agnostic {@link NormalizedListItem}.
 *
 * The media type is inferred from whichever tmdb id is present. Films take
 * precedence if (unexpectedly) both are set.
 *
 * @param item - The raw list item row from the API.
 * @returns A flattened item, or null when neither a film nor a series is linked.
 */
export function normalizeListItem(item: ListItem): NormalizedListItem | null {
  const isFilm = item.film_tmdb_id != null;
  const isSeries = item.series_tmdb_id != null;

  if (!isFilm && !isSeries) return null;

  const mediaType: MediaType = isFilm ? 'film' : 'series';
  const tmdbId = isFilm ? item.film_tmdb_id! : item.series_tmdb_id!;

  if (isFilm) {
    const year =
      item.film_release_year != null
        ? String(item.film_release_year)
        : item.film_release_date
          ? item.film_release_date.slice(0, 4)
          : null;
    return {
      itemId: item.id,
      position: item.position,
      mediaType,
      tmdbId,
      title: item.film_title ?? '',
      posterPath: item.film_poster,
      backdropPath: item.film_backdrop,
      overview: item.film_overview,
      year,
      directorOrCreator: item.film_director,
      runtimeOrSeasons: item.film_runtime_min,
    };
  }

  const year =
    item.series_first_air_year != null
      ? String(item.series_first_air_year)
      : item.series_first_air_date
        ? item.series_first_air_date.slice(0, 4)
        : null;
  return {
    itemId: item.id,
    position: item.position,
    mediaType,
    tmdbId,
    title: item.series_title ?? '',
    posterPath: item.series_poster,
    backdropPath: item.series_backdrop,
    overview: item.series_overview,
    year,
    directorOrCreator: item.series_creator,
    runtimeOrSeasons: item.series_number_of_seasons,
  };
}

/**
 * Normalizes a list's items array, dropping any rows that reference neither
 * a film nor a series.
 *
 * @param items - The raw list items.
 * @returns The normalized, filtered items.
 */
export function normalizeListItems(
  items: ListItem[],
): NormalizedListItem[] {
  const result: NormalizedListItem[] = [];
  for (const item of items) {
    const normalized = normalizeListItem(item);
    if (normalized) result.push(normalized);
  }
  return result;
}
