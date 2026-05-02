import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthPayload } from '../types/auth.types';
import { AppError } from '../utils/app-error';

/**
 * Express middleware that validates the Bearer token in the Authorization header.
 * On success, attaches the decoded payload to `req.user`.
 * Throws a 401 AppError if the token is missing, malformed, or expired.
 */
export function verifyAccessToken(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Access token missing or malformed', 401);
  }

  const token = authHeader.slice(7);
  const secret = process.env['JWT_ACCESS_SECRET'];

  if (!secret) {
    throw new AppError('Server configuration error', 500);
  }

  const decoded = jwt.verify(token, secret) as AuthPayload;
  req.user = decoded;
  next();
}
