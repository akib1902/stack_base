import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  footer,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  footer?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-surface-raised/60 p-5">
      <span className="rounded-lg bg-primary/10 p-2 text-primary" aria-hidden="true">
        {icon}
      </span>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted">{description}</p>
      </div>
      {footer}
    </div>
  );
}
