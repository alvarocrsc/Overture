import { query, execute } from '../config/db';
import { tmdbFetch } from '../config/tmdb';
import { AppError } from '../utils/app-error';
import type {
  TmdbSearchResponse,
  TmdbTvSearchResponse,
  TmdbPersonSearchResponse,
} from '../types/tmdb.types';

// ---------------------------------------------------------------------------
// Exported result shapes
// ---------------------------------------------------------------------------

export interface FilmResult {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  overview: string;
  media_type: 'film';
}

export interface SeriesResult {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  first_air_date: string;
  overview: string;
  media_type: 'series';
}

export interface PersonResult {
  tmdb_id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  /** Title of the first known_for item, or null if absent. */
  known_for: string | null;
  media_type: 'person';
}

export interface ListSearchResult {
  id: number;
  title: string;
  description: string | null;
  items_count: number;
  owner_username: string;
  owner_avatar: string | null;
  media_type: 'list';
}

export interface MemberResult {
  id: number;
  username: string;
  name: string | null;
  avatar_url: string | null;
  media_type: 'member';
}

export interface RecentSearchRow {
  id: number;
  type: 'film' | 'series' | 'person' | 'list' | 'member';
  result_id: number;
  display_title: string | null;
  display_subtitle: string | null;
  thumbnail_url: string | null;
  searched_at: Date;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type RecentType = 'film' | 'series' | 'person' | 'list' | 'member';

interface ListDbRow {
  id: number;
  title: string;
  description: string | null;
  items_count: number;
  owner_username: string;
  owner_avatar: string | null;
}

interface MemberDbRow {
  id: number;
  username: string;
  name: string | null;
  avatar_url: string | null;
}

interface RecentSearchOwnerRow {
  id: number;
  user_id: number;
}

type TypedSearchResult =
  | FilmResult
  | SeriesResult
  | PersonResult
  | ListSearchResult
  | MemberResult;

interface AllSearchData {
  films: FilmResult[];
  series: SeriesResult[];
  people: PersonResult[];
  lists: ListSearchResult[];
  members: MemberResult[];
}

export type SearchResponse =
  | { data: TypedSearchResult[]; total: number; page: number; limit: number }
  | { data: AllSearchData };

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** Builds a full TMDB image URL from a path, or returns null. */
function tmdbThumbnail(path: string | null): string | null {
  return path ? `https://image.tmdb.org/t/p/w185${path}` : null;
}

/** Maps a raw type string to a valid RecentType or 'all', defaulting to 'all'. */
function resolveSearchType(raw: string | undefined): RecentType | 'all' {
  const valid = ['film', 'series', 'person', 'list', 'member', 'all'] as const;
  if (raw && (valid as readonly string[]).includes(raw)) {
    return raw as RecentType | 'all';
  }
  return 'all';
}

async function fetchFilmResults(
  q: string,
  limit: number,
  page: number,
): Promise<{ results: FilmResult[]; total: number }> {
  const data = await tmdbFetch<TmdbSearchResponse>('/search/movie', {
    query: q,
    page: String(page),
  });
  const results = data.results.slice(0, limit).map((m) => ({
    tmdb_id: m.id,
    title: m.title,
    poster_path: m.poster_path,
    release_date: m.release_date,
    overview: m.overview,
    media_type: 'film' as const,
  }));
  return { results, total: data.total_results };
}

async function fetchSeriesResults(
  q: string,
  limit: number,
  page: number,
): Promise<{ results: SeriesResult[]; total: number }> {
  const data = await tmdbFetch<TmdbTvSearchResponse>('/search/tv', {
    query: q,
    page: String(page),
  });
  const results = data.results.slice(0, limit).map((s) => ({
    tmdb_id: s.id,
    title: s.name,
    poster_path: s.poster_path,
    first_air_date: s.first_air_date,
    overview: s.overview,
    media_type: 'series' as const,
  }));
  return { results, total: data.total_results };
}

async function fetchPersonResults(
  q: string,
  limit: number,
  page: number,
): Promise<{ results: PersonResult[]; total: number }> {
  const data = await tmdbFetch<TmdbPersonSearchResponse>('/search/person', {
    query: q,
    page: String(page),
  });
  const results = data.results.slice(0, limit).map((p) => {
    const firstKnown = p.known_for[0];
    const knownFor = firstKnown ? (firstKnown.title ?? firstKnown.name ?? null) : null;
    return {
      tmdb_id: p.id,
      name: p.name,
      profile_path: p.profile_path,
      known_for_department: p.known_for_department,
      known_for: knownFor,
      media_type: 'person' as const,
    };
  });
  return { results, total: data.total_results };
}

async function fetchListResults(
  q: string,
  limit: number,
  page: number,
): Promise<{ results: ListSearchResult[]; total: number }> {
  const offset = (page - 1) * limit;

  const [countRow] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total
     FROM lists l
     WHERE l.is_public = 1 AND l.title LIKE CONCAT('%', ?, '%')`,
    [q],
  );
  // COUNT(*) always returns a row — non-null assertion is safe.
  const total = countRow!.total;

  const rows = await query<ListDbRow>(
    `SELECT l.id, l.title, l.description, l.items_count,
            u.username AS owner_username, u.avatar_url AS owner_avatar
     FROM lists l
     JOIN users u ON l.user_id = u.id
     WHERE l.is_public = 1 AND l.title LIKE CONCAT('%', ?, '%')
     LIMIT ${limit} OFFSET ${offset}`,
    [q],
  );

  const results = rows.map((r) => ({ ...r, media_type: 'list' as const }));
  return { results, total };
}

async function fetchMemberResults(
  q: string,
  limit: number,
  page: number,
): Promise<{ results: MemberResult[]; total: number }> {
  const offset = (page - 1) * limit;

  const [countRow] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total
     FROM users
     WHERE username LIKE CONCAT('%', ?, '%') OR name LIKE CONCAT('%', ?, '%')`,
    [q, q],
  );
  // COUNT(*) always returns a row — non-null assertion is safe.
  const total = countRow!.total;

