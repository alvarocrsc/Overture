import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useImportJobStatus } from '@/src/hooks/use-import';
import type { ImportJob } from '@/src/types/import.types';

/**
 * Query roots an import writes to (ratings, watchlist, likes, reviews and the
 * counts derived from them). Invalidated when a job finishes so the profile
 * reflects the new totals instead of the counts cached when we navigated away
 * mid-import. Mirrors the set the film/series action hooks invalidate.
 */
const IMPORT_AFFECTED_QUERY_KEYS = [
  'profile',
  'stats',
  'rating-distribution',
  'user-favorites',
  'films',
  'ratings',
  'watchlist',
  'logged',
  'recent-activity',
  'divides',
  'friends-activity',
] as const;

export interface ImportContextType {
  /** The job currently being tracked, or null before the first poll resolves. */
  job: ImportJob | null;
  /** True while an import is being tracked (drives banner visibility). */
  isTracking: boolean;
  /** Begin tracking a freshly-created import job by id. */
  startTracking: (jobId: number) => void;
  /** Stop tracking and dismiss the banner. */
  clearTracking: () => void;
}

const ImportContext = createContext<ImportContextType | null>(null);

/**
 * Returns the import-tracking context. Must be used inside an ImportProvider.
 * @throws If used outside of ImportProvider.
 */
export function useImport(): ImportContextType {
  const ctx = useContext(ImportContext);
  if (!ctx) {
    throw new Error('useImport must be used within an ImportProvider');
  }
  return ctx;
}

/**
 * Tracks the active Letterboxd import job app-wide so its progress banner can
 * persist across navigation while the user keeps using the app. Holds the job
 * id and polls it via TanStack Query; `<ImportProgressBanner />` reads `job`
 * from here. Tracking starts when the import screen hands off a job id and ends
 * when the banner dismisses itself after the job reaches a terminal state.
 */
export default function ImportProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const { data } = useImportJobStatus(activeJobId);

  // When the tracked job reaches a terminal state, refresh the queries it wrote
  // to. We navigate to the profile the moment the upload succeeds, so without
  // this the screen keeps showing the counts cached before the import ran. The
  // ref guards against re-invalidating on every subsequent poll of the same job.
  const refreshedJobId = useRef<number | null>(null);
  useEffect(() => {
    if (!data) return;
    if (data.status !== 'completed' && data.status !== 'failed') return;
    if (refreshedJobId.current === data.id) return;
    refreshedJobId.current = data.id;
    for (const key of IMPORT_AFFECTED_QUERY_KEYS) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [data, queryClient]);

  const startTracking = useCallback((jobId: number): void => {
    setActiveJobId(jobId);
  }, []);

  const clearTracking = useCallback((): void => {
    setActiveJobId(null);
  }, []);

  const value: ImportContextType = {
    job: data ?? null,
    isTracking: activeJobId !== null,
    startTracking,
    clearTracking,
  };

  return (
    <ImportContext.Provider value={value}>{children}</ImportContext.Provider>
  );
}
