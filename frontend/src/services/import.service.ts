/**
 * Import service — thin wrappers around the /api/v1/import endpoints.
 *
 * Mirrors the lists service conventions: every function returns the unwrapped
 * payload (`data`) from the `{ data: T }` envelope, and errors propagate as
 * axios errors for the calling hook to surface.
 */
import api from '@/src/lib/api';
import type { ImportJob } from '@/src/types/import.types';

/**
 * Uploads a Letterboxd export ZIP (already downloaded to a local file URI) and
 * starts a background import job.
 * @param zipUri - Local `file://` URI of the export ZIP.
 * @returns The new import job id to poll.
 */
export async function uploadImportFile(zipUri: string): Promise<number> {
  const formData = new FormData();
  formData.append('file', {
    uri: zipUri,
    name: 'letterboxd-export.zip',
    type: 'application/zip',
  } as unknown as Blob);

  const res = await api.post<{ data: { jobId: number }; message: string }>(
    '/import',
    formData,
    {
      // Let React Native's networking layer set `multipart/form-data` together
      // with the boundary. Forcing the header drops the boundary, which makes
      // multer parse no file. `transformRequest` keeps the FormData untouched
      // so axios does not try to serialize it. (See lists.service.uploadListIcon.)
      headers: { 'Content-Type': undefined },
      transformRequest: (data) => data,
      timeout: 30000,
    },
  );
  return res.data.data.jobId;
}

/**
 * Fetches the current status and progress of an import job.
 * @param jobId - The import job id returned by uploadImportFile.
 */
export async function pollImportJob(jobId: number): Promise<ImportJob> {
  const res = await api.get<{ data: ImportJob }>(`/import/${jobId}`);
  return res.data.data;
}
