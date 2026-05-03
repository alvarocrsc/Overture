import type { Request, Response } from 'express';
import * as seriesService from '../services/series.service';
import { AppError } from '../utils/app-error';

/**
 * Parses the :tmdbId route parameter and throws a 400 AppError if it is not a
 * valid integer.
 * @param req - The Express request object.
 * @returns The numeric TMDB ID.
 */
function parseTmdbId(req: Request): number {
  const id = Number(req.params['tmdbId']);
  if (isNaN(id)) {
    throw new AppError('Invalid series ID', 400);
  }
  return id;
}

/** GET /api/v1/series/trending */
export async function getTrendingSeries(_req: Request, res: Response): Promise<void> {
  const data = await seriesService.getTrendingSeries();
  res.status(200).json({ data });
}

/** GET /api/v1/series/new-releases */
export async function getNewSeriesReleases(_req: Request, res: Response): Promise<void> {
  const data = await seriesService.getNewSeries();
  res.status(200).json({ data });
}

/** GET /api/v1/series/search */
export async function searchSeries(req: Request, res: Response): Promise<void> {
  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.trim() === '') {
    throw new AppError('Query required', 400);
  }
  const data = await seriesService.searchSeries(q.trim());
  res.status(200).json({ data });
}

/** GET /api/v1/series/:tmdbId */
export async function getSeriesById(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  const data = await seriesService.getSeriesById(tmdbId);
  res.status(200).json({ data });
}

/** GET /api/v1/series/:tmdbId/images */
export async function getSeriesImages(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  const data = await seriesService.getSeriesImages(tmdbId);
  res.status(200).json({ data });
}

/** GET /api/v1/series/:tmdbId/credits */
export async function getSeriesCredits(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  const data = await seriesService.getSeriesCredits(tmdbId);
  res.status(200).json({ data });
}

/** POST /api/v1/series/:tmdbId/like */
export async function likeSeries(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** DELETE /api/v1/series/:tmdbId/like */
export async function unlikeSeries(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}
