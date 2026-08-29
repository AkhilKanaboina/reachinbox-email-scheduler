import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Request body validation middleware using Zod.
 *
 * - Parses req.body against the provided schema.
 * - On success: replaces req.body with the parsed (and coerced) value.
 * - On failure: returns 400 with structured field errors.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'One or more request body fields are invalid.',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    req.body = result.data;
    next();
  };
}

/**
 * Query parameter validation middleware using Zod.
 *
 * All query params arrive as strings; use z.coerce in your schema
 * to automatically convert "20" → 20 for numeric params.
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        message: 'One or more query parameters are invalid.',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    // Attach validated+coerced query to req for downstream handlers
    (req as Request & { validatedQuery: T }).validatedQuery = result.data;
    next();
  };
}
