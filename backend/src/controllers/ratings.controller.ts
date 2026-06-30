import type { Request, Response } from 'express';
import * as ratingsService from '../services/ratings.service';
import { AppError } from '../utils/app-error';
import { createRatingSchema, updateRatingSchema } from '../validators/rating.validators';

/**
 * Parses a numeric ID from a route parameter, throwing 400 if invalid.
 * @param value - The raw string from req.params.
 * @param label - Human-readable label for the error message.
 */
function parseId(value: string, label: string): number {
  const id = Number(value);
  if (isNaN(id)) {
    throw new AppError(`Invalid ${label}`, 400);
  }
  return id;
}

/** POST /api/v1/ratings */
export async function createRating(req: Request, res: Response): Promise<void> {
  const data = createRatingSchema.parse(req.body);
  // req.user is set by verifyAccessToken; non-null guaranteed by middleware.
  const userId = req.user!.userId;
  const result = await ratingsService.createRating(userId, data);
  res.status(201).json({ data: result, message: 'Logged successfully' });
}

/** PUT /api/v1/ratings/:id */
export async function updateRating(req: Request, res: Response): Promise<void> {
  const ratingId = parseId(String(req.params['id']), 'rating ID');
  const data = updateRatingSchema.parse(req.body);
  const userId = req.user!.userId;
  const result = await ratingsService.updateRating(ratingId, userId, data);
  res.status(200).json({ data: result, message: 'Log updated' });
}

/** DELETE /api/v1/ratings/:id */
export async function deleteRating(req: Request, res: Response): Promise<void> {
  const ratingId = parseId(String(req.params['id']), 'rating ID');
  const userId = req.user!.userId;
  await ratingsService.deleteRating(ratingId, userId);
  res.status(200).json({ message: 'Log deleted' });
}

/** GET /api/v1/ratings/me/logged */
export async function getLoggedMembership(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const data = await ratingsService.getLoggedMembership(userId);
  res.status(200).json({ data });
}

/** GET /api/v1/ratings/user/:userId */
export async function getRatingsByUser(req: Request, res: Response): Promise<void> {
  const userId = parseId(String(req.params['userId']), 'user ID');

  const rawType = req.query['type'];
  let type: 'film' | 'series' | undefined;
  if (rawType === 'film' || rawType === 'series') {
    type = rawType;
  }

  const limit = Math.min(Number(req.query['limit'] ?? 20) || 20, 100);
  const page = Math.max(Number(req.query['page'] ?? 1) || 1, 1);

  // Library view passes distinct=1 to collapse rewatches into one row per title,
  // plus an optional whitelisted sort key (defaults to newest release first).
  const rawDistinct = req.query['distinct'];
  const distinct = rawDistinct === '1' || rawDistinct === 'true';
  const rawSort = req.query['sort'];
  const sort = typeof rawSort === 'string' ? rawSort : undefined;

  const result = await ratingsService.getRatingsByUser(userId, {
    type,
    page,
    limit,
    distinct,
    sort,
  });
  res.status(200).json(result);
}
