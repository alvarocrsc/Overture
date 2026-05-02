import type { Request, Response } from 'express';

/** POST /api/v1/ratings */
export async function createRating(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** PUT /api/v1/ratings/:id */
export async function updateRating(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** DELETE /api/v1/ratings/:id */
export async function deleteRating(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** GET /api/v1/ratings/user/:userId */
export async function getRatingsByUser(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}
