import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export type LogMediaType = 'film' | 'series';

/** Initial film/series data passed in when entering the log flow. */
interface LogTitleInfo {
  tmdbId: number;
  mediaType: LogMediaType;
  title: string;
  year: string | null;
  director: string | null;
  posterPath: string | null;
  /** TMDB backdrop paths available for attachment to a review. */
  availableBackdrops: string[];
}

/** Mutable user input collected across the log flow. */
interface LogUserInput {
  rating: number;
  watchedOn: Date;
  reviewBody: string;
  selectedBackdropPaths: string[];
  isRewatch: boolean;
}

export interface LogContextValue extends LogTitleInfo, LogUserInput {
  setRating: (v: number) => void;
  setWatchedOn: (d: Date) => void;
  setReviewBody: (s: string) => void;
  /** Adds the backdrop path if absent (cap 10), removes it if present. */
  toggleBackdrop: (path: string) => void;
  setIsRewatch: (v: boolean) => void;
  /** Resets all collected user input to defaults. */
  reset: () => void;
}

const MAX_BACKDROPS = 10;
const DEFAULT_RATING = 2.5;

const LogContext = createContext<LogContextValue | null>(null);

/**
 * Hook returning the active log context. Must be used inside LogProvider.
 * @throws If called outside of LogProvider.
 */
export function useLog(): LogContextValue {
  const ctx = useContext(LogContext);
  if (!ctx) {
    throw new Error('useLog must be used within a LogProvider');
  }
  return ctx;
}

interface LogProviderProps extends LogTitleInfo {
  children: React.ReactNode;
}

/**
 * Provides shared log-flow state to the rating + details screens. The title
 * info (tmdbId, mediaType, etc.) is fixed for the lifetime of the flow and
 * passed in via props from the route layout. User input (rating, watchedOn,
 * review, backdrops) is initialised to sensible defaults and mutated by the
 * screens via the setters returned from useLog().
 */
export function LogProvider({
  tmdbId,
  mediaType,
  title,
  year,
  director,
  posterPath,
  availableBackdrops,
  children,
}: LogProviderProps): React.JSX.Element {
  const [input, setInput] = useState<LogUserInput>(() => ({
    rating: DEFAULT_RATING,
    watchedOn: new Date(),
    reviewBody: '',
    selectedBackdropPaths: [],
    isRewatch: false,
  }));

  const setRating = useCallback((v: number): void => {
    setInput((prev) => ({ ...prev, rating: v }));
  }, []);

  const setWatchedOn = useCallback((d: Date): void => {
    setInput((prev) => ({ ...prev, watchedOn: d }));
  }, []);

  const setReviewBody = useCallback((s: string): void => {
    setInput((prev) => ({ ...prev, reviewBody: s }));
  }, []);

  const setIsRewatch = useCallback((v: boolean): void => {
    setInput((prev) => ({ ...prev, isRewatch: v }));
  }, []);

  const toggleBackdrop = useCallback((path: string): void => {
    setInput((prev) => {
      const exists = prev.selectedBackdropPaths.includes(path);
      if (exists) {
        return {
          ...prev,
          selectedBackdropPaths: prev.selectedBackdropPaths.filter(
            (p) => p !== path,
          ),
        };
      }
      if (prev.selectedBackdropPaths.length >= MAX_BACKDROPS) {
        return prev;
      }
      return {
        ...prev,
        selectedBackdropPaths: [...prev.selectedBackdropPaths, path],
      };
    });
  }, []);

  const reset = useCallback((): void => {
    setInput({
      rating: DEFAULT_RATING,
      watchedOn: new Date(),
      reviewBody: '',
      selectedBackdropPaths: [],
      isRewatch: false,
    });
  }, []);

  const value = useMemo<LogContextValue>(
    () => ({
      tmdbId,
      mediaType,
      title,
      year,
      director,
      posterPath,
      availableBackdrops,
      rating: input.rating,
      watchedOn: input.watchedOn,
      reviewBody: input.reviewBody,
      selectedBackdropPaths: input.selectedBackdropPaths,
      isRewatch: input.isRewatch,
      setRating,
      setWatchedOn,
      setReviewBody,
      setIsRewatch,
      toggleBackdrop,
      reset,
    }),
    [
      tmdbId,
      mediaType,
      title,
      year,
      director,
      posterPath,
      availableBackdrops,
      input,
      setRating,
      setWatchedOn,
      setReviewBody,
      setIsRewatch,
      toggleBackdrop,
      reset,
    ],
  );

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
}
