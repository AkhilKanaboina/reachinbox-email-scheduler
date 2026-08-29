'use client';

import { ReactNode } from 'react';

// ─── Table ────────────────────────────────────────────────────────────────────

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-border-subtle ${className}`}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

// ─── TableHeader ──────────────────────────────────────────────────────────────

interface TableHeaderProps {
  columns: string[];
}

export function TableHeader({ columns }: TableHeaderProps) {
  return (
    <thead>
      <tr className="border-b border-border-subtle bg-elevated/50">
        {columns.map((col) => (
          <th
            key={col}
            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted whitespace-nowrap"
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// ─── TableBody ────────────────────────────────────────────────────────────────

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border-subtle">{children}</tbody>;
}

// ─── TableRow ─────────────────────────────────────────────────────────────────

export function TableRow({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={`transition-colors duration-100 hover:bg-elevated/40 ${className}`}
    >
      {children}
    </tr>
  );
}

// ─── TableCell ────────────────────────────────────────────────────────────────

export function TableCell({
  children,
  className = '',
  muted = false,
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
}) {
  return (
    <td
      className={[
        'px-4 py-3 whitespace-nowrap',
        muted ? 'text-text-muted' : 'text-text-primary',
        className,
      ].join(' ')}
    >
      {children}
    </td>
  );
}

// ─── TableEmpty ───────────────────────────────────────────────────────────────

export function TableEmpty({
  colSpan,
  icon,
  title,
  description,
}: {
  colSpan: number;
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <div className="flex flex-col items-center justify-center py-14 gap-3">
          {icon && (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-elevated text-text-muted">
              {icon}
            </div>
          )}
          <p className="text-sm font-medium text-text-secondary">{title}</p>
          {description && (
            <p className="text-xs text-text-muted max-w-xs text-center">
              {description}
            </p>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
      <p className="text-xs text-text-muted">
        Showing <span className="font-medium text-text-secondary">{start}–{end}</span>{' '}
        of <span className="font-medium text-text-secondary">{total}</span> results
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="px-2 text-xs text-text-secondary font-medium">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-elevated disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
