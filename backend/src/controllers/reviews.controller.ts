import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as reviewsService from '../services/reviews.service';
import { AppError } from '../utils/app-error';
import { updateReviewSchema, createCommentSchema } from '../validators/review.validators';
import type { AuthPayload } from '../types/auth.types';

/**
 * Attempts to decode the Bearer token from the Authorization header without
 * throwing. Returns the userId if the token is valid, or undefined otherwise.
 * Used for routes that are public but can optionally use auth context.
 * @param req - The Express request object.
 * @returns The authenticated userId, or undefined.
 */
function tryDecodeUserId(req: Request): number | undefined {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) return undefined;
  const token = authHeader.slice(7);
  const secret = process.env['JWT_ACCESS_SECRET'];
  if (!secret) return undefined;
  try {
    const decoded = jwt.verify(token, secret) as AuthPayload;
    return decoded.userId;
  } catch {
    return undefined;
  }
}

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

/** GET /api/v1/reviews/:id */
export async function getReviewById(req: Request, res: Response): Promise<void> {
  const reviewId = parseId(String(req.params['id']), 'review ID');
  // This route has no auth middleware, so req.user is always undefined.
  // Manually attempt to decode the token so liked_by_me can be populated.
  const requestingUserId = req.user?.userId ?? tryDecodeUserId(req);
  const review = await reviewsService.getReviewById(reviewId, requestingUserId);
  res.status(200).json({ data: review });
}

/** PUT /api/v1/reviews/:id */
export async function updateReview(req: Request, res: Response): Promise<void> {
  const reviewId = parseId(String(req.params['id']), 'review ID');
  const data = updateReviewSchema.parse(req.body);
  const userId = req.user!.userId;
  const result = await reviewsService.updateReview(reviewId, userId, data);
  res.status(200).json({ data: result, message: 'Review updated' });
}

/** DELETE /api/v1/reviews/:id */
export async function deleteReview(req: Request, res: Response): Promise<void> {
  const reviewId = parseId(String(req.params['id']), 'review ID');
  const userId = req.user!.userId;
  await reviewsService.deleteReview(reviewId, userId);
  res.status(200).json({ message: 'Review deleted' });
}

/** POST /api/v1/reviews/:id/like */
export async function likeReview(req: Request, res: Response): Promise<void> {
  const reviewId = parseId(String(req.params['id']), 'review ID');
  const userId = req.user!.userId;
  await reviewsService.likeReview(reviewId, userId);
  res.status(200).json({ message: 'Review liked' });
}

/** DELETE /api/v1/reviews/:id/like */
export async function unlikeReview(req: Request, res: Response): Promise<void> {
  const reviewId = parseId(String(req.params['id']), 'review ID');
  const userId = req.user!.userId;
  await reviewsService.unlikeReview(reviewId, userId);
  res.status(200).json({ message: 'Review unliked' });
}

/** GET /api/v1/reviews/:id/comments */
export async function getReviewComments(req: Request, res: Response): Promise<void> {
  const reviewId = parseId(String(req.params['id']), 'review ID');

  let parentId: number | null = null;
  const rawParent = req.query['parent_id'];
  if (rawParent !== undefined) {
    parentId = Number(rawParent);
    if (isNaN(parentId)) {
      throw new AppError('Invalid parent_id', 400);
    }
  }

  const result = await reviewsService.getReviewComments(reviewId, { parentId });
  res.status(200).json(result);
}

/** POST /api/v1/reviews/:id/comments */
export async function createReviewComment(req: Request, res: Response): Promise<void> {
  const reviewId = parseId(String(req.params['id']), 'review ID');
  const data = createCommentSchema.parse(req.body);
  const userId = req.user!.userId;
  const result = await reviewsService.createReviewComment(reviewId, userId, data);
  res.status(201).json({ data: result, message: 'Comment added' });
}
