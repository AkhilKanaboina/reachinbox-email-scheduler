import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { emailService } from '../services/email.service';

// ─── Query Schema ──────────────────────────────────────────────────────────────

const GetEmailsQuerySchema = z.object({
  status: z
    .enum(['scheduled', 'sent', 'failed', 'all'])
    .default('all'),
  page: z
    .string()
    .optional()
    .default('1')
    .transform((v) => Math.max(1, parseInt(v, 10) || 1)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((v) => Math.min(100, Math.max(1, parseInt(v, 10) || 20))),
});

// ─── Controller ────────────────────────────────────────────────────────────────

/**
 * GET /api/emails
 *
 * Query params:
 *   status  — "scheduled" | "sent" | "failed" | "all"  (default: "all")
 *   page    — page number, default 1
 *   limit   — page size, 1–100, default 20
 */
export async function getEmails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = GetEmailsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { status, page, limit } = parsed.data;

    const result = await emailService.getEmails({
      status,
      userId: req.user!.id,
      page,
      limit,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
