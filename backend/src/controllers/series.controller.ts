import type { Request, Response } from 'express';

/** GET /api/v1/series/trending */
export async function getTrendingSeries(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** GET /api/v1/series/new-releases */
export async function getNewSeriesReleases(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** GET /api/v1/series/search */
export async function searchSeries(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** GET /api/v1/series/:tmdbId */
export async function getSeriesById(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** GET /api/v1/series/:tmdbId/images */
export async function getSeriesImages(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** GET /api/v1/series/:tmdbId/credits */
export async function getSeriesCredits(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** POST /api/v1/series/:tmdbId/like */
export async function likeSeries(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** DELETE /api/v1/series/:tmdbId/like */
export async function unlikeSeries(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}
