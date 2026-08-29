import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { EmailJob, EmailStatusFilter, Pagination as PaginationType } from '@/types';
import { Spinner } from '@/components/ui/Spinner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format date exactly like the Figma design (e.g. "Tue 9:15:12 AM") */
function formatFigmaDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = days[d.getDay()];
  
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  
  return `${dayName} ${hours}:${minutes}:${seconds} ${ampm}`;
}

/** Strip HTML tags to make a clean snippet of the email body */
function getSnippet(html: string): string {
  const text = html.replace(/<[^>]*>/g, ' ');
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > 90 ? clean.slice(0, 90) + '...' : clean;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface EmailTableProps {
  activeTab: EmailStatusFilter;
  searchQuery: string;
  refreshTrigger?: number;
}

export function EmailTable({ activeTab, searchQuery, refreshTrigger = 0 }: EmailTableProps) {
  const [emails, setEmails] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Clientside Starred set to make the star icons interactive
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch data using the status filter (All, Scheduled, Sent)
      const res = await api.emails.list({ status: activeTab, page: 1, limit: 100 });
      setEmails(res.items);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load emails';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails, refreshTrigger]);

  const toggleStar = (id: string) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter emails clientside based on the search query
  const filteredEmails = emails.filter((email) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const matchesRecipient =
      email.recipientEmail.toLowerCase().includes(query) ||
      (email.recipientName && email.recipientName.toLowerCase().includes(query));
    const matchesSubject = email.campaign.subject.toLowerCase().includes(query);
    return matchesRecipient || matchesSubject;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#ffffff]">
        <Spinner size="lg" />
        <p className="text-xs text-[#94a3b8] mt-3">Loading emails...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm font-semibold text-red-700">Failed to load emails</p>
        <p className="text-xs text-red-500 mt-1">{error}</p>
        <button
          onClick={fetchEmails}
          className="mt-3 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (filteredEmails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[#e2e8f0] rounded-2xl text-center p-6 bg-[#ffffff]">
        <svg className="h-8 w-8 text-[#cbd5e1] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h3 className="text-sm font-bold text-[#0f172a]">No emails found</h3>
        <p className="text-xs text-[#94a3b8] mt-1 max-w-xs">
          {searchQuery
            ? `No emails match the search term "${searchQuery}".`
            : activeTab === 'scheduled'
            ? 'No scheduled emails in queue. Click "Compose" to schedule some!'
            : 'No sent emails found.'}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[#e2e8f0] rounded-xl overflow-hidden bg-[#ffffff] divide-y divide-[#e2e8f0] animate-fade-up">
      {filteredEmails.map((email) => {
        const isStarred = starredIds.has(email.id);
        const isScheduled = email.status === 'PENDING';

        return (
          <div
            key={email.id}
            className="flex items-center justify-between px-6 py-4.5 hover:bg-[#f8fafc] transition-colors gap-4"
          >
            {/* Left: Recipient Name / Email */}
            <div className="w-48 shrink-0 min-w-0">
              <span className="text-sm font-semibold text-[#0f172a] truncate block">
                To: {email.recipientName || email.recipientEmail.split('@')[0]}
              </span>
            </div>

            {/* Middle Left: Status Pill */}
            <div className="w-36 shrink-0">
              {isScheduled ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fff7ed] text-[#ea580c] border border-[#ffedd5] uppercase tracking-wider">
                  {formatFigmaDate(email.scheduledAt)}
                </span>
              ) : email.status === 'SENT' ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f1f5f9] text-[#475569] uppercase tracking-wider">
                  Sent
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 uppercase tracking-wider" title={email.errorMessage || ''}>
                  Failed
                </span>
              )}
            </div>

            {/* Middle Right: Subject + Snippet */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-sm font-bold text-[#0f172a] truncate shrink-0 max-w-[200px]">
                {email.campaign.subject}
              </span>
              <span className="text-xs text-[#94a3b8]">—</span>
              <span className="text-xs text-[#94a3b8] truncate">
                {getSnippet(email.campaign.body)}
              </span>
            </div>

            {/* Right: Actions (View / Star) */}
            <div className="flex items-center gap-4 shrink-0">
              {/* Ethereal Mail Preview link */}
              {email.previewUrl && (
                <a
                  href={email.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#00a854] hover:underline flex items-center gap-1 font-semibold"
                  title="View Email Preview"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Preview
                </a>
              )}

              {/* Star Icon Button */}
              <button
                onClick={() => toggleStar(email.id)}
                className={`transition-colors p-1 rounded hover:bg-slate-100 ${
                  isStarred ? 'text-[#eab308]' : 'text-[#cbd5e1] hover:text-[#94a3b8]'
                }`}
                title={isStarred ? 'Unstar' : 'Star'}
              >
                <svg
                  className="h-4.5 w-4.5"
                  fill={isStarred ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.48 3.499c.195-.39.73-.39.925 0l2.354 4.77 5.26.76c.427.063.597.585.288.887l-3.807 3.707.898 5.238c.073.427-.37.747-.75.526L12 16.718l-4.722 2.483c-.38.201-.822-.119-.75-.526l.899-5.238L3.62 10.82c-.31-.302-.14-.824.288-.887l5.26-.76 2.354-4.77z"
                  />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
