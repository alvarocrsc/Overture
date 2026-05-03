import type { Request, Response } from 'express';
import * as searchService from '../services/search.service';
import { AppError } from '../utils/app-error';

/** GET /api/v1/search?q=&type=&limit=&page= */
export async function search(req: Request, res: Response): Promise<void> {
  const rawQ = typeof req.query['q'] === 'string' ? req.query['q'] : '';
  const rawType = typeof req.query['type'] === 'string' ? req.query['type'] : undefined;
  const limit = Math.min(Number(req.query['limit'] ?? 10) || 10, 20);
  const page = Math.max(Number(req.query['page'] ?? 1) || 1, 1);
  const userId = req.user!.userId;
  const result = await searchService.search(userId, rawQ, rawType, limit, page);
  res.status(200).json(result);
}

/** GET /api/v1/search/recent */
export async function getRecentSearches(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const data = await searchService.getRecentSearches(userId);
  res.status(200).json({ data });
}

/** DELETE /api/v1/search/recent/:id */
export async function deleteRecentSearch(req: Request, res: Response): Promise<void> {
  const searchId = Number(req.params['id']);
  if (isNaN(searchId)) throw new AppError('Invalid search ID', 400);
  const userId = req.user!.userId;
  await searchService.deleteRecentSearch(searchId, userId);
  res.status(200).json({ message: 'Search removed' });
}

/** DELETE /api/v1/search/recent */
export async function clearRecentSearches(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  await searchService.clearRecentSearches(userId);
  res.status(200).json({ message: 'Search history cleared' });
}
