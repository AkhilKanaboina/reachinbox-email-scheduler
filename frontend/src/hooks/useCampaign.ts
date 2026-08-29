'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ScheduleCampaignPayload, ScheduleResult } from '@/types';

interface UseCampaignReturn {
  schedule: (payload: ScheduleCampaignPayload) => Promise<ScheduleResult>;
  loading: boolean;
}

export function useCampaign(): UseCampaignReturn {
  const [loading, setLoading] = useState(false);

  const schedule = async (payload: ScheduleCampaignPayload): Promise<ScheduleResult> => {
    setLoading(true);
    try {
      const result = await api.campaigns.schedule(payload);
      toast.success(result.message ?? 'Campaign scheduled!', { duration: 5000 });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule campaign';
      toast.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { schedule, loading };
}
