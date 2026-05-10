/**
 * Unified search-result types used across the Log screen.
 *
 * The shapes here are normalised projections that the search hooks
 * produce from the various backend responses (typed search, all-search,
 * and recent_searches rows). Components consume only these types.
 */

export type SearchResultType = 'film' | 'series' | 'person' | 'list' | 'member';

/** A film result from the search endpoint or a recent searches row. */
export interface FilmSearchResult {
  type: 'film';
  /** TMDB id — used as the stable key for navigation and watchlist actions. */
  tmdbId: number;
  title: string;
  /** TMDB poster path (e.g. "/abc.jpg") OR a fully-qualified thumbnail URL. */
  posterPath: string | null;
  /** Year only — extracted from the TMDB release_date. */
  year: string | null;
  /** Optional director name (only set when prefetched). */
  director: string | null;
}

/** A series result. */
export interface SeriesSearchResult {
  type: 'series';
  tmdbId: number;
  title: string;
  posterPath: string | null;
  year: string | null;
  /** Series creator (when available). */
  creator: string | null;
}

/** A cast/crew person result. */
export interface PersonSearchResult {
  type: 'person';
  tmdbId: number;
  name: string;
  profilePath: string | null;
  /** Uppercase department label, e.g. "DIRECTOR", "ACTOR". */
  role: string;
  /** Most popular known-for title */
  knownFor: string | null;
}

/** A user-curated list result. */
export interface ListSearchResultItem {
  type: 'list';
  id: number;
  title: string;
  itemsCount: number;
  ownerUsername: string;
  /**
   * Up to 6 poster paths used to build the small collage thumbnail.
   * Empty array if the list has no items yet (rare in search results).
   */
  posterPaths: (string | null)[];
}

/** A member (other user) result. */
export interface MemberSearchResult {
  type: 'member';
  id: number;
  username: string;
  /** Display name; falls back to the username when null on the backend. */
  displayName: string;
  avatarUrl: string | null;
  /** True when the current user already follows this member. Undefined when unauthenticated. */
  isFollowing?: boolean;
}

export type SearchResult =
  | FilmSearchResult
  | SeriesSearchResult
  | PersonSearchResult
  | ListSearchResultItem
  | MemberSearchResult;
