import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { JwtPayload } from '../types';
import { env } from '../config/env';

// ─── Augment Express Request type ─────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string | null;
        image: string | null;
      };
    }
  }
}

/**
 * JWT authentication middleware.
 *
 * Expects: Authorization: Bearer <token>
 *
 * The token is a standard HS256 JWT signed with JWT_SECRET — minted by the
 * Next.js frontend's NextAuth jwt callback, not by this server.
 *
 * On every authenticated request, we upsert the user into MySQL so that
 * the frontend never needs to call a separate /api/users/register endpoint.
 * The upsert is idempotent and fast (primary key lookup by email).
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Authorization: Bearer <token> header',
    });
    return;
  }

  const token = authHeader.slice(7).trim();

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    if (!decoded.email) {
      res.status(401).json({ error: 'Invalid token: missing email claim' });
      return;
    }

    // Upsert user on first call — keeps DB in sync with Google profile data
    const user = await prisma.user.upsert({
      where: { email: decoded.email },
      create: {
        email: decoded.email,
        name: decoded.name ?? null,
        image: decoded.picture ?? null,
      },
      update: {
        name: decoded.name ?? null,
        image: decoded.picture ?? null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    });

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired — please sign in again' });
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    next(err);
  }
}
