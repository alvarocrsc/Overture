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

/**
 * Optional variant of `verifyAccessToken`. If no Bearer token is present
 * the request continues anonymously. If a Bearer token *is* present but
 * fails to verify (expired, malformed, signed with a different secret),
 * a 401 is thrown so the frontend's refresh interceptor can swap in a
 * new access token — without this, per-user features layered on top of
 * a "public" listing endpoint (custom posters, follow state, …) silently
 * disappear the moment the access token expires.
 */
export function optionalAccessToken(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = authHeader.slice(7);
  const secret = process.env['JWT_ACCESS_SECRET'];
  if (!secret) {
    next();
    return;
  }
  try {
    const decoded = jwt.verify(token, secret) as AuthPayload;
    req.user = decoded;
  } catch {
    throw new AppError('Access token invalid or expired', 401);
  }
  next();
}
