import type { Request, Response } from 'express';
import * as usersService from '../services/users.service';
import { AppError } from '../utils/app-error';

/** Parses `:id` route param and ensures it is a positive integer. */
function parseUserIdParam(raw: unknown): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('Invalid user id', 400);
  }
  return id;
}

/** GET /api/v1/users/me */
export async function getMe(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const data = await usersService.getUserProfile(userId, userId);
  res.status(200).json({ data });
}

/** PUT /api/v1/users/me */
export async function updateMe(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const data = await usersService.updateUserProfile(userId, req.body);
  res.status(200).json({ data });
}

/** GET /api/v1/users/:id */
export async function getUserById(req: Request, res: Response): Promise<void> {
  const targetId = parseUserIdParam(req.params['id']);
  const viewerId = req.user?.userId ?? null;
  const data = await usersService.getUserProfile(targetId, viewerId);
  res.status(200).json({ data });
}

/** POST /api/v1/users/:id/follow */
export async function followUser(req: Request, res: Response): Promise<void> {
  const followerId = req.user!.userId;
  const followingId = parseUserIdParam(req.params['id']);
  await usersService.followUser(followerId, followingId);
  res.status(200).json({ data: { following: true } });
}

/** DELETE /api/v1/users/:id/follow */
export async function unfollowUser(req: Request, res: Response): Promise<void> {
  const followerId = req.user!.userId;
  const followingId = parseUserIdParam(req.params['id']);
  await usersService.unfollowUser(followerId, followingId);
  res.status(200).json({ data: { following: false } });
}

/** GET /api/v1/users/:id/followers */
export async function getFollowers(req: Request, res: Response): Promise<void> {
  const targetId = parseUserIdParam(req.params['id']);
  const data = await usersService.getFollowers(targetId);
  res.status(200).json({ data });
}

/** GET /api/v1/users/:id/following */
export async function getFollowing(req: Request, res: Response): Promise<void> {
  const targetId = parseUserIdParam(req.params['id']);
  const data = await usersService.getFollowing(targetId);
  res.status(200).json({ data });
}

/** GET /api/v1/users/me/favorites */
export async function getMyFavorites(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const data = await usersService.getUserFavorites(userId);
  res.status(200).json({ data });
}

/** GET /api/v1/users/:id/favorites */
export async function getUserFavoritesById(req: Request, res: Response): Promise<void> {
  const targetId = parseUserIdParam(req.params['id']);
  const data = await usersService.getUserFavorites(targetId);
  res.status(200).json({ data });
}

/** PUT /api/v1/users/me/favorites */
export async function updateMyFavorites(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const data = await usersService.updateUserFavorites(userId, req.body);
  res.status(200).json({ data });
}
