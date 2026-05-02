import type { Request, Response } from 'express';
import { registerUser, loginUser, refreshAccessToken } from '../services/auth.service';
import { registerSchema, loginSchema } from '../validators/auth.validators';
import { AppError } from '../utils/app-error';

const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** POST /api/v1/auth/register */
export async function register(req: Request, res: Response): Promise<void> {
  const body = registerSchema.parse(req.body);
  const result = await registerUser(body);
  res.status(201).json({ data: { userId: result.userId }, message: 'Account created' });
}

/** POST /api/v1/auth/login */
export async function login(req: Request, res: Response): Promise<void> {
  const body = loginSchema.parse(req.body);
  const result = await loginUser(body);

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  });

  res.status(200).json({
    data: { accessToken: result.accessToken, user: result.user },
    message: 'Login successful',
  });
}

/** POST /api/v1/auth/logout */
export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
  });
  res.status(200).json({ message: 'Logged out' });
}

/** POST /api/v1/auth/refresh-token */
export async function refreshToken(req: Request, res: Response): Promise<void> {
  const token = req.cookies['refreshToken'] as string | undefined;

  if (!token) throw new AppError('No refresh token', 401);

  const result = await refreshAccessToken(token);
  res.status(200).json({ data: { accessToken: result.accessToken }, message: 'Token refreshed' });
}

