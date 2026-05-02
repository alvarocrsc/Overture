import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodType, ZodError } from 'zod';

/**
 * Factory that returns an Express middleware which validates `req.body`
 * against the provided Zod schema. Calls `next()` on success or returns
 * a 400 response with structured Zod error details on failure.
 *
 * @param schema - A Zod schema to validate the request body against.
 * @returns Express request handler middleware.
 */
export function validate(schema: ZodType): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = (result.error as ZodError).issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      res.status(400).json({ error: 'Validation failed', details: errors });
      return;
    }

    req.body = result.data;
    next();
  };
}
