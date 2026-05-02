import type { Request, Response } from 'express';

/** GET /api/v1/stats/me */
export async function getMyStats(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}
