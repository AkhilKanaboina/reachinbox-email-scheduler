import { useState, useCallback, useEffect } from 'react';
import { useSession } from '@/hooks/useSession';
import { EmailTable } from '@/components/dashboard/EmailTable';
import { ComposeModal } from '@/components/dashboard/ComposeModal';
import { SpinnerOverlay } from '@/components/ui/Spinner';
import { api } from '@/lib/api';
import { Campaign, EmailStatusFilter } from '@/types';

/**
 * Dashboard page redesigned to match the Figma mockup.
 *
 * Layout:
 *  - Left Sidebar: ONG Brand, User profile card, "Compose" outline CTA,
 *    and navigation tabs (Scheduled / Sent) with dynamic counts.
 *  - Main Content Area: Header with search input + icons, and the email message list.
 */
export default function DashboardPage() {
  const { data: session, status, logout } = useSession();
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<EmailStatusFilter>('scheduled');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const handleCampaignSuccess = useCallback(() => {
    setRefreshTrigger((n) => n + 1);
  }, []);

  // Fetch campaign statistics to show the Scheduled vs Sent counts in sidebar tabs
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await api.campaigns.list();
      setCampaigns(res.data ?? []);
    } catch {
      // Fail silently for non-critical stats
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStats();
    }
  }, [status, refreshTrigger]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#ffffff]">
        <SpinnerOverlay label="Loading dashboard..." />
      </div>
    );
  }

  // Calculate stats counts for the navigation badges
  const totalScheduled = campaigns.reduce((s, c) => s + (c.totalCount - c.sentCount - c.failedCount), 0);
  const totalSent = campaigns.reduce((s, c) => s + c.sentCount, 0);

  return (
    <div className="min-h-screen bg-[#ffffff] flex text-[#0f172a]">
      {/* ─── Left Sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-72 border-r border-[#e2e8f0] bg-[#ffffff] flex flex-col h-screen sticky top-0 p-6 shrink-0 justify-between">
        <div className="flex flex-col">
          {/* Brand Logo */}
          <div className="mb-6 font-extrabold text-2xl tracking-widest text-[#0f172a] select-none">
            ONG
          </div>

          {/* User Profile Card */}
          {session?.user && (
            <div className="flex items-center gap-3 p-3 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] mb-6">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name ?? 'User avatar'}
                  className="h-9 w-9 rounded-full object-cover border border-[#cbd5e1]"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-[#7c3aed]/10 flex items-center justify-center">
                  <span className="text-xs font-semibold text-[#7c3aed]">
                    {session.user.name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#0f172a] truncate">
                  {session.user.name ?? 'User'}
                </p>
                <p className="text-[10px] text-[#94a3b8] truncate">
                  {session.user.email}
                </p>
              </div>
              <button
                onClick={logout}
                className="p-1 rounded-lg hover:bg-red-50 text-[#94a3b8] hover:text-red-500 transition-colors"
                title="Sign out"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}

          {/* Compose Outline CTA */}
          <button
            onClick={() => setIsComposeOpen(true)}
            className="w-full border border-[#00a854] text-[#00a854] font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-[#eaf8f2] transition-colors mb-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#00a854]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Compose
          </button>

          {/* Navigation Section */}
          <div>
            <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-3 px-2">
              Core
            </div>
            <nav className="space-y-1">
              {/* Scheduled Tab */}
              <button
                onClick={() => setActiveTab('scheduled')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                  activeTab === 'scheduled'
                    ? 'bg-[#eaf8f2] text-[#00a854] font-semibold'
                    : 'text-[#64748b] hover:text-[#0f172a] hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Scheduled
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'scheduled' ? 'bg-[#00a854] text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {statsLoading ? '...' : totalScheduled}
                </span>
              </button>

              {/* Sent Tab */}
              <button
                onClick={() => setActiveTab('sent')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                  activeTab === 'sent'
                    ? 'bg-[#eaf8f2] text-[#00a854] font-semibold'
                    : 'text-[#64748b] hover:text-[#0f172a] hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Sent
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'sent' ? 'bg-[#00a854] text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {statsLoading ? '...' : totalSent}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-[10px] text-[#94a3b8] text-center">
          ReachInbox Dashboard v1.0
        </div>
      </aside>

      {/* ─── Main Content Area ─────────────────────────────────────────────── */}
      <main className="flex-1 bg-[#ffffff] min-h-screen flex flex-col p-8 overflow-y-auto">
        
        {/* Header Search Bar */}
        <div className="flex items-center bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 mb-6">
          <svg className="h-4 w-4 text-[#94a3b8] mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-0 outline-none text-sm placeholder-[#cbd5e1] text-[#0f172a]"
          />
          <div className="flex items-center gap-4 ml-3 text-[#94a3b8] shrink-0 border-l border-[#e2e8f0] pl-4">
            <button title="Filter" className="hover:text-[#0f172a] transition-colors">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            <button
              onClick={() => setRefreshTrigger((n) => n + 1)}
              title="Refresh"
              className="hover:text-[#0f172a] transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Email Message List */}
        <div className="flex-1">
          <EmailTable
            activeTab={activeTab}
            searchQuery={searchQuery}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </main>

      {/* ─── Compose Modal ──────────────────────────────────────────────────── */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={handleCampaignSuccess}
      />
    </div>
  );
}
