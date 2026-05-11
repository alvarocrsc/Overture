import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { seriesKeys } from './useSeriesDetail';
import type { SeriesDisplayPrefs } from '@/src/types/series.types';

interface LogSeriesInput {
  /** Rating value in 0.5 increments, 0.5–5. */
  value: number;
  watched_on?: string;
  is_rewatch?: boolean;
  review?: {
    body: string;
    contains_spoilers?: boolean;
    liked_title?: boolean;
  };
}

interface UpdateDisplayPrefsInput {
  custom_poster_path?: string | null;
  custom_backdrop_path?: string | null;
}

/**
 * Bundle of mutations for interacting with a single series. Mirrors
 * useFilmActions but uses the series tmdb_id when creating ratings/watchlist
 * entries.
 */
export function useSeriesActions(tmdbId: number) {
  const qc = useQueryClient();

  const invalidateAll = (): void => {
    qc.invalidateQueries({ queryKey: ['series', tmdbId] });
    qc.invalidateQueries({ queryKey: ['series'] });
    qc.invalidateQueries({ queryKey: ['films'] });
    qc.invalidateQueries({ queryKey: ['trending'] });
    qc.invalidateQueries({ queryKey: ['watchlist'] });
    qc.invalidateQueries({ queryKey: ['profile'] });
    qc.invalidateQueries({ queryKey: ['user-favorites'] });
    qc.invalidateQueries({ queryKey: ['ratings'] });
    qc.invalidateQueries({ queryKey: ['stats'] });
    qc.invalidateQueries({ queryKey: ['search'] });
    qc.invalidateQueries({ queryKey: ['friends-activity'] });
    qc.invalidateQueries({ queryKey: ['recent-activity'] });
  };

  const logSeries = useMutation({
    mutationFn: async (input: LogSeriesInput): Promise<void> => {
      await api.post('/ratings', { series_id: tmdbId, ...input });
    },
    onSuccess: invalidateAll,
  });

  const removeLog = useMutation({
    mutationFn: async (ratingId: number): Promise<void> => {
      await api.delete(`/ratings/${ratingId}`);
    },
    onSuccess: invalidateAll,
  });

  const addToWatchlist = useMutation({
    mutationFn: async (): Promise<void> => {
      await api.post('/watchlist', { tmdb_id: tmdbId, type: 'series' });
    },
    onSuccess: invalidateAll,
  });

  const removeFromWatchlist = useMutation({
    mutationFn: async (watchlistId: number): Promise<void> => {
      await api.delete(`/watchlist/${watchlistId}`);
    },
    onSuccess: invalidateAll,
  });

  const likeSeries = useMutation({
    mutationFn: async (): Promise<void> => {
      await api.post(`/series/${tmdbId}/like`);
    },
    onSuccess: invalidateAll,
  });

  const unlikeSeries = useMutation({
    mutationFn: async (): Promise<void> => {
      await api.delete(`/series/${tmdbId}/like`);
    },
    onSuccess: invalidateAll,
  });

  const updateDisplayPrefs = useMutation({
    mutationFn: async (
      input: UpdateDisplayPrefsInput,
    ): Promise<SeriesDisplayPrefs> => {
      const res = await api.put<{ data: SeriesDisplayPrefs }>(
        `/series/${tmdbId}/display-prefs`,
        input,
      );
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: seriesKeys.detail(tmdbId) });
      qc.invalidateQueries({ queryKey: seriesKeys.displayPrefs(tmdbId) });
      // Custom poster / backdrop affects every listing that renders this series.
      qc.invalidateQueries({ queryKey: ['series'] });
      qc.invalidateQueries({ queryKey: ['trending'] });
      qc.invalidateQueries({ queryKey: ['watchlist'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['user-favorites'] });
      qc.invalidateQueries({ queryKey: ['ratings'] });
      qc.invalidateQueries({ queryKey: ['search'] });
      qc.invalidateQueries({ queryKey: ['friends-activity'] });
      qc.invalidateQueries({ queryKey: ['recent-activity'] });
    },
  });

  return {
    logSeries,
    removeLog,
    addToWatchlist,
    removeFromWatchlist,
    likeSeries,
    unlikeSeries,
    updateDisplayPrefs,
  };
}
