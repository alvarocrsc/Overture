import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/lib/api';
import { filmKeys } from './useFilmDetail';
import type { FilmDisplayPrefs } from '@/src/types/film.types';

interface LogFilmInput {
  /** Rating value in 0.5 increments, 0.5–5. */
  value: number;
  /** ISO date YYYY-MM-DD. */
  watched_on?: string;
  is_rewatch?: boolean;
  review?: {
    body: string;
    contains_spoilers?: boolean;
    liked_title?: boolean;
  };
}

interface UpdateDisplayPrefsInput {
  /** New custom poster path, null to clear, undefined to leave unchanged. */
  custom_poster_path?: string | null;
  /** New custom backdrop path, null to clear, undefined to leave unchanged. */
  custom_backdrop_path?: string | null;
}

/**
 * Bundle of mutations for interacting with a single film: logging a rating,
 * removing a log, watchlist add/remove, like/unlike, and updating display
 * prefs. Each mutation invalidates the relevant cached queries on success.
 *
 * @param tmdbId - The TMDB movie ID this bundle is scoped to.
 */
export function useFilmActions(tmdbId: number) {
  const qc = useQueryClient();

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['film', tmdbId] });
    qc.invalidateQueries({ queryKey: ['films'] });
    qc.invalidateQueries({ queryKey: ['series'] });
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

  const logFilm = useMutation({
    mutationFn: async (input: LogFilmInput): Promise<void> => {
      await api.post('/ratings', { film_id: tmdbId, ...input });
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
      await api.post('/watchlist', { tmdb_id: tmdbId, type: 'film' });
    },
    onSuccess: invalidateAll,
  });

  const removeFromWatchlist = useMutation({
    mutationFn: async (watchlistId: number): Promise<void> => {
      await api.delete(`/watchlist/${watchlistId}`);
    },
    onSuccess: invalidateAll,
  });

  const likeFilm = useMutation({
    mutationFn: async (): Promise<void> => {
      await api.post(`/films/${tmdbId}/like`);
    },
    onSuccess: invalidateAll,
  });

  const unlikeFilm = useMutation({
    mutationFn: async (): Promise<void> => {
      await api.delete(`/films/${tmdbId}/like`);
    },
    onSuccess: invalidateAll,
  });

  const updateDisplayPrefs = useMutation({
    mutationFn: async (input: UpdateDisplayPrefsInput): Promise<FilmDisplayPrefs> => {
      const res = await api.put<{ data: FilmDisplayPrefs }>(
        `/films/${tmdbId}/display-prefs`,
        input,
      );
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: filmKeys.detail(tmdbId) });
      qc.invalidateQueries({ queryKey: filmKeys.displayPrefs(tmdbId) });
      qc.invalidateQueries({ queryKey: ['films'] });
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
    logFilm,
    removeLog,
    addToWatchlist,
    removeFromWatchlist,
    likeFilm,
    unlikeFilm,
    updateDisplayPrefs,
  };
}