  const rows = await query<MemberDbRow>(
    `SELECT id, username, name, avatar_url
     FROM users
     WHERE username LIKE CONCAT('%', ?, '%') OR name LIKE CONCAT('%', ?, '%')
     LIMIT ${limit} OFFSET ${offset}`,
    [q, q],
  );

  const results = rows.map((r) => ({ ...r, media_type: 'member' as const }));
  return { results, total };
}

async function saveRecentSearchEntry(
  userId: number,
  type: RecentType,
  resultId: number,
  displayTitle: string | null,
  displaySubtitle: string | null,
  thumbnailUrl: string | null,
): Promise<void> {
  await execute(
    `INSERT INTO recent_searches
       (user_id, type, result_id, display_title, display_subtitle, thumbnail_url, searched_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE searched_at = NOW()`,
    [userId, type, resultId, displayTitle, displaySubtitle, thumbnailUrl],
  );
}

/** Saves the first result from a typed search to recent_searches. */
async function saveFirstResult(
  userId: number,
  type: RecentType,
  films: FilmResult[],
  series: SeriesResult[],
  people: PersonResult[],
  lists: ListSearchResult[],
  members: MemberResult[],
): Promise<void> {
  switch (type) {
    case 'film': {
      const r = films[0];
      if (r) await saveRecentSearchEntry(userId, 'film', r.tmdb_id, r.title, r.release_date || null, tmdbThumbnail(r.poster_path));
      break;
    }
    case 'series': {
      const r = series[0];
      if (r) await saveRecentSearchEntry(userId, 'series', r.tmdb_id, r.title, r.first_air_date || null, tmdbThumbnail(r.poster_path));
      break;
    }
    case 'person': {
      const r = people[0];
      if (r) await saveRecentSearchEntry(userId, 'person', r.tmdb_id, r.name, r.known_for_department || null, tmdbThumbnail(r.profile_path));
      break;
    }
    case 'list': {
      const r = lists[0];
      if (r) await saveRecentSearchEntry(userId, 'list', r.id, r.title, r.owner_username, r.owner_avatar);
      break;
    }
    case 'member': {
      const r = members[0];
      if (r) await saveRecentSearchEntry(userId, 'member', r.id, r.username, r.name ?? null, r.avatar_url ?? null);
      break;
    }
    default: {
      const _exhaustive: never = type;
      throw new AppError(`Unknown search type: ${String(_exhaustive)}`, 400);
    }
  }
}

