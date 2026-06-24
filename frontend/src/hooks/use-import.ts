/**
 * TanStack Query hooks for the Letterboxd import feature.
 *
 * - `useUploadImport` — mutation that uploads the export ZIP and returns the
 *   new job id.
 * - `useImportJobStatus(jobId)` — polls the job every 2s while it is pending or
 *   processing, and stops once it reaches a terminal state.
 */
import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { pollImportJob, uploadImportFile } from '@/src/services/import.service';
import type { ImportJob } from '@/src/types/import.types';

/** Uploads an export ZIP (by local URI) and resolves to the new job id. */
export function useUploadImport(): UseMutationResult<number, Error, string> {
  return useMutation({
    mutationFn: (zipUri: string): Promise<number> => uploadImportFile(zipUri),
  });
}

/**
 * Polls an import job's status. Disabled until a job id exists; polls every
 * 2 seconds while pending/processing and stops on completed/failed.
 * @param jobId - The job id to poll, or null before one exists.
 */
export function useImportJobStatus(jobId: number | null): UseQueryResult<ImportJob> {
  return useQuery({
    queryKey: ['import-job', jobId],
    queryFn: () => {
      if (jobId == null) return Promise.reject(new Error('jobId is null'));
      return pollImportJob(jobId);
    },
    enabled: jobId != null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Stop polling once a terminal state is reached.
      if (status === 'completed' || status === 'failed') return false;
      return 2000;
    },
    staleTime: 0,
  });
}
