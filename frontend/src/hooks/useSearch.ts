import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';
import type { FilterType } from '@/src/components/log/FilterPills';
import type {
  FilmSearchResult,
  ListSearchResultItem,
  MemberSearchResult,
  PersonSearchResult,
  SearchResult,
  SeriesSearchResult,
} from '@/src/types/search.types';

interface FilmApiRow {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  director: string | null;
  media_type: 'film';
}
interface SeriesApiRow {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  first_air_date: string;
  creator: string | null;
  media_type: 'series';
}
interface PersonApiRow {
  tmdb_id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  known_for: string | null;
  media_type: 'person';
}
interface ListApiRow {
  id: number;
  title: string;
  items_count: number;
  owner_username: string;
  media_type: 'list';
}
interface MemberApiRow {
  id: number;
  username: string;
  name: string | null;
  avatar_url: string | null;
  is_following?: boolean;
  media_type: 'member';
}
type AnyApiRow = FilmApiRow | SeriesApiRow | PersonApiRow | ListApiRow | MemberApiRow;

interface TypedResponse {
  data: AnyApiRow[];
}
interface AllResponse {
  data: {
    films: FilmApiRow[];
    series: SeriesApiRow[];
    people: PersonApiRow[];
    lists: ListApiRow[];
    members: MemberApiRow[];
  };
}

const FILTER_TO_API: Record<FilterType, string> = {
  media: 'media',
  cast: 'person',
  members: 'member',
  lists: 'list',
  all: 'all',
};

function toYear(date: string | null | undefined): string | null {
  if (!date) return null;
  const match = date.match(/^(\d{4})/);
  return match ? (match[1] ?? null) : null;
}

function mapFilm(row: FilmApiRow): FilmSearchResult {
  return {
    type: 'film',
    tmdbId: row.tmdb_id,
    title: row.title,
    posterPath: row.poster_path,
    year: toYear(row.release_date),
    director: row.director ?? null,
  };
}
function mapSeries(row: SeriesApiRow): SeriesSearchResult {
  return {
    type: 'series',
    tmdbId: row.tmdb_id,
    title: row.title,
    posterPath: row.poster_path,
    year: toYear(row.first_air_date),
    creator: row.creator ?? null,
  };
}
function mapPerson(row: PersonApiRow): PersonSearchResult {
  return {
    type: 'person',
    tmdbId: row.tmdb_id,
    name: row.name,
    profilePath: row.profile_path,
    role: row.known_for_department || 'Person',
    knownFor: row.known_for,
  };
}
function mapList(row: ListApiRow): ListSearchResultItem {
  return {
    type: 'list',
    id: row.id,
    title: row.title,
    itemsCount: row.items_count,
    ownerUsername: row.owner_username,
    posterPaths: [],
  };
}
function mapMember(row: MemberApiRow): MemberSearchResult {
  return {
    type: 'member',
    id: row.id,
    username: row.username,
    displayName: row.name ?? row.username,
    avatarUrl: row.avatar_url,
    isFollowing: row.is_following,
  };
}

function mapRow(row: AnyApiRow): SearchResult {
  switch (row.media_type) {
    case 'film':
      return mapFilm(row);
    case 'series':
      return mapSeries(row);
    case 'person':
      return mapPerson(row);
    case 'list':
      return mapList(row);
    case 'member':
      return mapMember(row);
  }
}

/**
 * Debounced search hook. Fires GET /search?q=&type= 400ms after the
 * user stops typing, only when the query is at least 2 chars.
 */
export function useSearch(rawQuery: string, filter: FilterType) {
  const [debounced, setDebounced] = useState(rawQuery);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(rawQuery), 400);
    return () => clearTimeout(handle);
  }, [rawQuery]);

  const trimmedRaw = rawQuery.trim();
  const trimmed = debounced.trim();
  const enabled = trimmed.length >= 2;
  const rawEnabled = trimmedRaw.length >= 2;

  const query = useQuery({
    queryKey: ['search', trimmed, filter],
    enabled,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<SearchResult[]> => {
      const apiType = FILTER_TO_API[filter];
      const res = await api.get<TypedResponse | AllResponse>('/search', {
        params: { q: trimmed, type: apiType, limit: 10 },
      });
      const body = res.data;
      if (Array.isArray((body as TypedResponse).data)) {
        return (body as TypedResponse).data.map(mapRow);
      }
      const all = (body as AllResponse).data;
      return [
        ...all.films.map(mapFilm),
        ...all.series.map(mapSeries),
        ...all.people.map(mapPerson),
        ...all.lists.map(mapList),
        ...all.members.map(mapMember),
      ];
    },
  });

  const debouncePending = rawEnabled && trimmedRaw !== trimmed;
  const isPending = rawEnabled && (debouncePending || query.isFetching);

  return {
    ...query,
    isPending,
  };
}

