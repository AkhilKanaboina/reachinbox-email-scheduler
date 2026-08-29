'use client';

import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/Button';

interface HeaderProps {
  onCompose: () => void;
}

export function Header({ onCompose }: HeaderProps) {
  const { data: session, logout } = useSession();

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shadow-glow">
              <svg
                className="h-4 w-4 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <span className="text-base font-bold text-text-primary tracking-tight">
                Reach<span className="text-accent">Inbox</span>
              </span>
              <span className="ml-2 text-xs text-text-muted font-normal">
                Scheduler
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Compose Campaign */}
            <Button
              id="compose-campaign-btn"
              variant="primary"
              size="sm"
              onClick={onCompose}
              leftIcon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              <span className="hidden sm:inline">New Campaign</span>
              <span className="sm:hidden">New</span>
            </Button>

            {/* User Info */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-border-subtle">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name ?? 'User avatar'}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full ring-2 ring-border-default object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-xs font-semibold text-accent">
                    {session?.user?.name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                </div>
              )}

              <div className="hidden md:block">
                <p className="text-sm font-medium text-text-primary leading-none">
                  {session?.user?.name ?? 'User'}
                </p>
                <p className="mt-0.5 text-xs text-text-muted leading-none truncate max-w-[160px]">
                  {session?.user?.email}
                </p>
              </div>

              <button
                id="logout-btn"
                onClick={logout}
                className="ml-1 p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                title="Sign out"
                aria-label="Sign out"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
