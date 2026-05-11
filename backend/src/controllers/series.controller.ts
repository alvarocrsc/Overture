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
export async function getTrendingSeries(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId ?? null;
  const data = await seriesService.getTrendingSeries(userId);
  res.status(200).json({ data });
}

/** GET /api/v1/series/new-releases */
export async function getNewSeriesReleases(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId ?? null;
  const data = await seriesService.getNewSeries(userId);
  res.status(200).json({ data });
}

/** GET /api/v1/series/search */
export async function searchSeries(req: Request, res: Response): Promise<void> {
  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.trim() === '') {
    throw new AppError('Query required', 400);
  }
  const userId = req.user?.userId ?? null;
  const data = await seriesService.searchSeries(q.trim(), userId);
  res.status(200).json({ data });
}

/** GET /api/v1/series/:tmdbId — optionally authenticated for per-user enrichment. */
export async function getSeriesById(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  const userId = req.user?.userId ?? null;
  const data = await seriesService.getSeriesDetail(tmdbId, userId);
  res.status(200).json({ data });
}

/** GET /api/v1/series/:tmdbId/distribution */
export async function getSeriesDistribution(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  const data = await seriesService.getSeriesRatingDistribution(tmdbId);
  res.status(200).json({ data });
}

/** GET /api/v1/series/:tmdbId/watched-by */
export async function getSeriesWatchedBy(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  const userId = req.user?.userId ?? null;
  const data = await seriesService.getSeriesWatchedBy(tmdbId, userId);
  res.status(200).json({ data });
}

/** GET /api/v1/series/:tmdbId/watchlisted-by */
export async function getSeriesWatchlistedBy(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  const userId = req.user?.userId ?? null;
  const data = await seriesService.getSeriesWatchlistedBy(tmdbId, userId);
  res.status(200).json({ data });
}

/** GET /api/v1/series/:tmdbId/my-logs */
export async function getSeriesMyLogs(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  if (!req.user) throw new AppError('Authentication required', 401);
  const data = await seriesService.getSeriesMyLogs(tmdbId, req.user.userId);
  res.status(200).json({ data });
}

/** GET /api/v1/series/:tmdbId/display-prefs */
export async function getSeriesDisplayPrefs(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  if (!req.user) throw new AppError('Authentication required', 401);
  const data = await seriesService.getSeriesDisplayPrefs(tmdbId, req.user.userId);
  res.status(200).json({ data });
}

/** PUT /api/v1/series/:tmdbId/display-prefs */
export async function updateSeriesDisplayPrefs(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  if (!req.user) throw new AppError('Authentication required', 401);

  const body = req.body as {
    custom_poster_path?: string | null;
    custom_backdrop_path?: string | null;
  };

  const validatePath = (key: string, val: unknown): string | null | undefined => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    if (typeof val !== 'string' || val.length > 500) {
      throw new AppError(`Invalid ${key}`, 400);
    }
    return val;
  };

  const posterPath = validatePath('custom_poster_path', body.custom_poster_path);
  const backdropPath = validatePath('custom_backdrop_path', body.custom_backdrop_path);

  const data = await seriesService.setSeriesDisplayPrefs(
    tmdbId,
    req.user.userId,
    posterPath,
    backdropPath,
  );
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
export async function likeSeries(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  if (!req.user) throw new AppError('Authentication required', 401);
  await seriesService.likeSeries(tmdbId, req.user.userId);
  res.status(200).json({ message: 'Series liked' });
}

/** DELETE /api/v1/series/:tmdbId/like */
export async function unlikeSeries(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  if (!req.user) throw new AppError('Authentication required', 401);
  await seriesService.unlikeSeries(tmdbId, req.user.userId);
  res.status(200).json({ message: 'Series unliked' });
}
