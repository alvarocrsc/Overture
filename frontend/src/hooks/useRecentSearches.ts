import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';
import type { SearchResult } from '@/src/types/search.types';
import { posterUrl } from '@/src/lib/tmdb';

interface RecentSearchRow {
  id: number;
  type: 'film' | 'series' | 'person' | 'list' | 'member';
  result_id: number;
  display_title: string | null;
  display_subtitle: string | null;
  thumbnail_url: string | null;
  /** Only set for member-type entries; 1 = following, null = not following. */
  is_following: 1 | null;
}

interface RecentSearchesResponse {
  data: RecentSearchRow[];
}

interface RecentEntry {
  /** Database row id used by the delete endpoint. */
  rowId: number;
  result: SearchResult;
}

/** Extracts the leading 4-digit year from a stored date subtitle. */
function toYear(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})/);
  return match ? (match[1] ?? null) : null;
}

/**
 * Splits a packed `display_subtitle` ("primary::secondary") into its two
 * pieces. Falls back to `[value, null]` for legacy rows stored without a
 * separator.
 */
function splitSubtitle(value: string | null): [string | null, string | null] {
  if (!value) return [null, null];
  const idx = value.indexOf('::');
  if (idx === -1) return [value, null];
  const a = value.slice(0, idx).trim();
  const b = value.slice(idx + 2).trim();
  return [a || null, b || null];
}

function mapRecent(row: RecentSearchRow): RecentEntry {
  const title = row.display_title ?? '';
  const subtitle = row.display_subtitle;
  const thumb = row.thumbnail_url;
  const [primary, secondary] = splitSubtitle(subtitle);

  switch (row.type) {
    case 'film':
      return {
        rowId: row.id,
        result: {
          type: 'film',
          tmdbId: row.result_id,
          title,
          posterPath: thumb,
          year: toYear(primary),
          director: secondary,
        },
      };
    case 'series':
      return {
        rowId: row.id,
        result: {
          type: 'series',
          tmdbId: row.result_id,
          title,
          posterPath: thumb,
          year: toYear(primary),
          creator: secondary,
        },
      };
    case 'person':
      return {
        rowId: row.id,
        result: {
          type: 'person',
          tmdbId: row.result_id,
          name: title,
          profilePath: thumb,
          role: primary ?? 'Person',
          knownFor: secondary,
        },
      };
    case 'list':
      return {
        rowId: row.id,
        result: {
          type: 'list',
          id: row.result_id,
          title,
          itemsCount: 0,
          ownerUsername: primary ?? '',
          posterPaths: [],
        },
      };
    case 'member':
      return {
        rowId: row.id,
        result: {
          type: 'member',
          id: row.result_id,
          username: primary ?? title,
          displayName: title,
          avatarUrl: thumb,
          isFollowing: row.is_following === 1,
        },
      };
  }
}

/**
 * Fetches the current user's recent searches and exposes mutations
 * to remove a single entry or clear them all. Cached for 1 minute.
 */
export function useRecentSearches() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['recent-searches'],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<RecentEntry[]> => {
      const res = await api.get<RecentSearchesResponse>('/search/recent');
      return res.data.data.map(mapRecent);
    },
  });

  const remove = useMutation({
    mutationFn: async (rowId: number): Promise<void> => {
      await api.delete(`/search/recent/${rowId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recent-searches'] });
    },
  });

  const clear = useMutation({
    mutationFn: async (): Promise<void> => {
      await api.delete('/search/recent');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recent-searches'] });
    },
  });

  const record = useMutation({
    mutationFn: async (result: SearchResult): Promise<void> => {
      await api.post('/search/recent', toRecordPayload(result));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recent-searches'] });
    },
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    removeItem: (rowId: number) => remove.mutate(rowId),
    clearAll: () => clear.mutate(),
    recordTap: (result: SearchResult) => record.mutate(result),
    invalidate: () => qc.invalidateQueries({ queryKey: ['recent-searches'] }),
  };
}

interface RecordPayload {
  type: 'film' | 'series' | 'person' | 'list' | 'member';
  resultId: number;
  displayTitle: string;
  primary: string | null;
  secondary: string | null;
  thumbnailUrl: string | null;
}

function resolveThumb(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return posterUrl(path, 'w185');
}

/** Converts a tapped SearchResult into the POST /search/recent payload. */
function toRecordPayload(r: SearchResult): RecordPayload {
  switch (r.type) {
    case 'film':
      return {
        type: 'film',
        resultId: r.tmdbId,
        displayTitle: r.title,
        primary: r.year,
        secondary: r.director,
        thumbnailUrl: resolveThumb(r.posterPath),
      };
    case 'series':
      return {
        type: 'series',
        resultId: r.tmdbId,
        displayTitle: r.title,
        primary: r.year,
        secondary: r.creator,
        thumbnailUrl: resolveThumb(r.posterPath),
      };
    case 'person':
      return {
        type: 'person',
        resultId: r.tmdbId,
        displayTitle: r.name,
        primary: r.role,
        secondary: r.knownFor,
        thumbnailUrl: resolveThumb(r.profilePath),
      };
    case 'list':
      return {
        type: 'list',
        resultId: r.id,
        displayTitle: r.title,
        primary: r.ownerUsername,
        secondary: null,
        thumbnailUrl: null,
      };
    case 'member':
      return {
        type: 'member',
        resultId: r.id,
        displayTitle: r.displayName,
        primary: r.username,
        secondary: null,
        thumbnailUrl: resolveThumb(r.avatarUrl),
      };
  }
}
