import type { Request, Response } from 'express';

/** GET /api/v1/watchlist */
export async function getWatchlist(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** POST /api/v1/watchlist */
export async function addToWatchlist(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** DELETE /api/v1/watchlist/:id */
export async function deleteFromWatchlist(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}
