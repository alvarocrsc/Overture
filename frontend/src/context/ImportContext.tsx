import { createContext, useCallback, useContext, useState } from 'react';

import { useImportJobStatus } from '@/src/hooks/use-import';
import type { ImportJob } from '@/src/types/import.types';

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
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const { data } = useImportJobStatus(activeJobId);

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
