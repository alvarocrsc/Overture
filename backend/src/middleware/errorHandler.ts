import type { Request, Response, NextFunction } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ZodError } from 'zod';
import { AppError } from '../utils/app-error';

/**
 * Global Express error handler. Must be registered as the last middleware
 * in app.ts. Express 5 automatically forwards errors thrown inside async
 * route handlers to this handler without needing next(err) wrappers.
 *
 * Handles:
 * - AppError  → returns its statusCode
 * - ZodError  → 400
 * - JWT errors → 401
 * - All others → 500
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // next is required for Express to recognise this as an error handler
  _next: NextFunction,
): void {
  console.error(err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', details: err.issues });
    return;
  }

  if (err instanceof TokenExpiredError) {
    res.status(401).json({ error: 'Token expired' });
    return;
  }

  if (err instanceof JsonWebTokenError) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  if (err instanceof Error) {
    res.status(500).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'An unexpected error occurred' });
}
