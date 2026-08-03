import { query } from '../config/db';
import * as tmdbService from './tmdb.service';
import { upsertFilm } from './films.service';
import { upsertSeries } from './series.service';
import type { TmdbMovie, TmdbSeries } from '../types/tmdb.types';

/**
 * One selectable banner image. Backed by a title rather than a raw image path,
 * because `users.profile_backdrop_tmdb_id` stores the title and the profile
 * query resolves its backdrop — so only the title's primary backdrop can ever
 * be shown, and options without one are never returned.
 */
export interface BackdropOption {
  tmdb_id: number;
  media_type: 'film' | 'series';
  title: string;
  backdrop_path: string;
  /** The user's own score for this title, or null for an unrated search hit. */
  rating: number | null;
}

/** A page of options, with an explicit cursor for the infinite list. */
export interface BackdropOptionsPage {
  data: BackdropOption[];
  total: number;
  page: number;
  limit: number;
  /**
   * Whether another page exists. Returned explicitly rather than derived from
   * `total`, which counts matches before options lacking a backdrop are
   * dropped and so cannot tell the client when to stop.
   */
  has_more: boolean;
}

/** Options accepted by {@link getBackdropOptions}. */
export interface GetBackdropOptionsParams {
  /** Free-text title search. Omitted or blank returns the user's own titles. */
  q?: string | undefined;
  page: number;
  limit: number;
}

/** Row shape of the rated-titles union. */
interface RatedTitleRow {
  tmdb_id: number;
  media_type: 'film' | 'series';
  title: string;
  backdrop_path: string;
  rating: string | number;
}

/**
 * The user's own rated titles that have a backdrop, best first.
 *
 * A title rewatched several times contributes one option carrying its highest
 * score, so a rewatch can only ever promote a title, never split it into
 * duplicate rows.
 */
async function getRatedTitles(
  userId: number,
  page: number,
  limit: number,
): Promise<BackdropOptionsPage> {
  const offset = (page - 1) * limit;

  const [countRow] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM (
       SELECT f.tmdb_id
         FROM ratings r
         JOIN films f ON r.film_id = f.id
        WHERE r.user_id = ? AND f.backdrop_path IS NOT NULL
        GROUP BY f.tmdb_id
       UNION ALL
       SELECT s.tmdb_id
         FROM ratings r
         JOIN series s ON r.series_id = s.id
        WHERE r.user_id = ? AND s.backdrop_path IS NOT NULL
        GROUP BY s.tmdb_id
     ) t`,
    [userId, userId],
  );
  // COUNT(*) over a derived table always yields exactly one row.
  const total = countRow!.total;

  // LIMIT/OFFSET are interpolated because MySQL prepared statements reject
  // placeholders there; both are integers clamped by the caller.
  const rows = await query<RatedTitleRow>(
    `SELECT tmdb_id, media_type, title, backdrop_path, rating FROM (
       SELECT f.tmdb_id       AS tmdb_id,
              'film'          AS media_type,
              f.title         AS title,
              f.backdrop_path AS backdrop_path,
              MAX(r.value)    AS rating
         FROM ratings r
         JOIN films f ON r.film_id = f.id
        WHERE r.user_id = ? AND f.backdrop_path IS NOT NULL
        GROUP BY f.tmdb_id, f.title, f.backdrop_path
       UNION ALL
       SELECT s.tmdb_id       AS tmdb_id,
              'series'        AS media_type,
              s.title         AS title,
              s.backdrop_path AS backdrop_path,
              MAX(r.value)    AS rating
         FROM ratings r
         JOIN series s ON r.series_id = s.id
        WHERE r.user_id = ? AND s.backdrop_path IS NOT NULL
        GROUP BY s.tmdb_id, s.title, s.backdrop_path
     ) picks
      ORDER BY rating DESC, title ASC
      LIMIT ${limit} OFFSET ${offset}`,
    [userId, userId],
  );

  const data = rows.map<BackdropOption>((row) => ({
    tmdb_id: row.tmdb_id,
    media_type: row.media_type,
    title: row.title,
    backdrop_path: row.backdrop_path,
    // DECIMAL columns come back as strings from mysql2.
    rating: Number(row.rating),
  }));

  return { data, total, page, limit, has_more: offset + data.length < total };
}

/** Narrows a TMDB film to an option, dropping those with no backdrop. */
function filmToOption(film: TmdbMovie): BackdropOption | null {
  if (film.backdrop_path === null) return null;
  return {
    tmdb_id: film.id,
    media_type: 'film',
    title: film.title,
    backdrop_path: film.backdrop_path,
    rating: null,
  };
}

/** Narrows a TMDB series to an option, dropping those with no backdrop. */
function seriesToOption(series: TmdbSeries): BackdropOption | null {
  if (series.backdrop_path === null) return null;
  return {
    tmdb_id: series.id,
    media_type: 'series',
    title: series.name,
    backdrop_path: series.backdrop_path,
    rating: null,
  };
}

/**
 * Title search across TMDB, films and series interleaved.
 *
 * Results are upserted into the local cache as a side effect, which is what
 * later lets the profile query resolve a backdrop for a title the user has
 * never logged.
 */
async function searchTitles(
  searchQuery: string,
  page: number,
  limit: number,
): Promise<BackdropOptionsPage> {
  const [films, series] = await Promise.all([
    tmdbService.searchFilms(searchQuery, page),
    tmdbService.searchSeries(searchQuery, page),
  ]);

  // Only the selectable titles are cached: a result with no backdrop can never
  // be chosen, so writing it here would buy nothing.
  const selectableFilms = films.results.filter((f) => f.backdrop_path !== null);
  const selectableSeries = series.results.filter((s) => s.backdrop_path !== null);
  await Promise.all([
    ...selectableFilms.map((film) => upsertFilm(film)),
    ...selectableSeries.map((s) => upsertSeries(s)),
  ]);

  const filmOptions = selectableFilms
    .map(filmToOption)
    .filter((o): o is BackdropOption => o !== null);
  const seriesOptions = selectableSeries
    .map(seriesToOption)
    .filter((o): o is BackdropOption => o !== null);

  // Interleave so neither media type dominates the top of the list.
  const data: BackdropOption[] = [];
  const longest = Math.max(filmOptions.length, seriesOptions.length);
  for (let i = 0; i < longest; i++) {
    const film = filmOptions[i];
    const show = seriesOptions[i];
    if (film) data.push(film);
    if (show) data.push(show);
  }

  return {
    data,
    // TMDB counts every match, including the ones dropped above for having no
    // backdrop, so this is an upper bound — page on has_more, not on this.
    total: films.total_results + series.total_results,
    page,
    limit,
    has_more: page < Math.max(films.total_pages, series.total_pages),
  };
}

/**
 * Returns a page of images the user can set as their profile banner.
 *
 * With no query this is the user's own catalogue ordered by how highly they
 * rated each title; with one it is a TMDB title search. Both paths return the
 * same shape so the picker can swap between them without changing its list.
 *
 * @param userId - The authenticated user.
 * @param params - Search term (optional) plus 1-indexed page and page size.
 * @returns A page of backdrop options.
 */
export async function getBackdropOptions(
  userId: number,
  params: GetBackdropOptionsParams,
): Promise<BackdropOptionsPage> {
  const searchQuery = params.q?.trim() ?? '';
  if (searchQuery.length > 0) {
    return searchTitles(searchQuery, params.page, params.limit);
  }
  return getRatedTitles(userId, params.page, params.limit);
}
