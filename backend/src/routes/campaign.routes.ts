import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import {
  scheduleCampaign,
  getCampaigns,
  ScheduleCampaignSchema,
} from '../controllers/campaign.controller';

const router = Router();

// All campaign routes require authentication
router.use(authMiddleware);

/**
 * POST /api/campaigns/schedule
 * Body: { subject, body, leads, senderEmail, hourlyLimit, delaySeconds, startTime }
 */
router.post('/schedule', validateBody(ScheduleCampaignSchema), scheduleCampaign);

/**
 * GET /api/campaigns
 * Returns all campaigns for the authenticated user.
 */
router.get('/', getCampaigns);

export { router as campaignRoutes };
