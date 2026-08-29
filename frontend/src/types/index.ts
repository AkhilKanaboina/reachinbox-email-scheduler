// ─── Shared Frontend Types ────────────────────────────────────────────────────

export interface Lead {
  email: string;
  name?: string;
}

export type JobStatus = 'PENDING' | 'SENT' | 'FAILED';
export type EmailStatusFilter = 'scheduled' | 'sent' | 'failed' | 'all';

export interface EmailJob {
  id: string;
  campaignId: string;
  recipientEmail: string;
  recipientName: string | null;
  status: JobStatus;
  scheduledAt: string;   // ISO string from DB
  sentAt: string | null;
  previewUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  campaign: {
    id: string;
    subject: string;
    body: string;
    senderEmail: string;
  };
}

export interface Campaign {
  id: string;
  subject: string;
  body: string;
  senderEmail: string;
  hourlyLimit: number;
  delaySeconds: number;
  scheduledAt: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedEmailResponse {
  success: boolean;
  items: EmailJob[];
  pagination: Pagination;
}

export interface ScheduleCampaignPayload {
  subject: string;
  body: string;
  leads: Lead[];
  senderEmail: string;
  hourlyLimit: number;
  delaySeconds: number;
  startTime: string; // ISO 8601
}

export interface ScheduleResult {
  success: boolean;
  message: string;
  data: {
    campaignId: string;
    emailCount: number;
    scheduledAt: string;
  };
}


