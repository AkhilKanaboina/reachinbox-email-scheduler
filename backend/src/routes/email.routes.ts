import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getEmails } from '../controllers/email.controller';

const router = Router();

// All email routes require authentication
router.use(authMiddleware);

/**
 * GET /api/emails
 * Query: { status?: "scheduled"|"sent"|"failed"|"all", page?: number, limit?: number }
 */
router.get('/', getEmails);

export { router as emailRoutes };
