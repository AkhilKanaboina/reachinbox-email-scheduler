import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../utils/prisma';

const router = Router();

/**
 * POST /api/auth/google
 * Body: { idToken }
 *
 * Verifies a Google ID Token against Google's OAuth servers,
 * upserts the authenticated user into the database, and returns
 * a signed session JWT that the frontend client can store.
 */
router.post('/google', async (req, res, next): Promise<void> => {
  const { idToken } = req.body;

  if (!idToken) {
    res.status(400).json({ error: 'Missing Google idToken in request body.' });
    return;
  }

  try {
    // 1. Verify the ID token using Google's tokeninfo endpoint
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!response.ok) {
      res.status(401).json({ error: 'Invalid Google idToken' });
      return;
    }

    const payload = (await response.json()) as any;

    // Verify audience matches our Client ID
    if (payload.aud !== env.GOOGLE_CLIENT_ID) {
      res.status(401).json({ error: 'Audience verification failed: Client ID mismatch' });
      return;
    }

    const { email, name, picture } = payload;
    if (!email) {
      res.status(400).json({ error: 'Google profile does not contain an email address' });
      return;
    }

    // 2. Upsert the User record in database (idempotent Google profile sync)
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: name ?? null,
        image: picture ?? null,
      },
      update: {
        name: name ?? null,
        image: picture ?? null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    });

    // 3. Generate our own JWT signed with JWT_SECRET
    // The payload signature matches what auth.middleware.ts expects
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        picture: user.image,
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    console.error('Error during Google authentication:', error);
    next(error);
  }
});

export { router as authRoutes };
