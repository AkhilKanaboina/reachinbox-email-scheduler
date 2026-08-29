'use client';

type BadgeVariant = 'pending' | 'sent' | 'failed' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
}

const badgeConfig: Record<
  BadgeVariant,
  { classes: string; dot: string; label: string }
> = {
  pending: {
    classes: 'bg-warning/10 text-warning border-warning/30',
    dot: 'bg-warning',
    label: 'Scheduled',
  },
  sent: {
    classes: 'bg-success/10 text-success border-success/30',
    dot: 'bg-success',
    label: 'Sent',
  },
  failed: {
    classes: 'bg-danger/10 text-danger border-danger/30',
    dot: 'bg-danger',
    label: 'Failed',
  },
  default: {
    classes: 'bg-elevated text-text-secondary border-border-default',
    dot: 'bg-text-muted',
    label: '',
  },
};

export function Badge({ variant = 'default', children, className = '', pulse }: BadgeProps) {
  const config = badgeConfig[variant];

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2 py-0.5',
        'rounded-full text-xs font-medium border',
        'whitespace-nowrap',
        config.classes,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        className={[
          'h-1.5 w-1.5 rounded-full shrink-0',
          config.dot,
          pulse && variant === 'pending' ? 'animate-pulse-subtle' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      />
      {children}
    </span>
  );
}

/** Convenience wrapper that maps JobStatus strings to badge variants */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    PENDING: 'pending',
    SENT: 'sent',
    FAILED: 'failed',
  };
  const labels: Record<string, string> = {
    PENDING: 'Scheduled',
    SENT: 'Sent',
    FAILED: 'Failed',
  };
  const variant = map[status] ?? 'default';
  return (
    <Badge variant={variant} pulse={status === 'PENDING'}>
      {labels[status] ?? status}
    </Badge>
  );
}
