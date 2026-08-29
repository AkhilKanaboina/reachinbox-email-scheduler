import {
  PaginatedEmailResponse,
  ScheduleCampaignPayload,
  ScheduleResult,
  EmailStatusFilter,
  Campaign,
} from '@/types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

// ─── Auth Helper ──────────────────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('You are not authenticated. Please sign in again.');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// ─── Generic Request ──────────────────────────────────────────────────────────

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers as Record<string, string>),
    },
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      json?.message ?? json?.error ?? `Request failed with status ${res.status}`
    );
  }

  return json as T;
}

// ─── API Client ───────────────────────────────────────────────────────────────

export const api = {
  campaigns: {
    /**
     * POST /api/campaigns/schedule
     * Schedules a new email campaign with the given leads and settings.
     */
    schedule: (payload: ScheduleCampaignPayload): Promise<ScheduleResult> =>
      request<ScheduleResult>('/api/campaigns/schedule', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    /**
     * GET /api/campaigns
     * Returns all campaigns for the authenticated user.
     */
    list: (): Promise<{ success: boolean; data: Campaign[] }> =>
      request('/api/campaigns'),
  },

  emails: {
    /**
     * GET /api/emails?status=...&page=...&limit=...
     * Returns paginated email jobs with optional status filter.
     */
    list: (params: {
      status?: EmailStatusFilter;
      page?: number;
      limit?: number;
    }): Promise<PaginatedEmailResponse> => {
      const searchParams = new URLSearchParams();
      if (params.status) searchParams.set('status', params.status);
      if (params.page) searchParams.set('page', String(params.page));
      if (params.limit) searchParams.set('limit', String(params.limit));
      const qs = searchParams.toString();
      return request<PaginatedEmailResponse>(`/api/emails${qs ? `?${qs}` : ''}`);
    },
  },
};
