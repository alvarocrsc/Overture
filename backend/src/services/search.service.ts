import { query, execute } from '../config/db';
import { tmdbFetch } from '../config/tmdb';
import { AppError } from '../utils/app-error';
import type {
  TmdbSearchResponse,
  TmdbTvSearchResponse,
  TmdbPersonSearchResponse,
  TmdbCreditsResult,
  TmdbSeriesDetail,
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
  /** Director name, fetched from /movie/{id}/credits. Null if unavailable. */
  director: string | null;
  media_type: 'film';
}

export interface SeriesResult {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  first_air_date: string;
  overview: string;
  /** Series creator name, fetched from /tv/{id}.created_by[0]. Null if unavailable. */
  creator: string | null;
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

/**
 * Encodes a primary + secondary subtitle into a single `display_subtitle`
 * column using a `::` separator. The frontend splits this back into the
 * two pieces on render. If only one piece is available it is stored as-is
 * for backwards compatibility with already-stored rows.
 */
function packSubtitle(primary: string | null, secondary: string | null): string | null {
  if (primary && secondary) return `${primary}::${secondary}`;
  return primary ?? secondary ?? null;
}

/** Maps a raw type string to a valid search type, defaulting to 'all'. */
function resolveSearchType(raw: string | undefined): RecentType | 'all' | 'media' {
  const valid = ['film', 'series', 'person', 'list', 'member', 'all', 'media'] as const;
  if (raw && (valid as readonly string[]).includes(raw)) {
    return raw as RecentType | 'all' | 'media';
  }
  return 'all';
}

/** Fetches the director name for a single movie. Returns null on any failure. */
async function fetchDirector(tmdbId: number): Promise<string | null> {
  try {
    const credits = await tmdbFetch<TmdbCreditsResult>(`/movie/${tmdbId}/credits`);
    const director = credits.crew.find((c) => c.job === 'Director');
    return director?.name ?? null;
  } catch {
    return null;
  }
}

/** Fetches the creator name for a single TV series. Returns null on any failure. */
async function fetchCreator(tmdbId: number): Promise<string | null> {
  try {
    const detail = await tmdbFetch<TmdbSeriesDetail & { created_by?: Array<{ name: string }> }>(
      `/tv/${tmdbId}`,
    );
    return detail.created_by?.[0]?.name ?? null;
  } catch {
    return null;
  }
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
  const slice = data.results.slice(0, limit);
  const directors = await Promise.all(slice.map((m) => fetchDirector(m.id)));
  const results = slice.map((m, i) => ({
    tmdb_id: m.id,
    title: m.title,
    poster_path: m.poster_path,
    release_date: m.release_date,
    overview: m.overview,
    director: directors[i] ?? null,
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
  const slice = data.results.slice(0, limit);
  const creators = await Promise.all(slice.map((s) => fetchCreator(s.id)));
  const results = slice.map((s, i) => ({
    tmdb_id: s.id,
    title: s.name,
    poster_path: s.poster_path,
    first_air_date: s.first_air_date,
    overview: s.overview,
    creator: creators[i] ?? null,
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

/** Saves or refreshes a single recent_searches row for the user. */
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

async function runTypedSearch(
  q: string,
  type: RecentType,
  limit: number,
  page: number,
): Promise<{ data: TypedSearchResult[]; total: number; page: number; limit: number }> {
  switch (type) {
    case 'film': {
      const { results, total } = await fetchFilmResults(q, limit, page);
      return { data: results, total, page, limit };
    }
    case 'series': {
      const { results, total } = await fetchSeriesResults(q, limit, page);
      return { data: results, total, page, limit };
    }
    case 'person': {
      const { results, total } = await fetchPersonResults(q, limit, page);
      return { data: results, total, page, limit };
    }
    case 'list': {
      const { results, total } = await fetchListResults(q, limit, page);
      return { data: results, total, page, limit };
    }
    case 'member': {
      const { results, total } = await fetchMemberResults(q, limit, page);
      return { data: results, total, page, limit };
    }
    default: {
      const _exhaustive: never = type;
      throw new AppError(`Unknown search type: ${String(_exhaustive)}`, 400);
    }
  }
}

/** Fetches films and series in parallel and returns them as a flat interleaved list. */
async function runMediaSearch(
  q: string,
  limit: number,
  page: number,
): Promise<{ data: TypedSearchResult[]; total: number; page: number; limit: number }> {
  const perSource = Math.ceil(limit / 2);
  const [filmsRes, seriesRes] = await Promise.all([
    fetchFilmResults(q, perSource, page),
    fetchSeriesResults(q, perSource, page),
  ]);
  // Interleave: film, series, film, series … so neither type dominates the top.
  const interleaved: TypedSearchResult[] = [];
  const maxLen = Math.max(filmsRes.results.length, seriesRes.results.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < filmsRes.results.length) interleaved.push(filmsRes.results[i]!);
    if (i < seriesRes.results.length) interleaved.push(seriesRes.results[i]!);
  }
  return {
    data: interleaved.slice(0, limit),
    total: filmsRes.total + seriesRes.total,
    page,
    limit,
  };
}

async function runAllSearch(q: string): Promise<{ data: AllSearchData }> {
  const [films, series, people, lists, members] = await Promise.all([
    fetchFilmResults(q, 5, 1),
    fetchSeriesResults(q, 5, 1),
    fetchPersonResults(q, 5, 1),
    fetchListResults(q, 5, 1),
    fetchMemberResults(q, 5, 1),
  ]);

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
 * Validates and trims the query string, resolves the type, and fetches results.
 * Recent searches are NOT saved here — they are recorded only when the user
 * taps a result via {@link recordRecentSearch}.
 * @param rawQ - The raw search query string from the request.
 * @param rawType - The raw type param ('film'|'series'|'person'|'list'|'member'|'all').
 * @param limit - Max results per source (capped at 20).
 * @param page - 1-based page number.
 * @returns Typed or grouped search results.
 */
export async function search(
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
    return runAllSearch(q);
  }
  if (type === 'media') {
    return runMediaSearch(q, clampedLimit, page);
  }
  return runTypedSearch(q, type, clampedLimit, page);
}

/** Input shape for recording a recent search entry. */
export interface RecordRecentSearchInput {
  type: RecentType;
  resultId: number;
  displayTitle: string;
  /** Year / department / owner — first half of the packed subtitle. */
  primary: string | null;
  /** Director / creator / known-for — second half of the packed subtitle. */
  secondary: string | null;
  thumbnailUrl: string | null;
}

/**
 * Records a recent search when the user taps a result. Inserts a new row
 * or, on duplicate (user_id, type, result_id), refreshes `searched_at` so
 * the entry bubbles to the top of the list.
 * @param userId - The authenticated user's ID.
 * @param input - The search result selected by the user.
 */
export async function recordRecentSearch(
  userId: number,
  input: RecordRecentSearchInput,
): Promise<void> {
  const subtitle = packSubtitle(input.primary, input.secondary);
  await saveRecentSearchEntry(
    userId,
    input.type,
    input.resultId,
    input.displayTitle || null,
    subtitle,
    input.thumbnailUrl,
  );
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