async function runTypedSearch(
  userId: number,
  q: string,
  type: RecentType,
  limit: number,
  page: number,
): Promise<{ data: TypedSearchResult[]; total: number; page: number; limit: number }> {
  switch (type) {
    case 'film': {
      const { results, total } = await fetchFilmResults(q, limit, page);
      await saveFirstResult(userId, 'film', results, [], [], [], []);
      return { data: results, total, page, limit };
    }
    case 'series': {
      const { results, total } = await fetchSeriesResults(q, limit, page);
      await saveFirstResult(userId, 'series', [], results, [], [], []);
      return { data: results, total, page, limit };
    }
    case 'person': {
      const { results, total } = await fetchPersonResults(q, limit, page);
      await saveFirstResult(userId, 'person', [], [], results, [], []);
      return { data: results, total, page, limit };
    }
    case 'list': {
      const { results, total } = await fetchListResults(q, limit, page);
      await saveFirstResult(userId, 'list', [], [], [], results, []);
      return { data: results, total, page, limit };
    }
    case 'member': {
      const { results, total } = await fetchMemberResults(q, limit, page);
      await saveFirstResult(userId, 'member', [], [], [], [], results);
      return { data: results, total, page, limit };
    }
    default: {
      const _exhaustive: never = type;
      throw new AppError(`Unknown search type: ${String(_exhaustive)}`, 400);
    }
  }
}

async function runAllSearch(userId: number, q: string): Promise<{ data: AllSearchData }> {
  const [films, series, people, lists, members] = await Promise.all([
    fetchFilmResults(q, 5, 1),
    fetchSeriesResults(q, 5, 1),
    fetchPersonResults(q, 5, 1),
    fetchListResults(q, 5, 1),
    fetchMemberResults(q, 5, 1),
  ]);

  // Save only if exactly one category has results — multiple populated
  // categories would produce noisy/ambiguous recent search entries.
  const nonEmpty = (
    [
      films.results.length > 0 ? ('film' as const) : null,
      series.results.length > 0 ? ('series' as const) : null,
      people.results.length > 0 ? ('person' as const) : null,
      lists.results.length > 0 ? ('list' as const) : null,
      members.results.length > 0 ? ('member' as const) : null,
    ] as Array<RecentType | null>
  ).filter((t): t is RecentType => t !== null);

  if (nonEmpty.length === 1) {
    const dominant = nonEmpty[0]!;
    await saveFirstResult(
      userId,
      dominant,
      films.results,
      series.results,
      people.results,
      lists.results,
      members.results,
    );
  }

  return {
    data: {
      films: films.results,
      series: series.results,
      people: people.results,
      lists: lists.results,
      members: members.results,
    },
  };
}

// ---------------------------------------------------------------------------
// Exported service functions
// ---------------------------------------------------------------------------

/**
 * Searches across one or more source types.
 * Validates and trims the query string, resolves the type, fetches results,
 * and saves the first result to the user's recent searches.
 * @param userId - The authenticated user's ID.
 * @param rawQ - The raw search query string from the request.
 * @param rawType - The raw type param ('film'|'series'|'person'|'list'|'member'|'all').
 * @param limit - Max results per source (capped at 20).
 * @param page - 1-based page number.
 * @returns Typed or grouped search results.
 */
export async function search(
  userId: number,
  rawQ: string,
  rawType: string | undefined,
  limit: number,
  page: number,
): Promise<SearchResponse> {
  const q = rawQ.trim();
  if (!q) throw new AppError('Query required', 400);

  const type = resolveSearchType(rawType);
  const clampedLimit = Math.min(limit, 20);

  if (type === 'all') {
    return runAllSearch(userId, q);
  }
  return runTypedSearch(userId, q, type, clampedLimit, page);
}

/**
 * Returns the 10 most recent search entries for the user.
 * @param userId - The authenticated user's ID.
 * @returns Recent search rows ordered by most recent first.
 */
export async function getRecentSearches(userId: number): Promise<RecentSearchRow[]> {
  return query<RecentSearchRow>(
    `SELECT id, type, result_id, display_title, display_subtitle, thumbnail_url, searched_at
     FROM recent_searches
     WHERE user_id = ?
     ORDER BY searched_at DESC
     LIMIT 10`,
    [userId],
  );
}

/**
 * Deletes a single recent search entry owned by the user.
 * Throws 404 if not found, 403 if the entry belongs to another user.
 * @param searchId - The recent_searches row primary key.
 * @param userId - The authenticated user's ID.
 */
export async function deleteRecentSearch(searchId: number, userId: number): Promise<void> {
  const [row] = await query<RecentSearchOwnerRow>(
    `SELECT id, user_id FROM recent_searches WHERE id = ?`,
    [searchId],
  );
  if (!row) throw new AppError('Search not found', 404);
  if (row.user_id !== userId) throw new AppError('Forbidden', 403);
  await execute(`DELETE FROM recent_searches WHERE id = ?`, [searchId]);
}

/**
 * Clears all recent search history for the user.
 * @param userId - The authenticated user's ID.
 */
export async function clearRecentSearches(userId: number): Promise<void> {
  await execute(`DELETE FROM recent_searches WHERE user_id = ?`, [userId]);
}
