import type { Request, Response } from 'express';

/** POST /api/v1/auth/register */
export async function register(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** POST /api/v1/auth/login */
export async function login(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** POST /api/v1/auth/logout */
export async function logout(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** POST /api/v1/auth/refresh-token */
export async function refreshToken(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}
