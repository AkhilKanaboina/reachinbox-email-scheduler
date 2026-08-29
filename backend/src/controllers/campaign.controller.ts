import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { campaignService } from '../services/campaign.service';

// ─── Zod Schemas ───────────────────────────────────────────────────────────────

const LeadSchema = z.object({
  email: z
    .string({ required_error: 'Lead email is required' })
    .email('Invalid email address in leads array')
    .max(255),
  name: z.string().max(255).optional(),
});

export const ScheduleCampaignSchema = z.object({
  subject: z
    .string({ required_error: 'subject is required' })
    .min(1, 'Subject cannot be empty')
    .max(500, 'Subject cannot exceed 500 characters'),

  body: z
    .string({ required_error: 'body is required' })
    .min(1, 'Body cannot be empty'),

  leads: z
    .array(LeadSchema)
    .min(1, 'At least one lead is required')
    .max(10_000, 'Maximum 10,000 leads per campaign'),

  senderEmail: z
    .string({ required_error: 'senderEmail is required' })
    .email('Invalid sender email address'),

  hourlyLimit: z
    .number({ required_error: 'hourlyLimit is required' })
    .int('hourlyLimit must be an integer')
    .min(1, 'hourlyLimit must be at least 1')
    .max(1_000, 'hourlyLimit cannot exceed 1,000')
    .default(50),

  delaySeconds: z
    .number({ required_error: 'delaySeconds is required' })
    .int('delaySeconds must be an integer')
    .min(0, 'delaySeconds cannot be negative')
    .max(3_600, 'delaySeconds cannot exceed 3,600 (1 hour)')
    .default(5),

  startTime: z
    .string({ required_error: 'startTime is required' })
    .datetime({ message: 'startTime must be a valid ISO 8601 datetime string' }),
});

export type ScheduleCampaignBody = z.infer<typeof ScheduleCampaignSchema>;

// ─── Controller Functions ──────────────────────────────────────────────────────

/**
 * POST /api/campaigns/schedule
 * Creates a campaign and enqueues all email jobs.
 */
export async function scheduleCampaign(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const body = req.body as ScheduleCampaignBody;

    const result = await campaignService.scheduleCampaign(
      {
        subject: body.subject,
        body: body.body,
        leads: body.leads,
        senderEmail: body.senderEmail,
        hourlyLimit: body.hourlyLimit,
        delaySeconds: body.delaySeconds,
        startTime: new Date(body.startTime),
      },
      userId
    );

    res.status(201).json({
      success: true,
      message: `Campaign scheduled! ${result.emailCount} emails queued starting at ${result.scheduledAt.toISOString()}.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/campaigns
 * Lists all campaigns for the authenticated user.
 */
export async function getCampaigns(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const campaigns = await campaignService.getCampaigns(req.user!.id);
    res.json({ success: true, data: campaigns });
  } catch (error) {
    next(error);
  }
}
