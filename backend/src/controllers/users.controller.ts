import type { Request, Response } from 'express';

/** GET /api/v1/users/me */
export async function getMe(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** PUT /api/v1/users/me */
export async function updateMe(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** GET /api/v1/users/:id */
export async function getUserById(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** POST /api/v1/users/:id/follow */
export async function followUser(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** DELETE /api/v1/users/:id/follow */
export async function unfollowUser(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** GET /api/v1/users/:id/followers */
export async function getFollowers(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** GET /api/v1/users/:id/following */
export async function getFollowing(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** GET /api/v1/users/me/favorites */
export async function getMyFavorites(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** PUT /api/v1/users/me/favorites */
export async function updateMyFavorites(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}
