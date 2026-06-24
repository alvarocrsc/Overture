import type { Request, Response } from 'express';
import * as importService from '../services/import.service';
import { AppError } from '../utils/app-error';

/**
 * POST /api/v1/import
 * Accepts a multipart Letterboxd export ZIP (field name `file`), kicks off the
 * background import job, and returns the new job id immediately.
 */
export async function startImport(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }
  const userId = req.user!.userId;
  const jobId = await importService.startImportJob(userId, req.file.path);
  res.status(202).json({ data: { jobId }, message: 'Import started' });
}

/**
 * GET /api/v1/import/:id
 * Returns the current status and progress counters of an import job. Scoped to
 * the authenticated user so jobs cannot be polled across accounts.
 */
export async function getImportStatus(req: Request, res: Response): Promise<void> {
  const jobId = Number(req.params['id']);
  if (isNaN(jobId)) {
    throw new AppError('Invalid import job ID', 400);
  }
  const userId = req.user!.userId;
  const job = await importService.getImportJob(jobId, userId);
  if (!job) {
    throw new AppError('Import job not found', 404);
  }
  res.status(200).json({ data: job });
}
