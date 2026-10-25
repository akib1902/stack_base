import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export function Card({
  children,
  className,
  delay,
}: {
  children: ReactNode;
  className?: string;
  /** Entrance offset in milliseconds, used to stagger a Bento row. */
  delay?: number;
}) {
  return (
    <div
      className={cn(
        'glass reveal rounded-card border border-border p-5 backdrop-blur-xl backdrop-saturate-150',
        className,
      )}
      style={delay === undefined ? undefined : { animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function CardHeading({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? <span className="mt-0.5 text-primary">{icon}</span> : null}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {hint ? <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}
