import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type BadgeVariant = 'success' | 'muted' | 'warning' | 'danger' | 'primary';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'border-success/25 bg-success/10 text-success',
  muted: 'border-border bg-surface-raised text-muted',
  warning: 'border-primary/25 bg-primary/10 text-primary-ink',
  danger: 'border-error/25 bg-error/10 text-error',
  primary: 'border-primary/30 bg-primary/10 text-primary-ink',
};

export function Badge({
  children,
  variant = 'muted',
  className,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Small status dot paired with a text label (never colour alone). */
export function StatusDot({ variant }: { variant: 'success' | 'muted' | 'warning' | 'danger' }) {
  const colour = {
    success: 'bg-success',
    muted: 'bg-muted',
    warning: 'bg-primary',
    danger: 'bg-error',
  }[variant];

  return <span aria-hidden="true" className={cn('size-1.5 rounded-full', colour)} />;
}
