// ─── Shared Types for Backend ─────────────────────────────────────────────────

export interface Lead {
  email: string;
  name?: string;
}

export interface ScheduleCampaignInput {
  subject: string;
  body: string;
  leads: Lead[];
  senderEmail: string;
  hourlyLimit: number;
  delaySeconds: number;
  startTime: Date;
}

/**
 * Data payload stored in each BullMQ job.
 * Everything the worker needs to send one email.
 */
export interface EmailJobData {
  emailJobId: string;
  campaignId: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  body: string;
  senderEmail: string;
  hourlyLimit: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Milliseconds to wait before the next available send window */
  retryAfterMs: number;
  currentCount: number;
  /** The hour bucket key used (for deterministic retry job IDs) */
  hourKey: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  iat?: number;
  exp?: number;
}
