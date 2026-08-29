'use client';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export function Spinner({ size = 'md', className = '', label = 'Loading...' }: SpinnerProps) {
  return (
    <div role="status" className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        className={`${sizeMap[size]} animate-spin text-accent`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Full-screen or container-filling centered spinner */
export function SpinnerOverlay({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <Spinner size="lg" />
      <p className="text-sm text-text-muted">{label}</p>
    </div>
  );
}

/** Table row skeleton shimmer for loading states */
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-border-subtle">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-4 rounded bg-shimmer bg-[length:200%_100%] animate-shimmer"
            style={{ width: `${60 + Math.random() * 30}%` }}
          />
        </td>
      ))}
    </tr>
  );
}
