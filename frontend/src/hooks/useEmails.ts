'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { EmailJob, EmailStatusFilter, Pagination } from '@/types';

interface UseEmailsReturn {
  emails: EmailJob[];
  pagination: Pagination;
  loading: boolean;
  error: string | null;
  page: number;
  setPage: (p: number) => void;
  refresh: () => void;
}

export function useEmails(
  status: EmailStatusFilter = 'all',
  limit = 20
): UseEmailsReturn {
  const [emails, setEmails] = useState<EmailJob[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.emails.list({ status, page, limit });
      setEmails(res.items);
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  }, [status, page, limit]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Reset to page 1 when status changes
  useEffect(() => {
    setPage(1);
  }, [status]);

  return { emails, pagination, loading, error, page, setPage, refresh: fetch };
}
