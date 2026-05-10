import type { Request, Response } from 'express';
import { z } from 'zod';
import * as searchService from '../services/search.service';
import { AppError } from '../utils/app-error';

/** GET /api/v1/search?q=&type=&limit=&page= */
export async function search(req: Request, res: Response): Promise<void> {
  const rawQ = typeof req.query['q'] === 'string' ? req.query['q'] : '';
  const rawType = typeof req.query['type'] === 'string' ? req.query['type'] : undefined;
  const limit = Math.min(Number(req.query['limit'] ?? 10) || 10, 20);
  const page = Math.max(Number(req.query['page'] ?? 1) || 1, 1);
  const viewerId = req.user?.userId ?? null;
  const result = await searchService.search(rawQ, rawType, limit, page, viewerId);
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

const recordRecentSchema = z.object({
  type: z.enum(['film', 'series', 'person', 'list', 'member']),
  resultId: z.number().int().positive(),
  displayTitle: z.string().min(1).max(255),
  primary: z.string().max(255).nullable().optional(),
  secondary: z.string().max(255).nullable().optional(),
  thumbnailUrl: z.string().max(500).nullable().optional(),
});

/** POST /api/v1/search/recent — records a tap on a search result. */
export async function recordRecentSearch(req: Request, res: Response): Promise<void> {
  const parsed = recordRecentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? 'Invalid payload', 400);
  }
  const userId = req.user!.userId;
  await searchService.recordRecentSearch(userId, {
    type: parsed.data.type,
    resultId: parsed.data.resultId,
    displayTitle: parsed.data.displayTitle,
    primary: parsed.data.primary ?? null,
    secondary: parsed.data.secondary ?? null,
    thumbnailUrl: parsed.data.thumbnailUrl ?? null,
  });
  res.status(201).json({ message: 'Recent search recorded' });
}
