import type { Request, Response } from 'express';
import * as watchlistService from '../services/watchlist.service';
import { AppError } from '../utils/app-error';
import { addToWatchlistSchema } from '../validators/watchlist.validators';

/** GET /api/v1/watchlist */
export async function getWatchlist(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const rawType = req.query['type'];
  let type: 'film' | 'series' | undefined;
  if (rawType === 'film' || rawType === 'series') {
    type = rawType;
  }

  const limit = Math.min(Number(req.query['limit'] ?? 20) || 20, 100);
  const page = Math.max(Number(req.query['page'] ?? 1) || 1, 1);

  const result = await watchlistService.getWatchlist(userId, { type, page, limit });
  res.status(200).json(result);
}

/** POST /api/v1/watchlist */
export async function addToWatchlist(req: Request, res: Response): Promise<void> {
  const data = addToWatchlistSchema.parse(req.body);
  const userId = req.user!.userId;
  const result = await watchlistService.addToWatchlist(userId, data);
  res.status(201).json({ data: result, message: 'Added to watchlist' });
}

/** GET /api/v1/watchlist/membership */
export async function getWatchlistMembership(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const data = await watchlistService.getWatchlistMembership(userId);
  res.status(200).json({ data });
}

/** DELETE /api/v1/watchlist/:id */
export async function deleteFromWatchlist(req: Request, res: Response): Promise<void> {
  const watchlistId = Number(req.params['id']);
  if (isNaN(watchlistId)) {
    throw new AppError('Invalid watchlist ID', 400);
  }
  const userId = req.user!.userId;
  await watchlistService.deleteFromWatchlist(watchlistId, userId);
  res.status(200).json({ message: 'Removed from watchlist' });
}
