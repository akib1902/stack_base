'use client';

import { useRef, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * A <details> menu keeps the trigger and items in the same focus order and needs
 * no portal. Choosing an item closes the menu.
 */
export function DropdownMenu({
  label,
  children,
  align = 'right',
  icon,
  className,
}: {
  label: string;
  children: ReactNode;
  align?: 'left' | 'right';
  icon?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  return (
    <details ref={ref} className={cn('relative shrink-0', className)}>
      <summary
        aria-label={label}
        className="grid size-8 cursor-pointer list-none place-items-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-foreground [&::-webkit-details-marker]:hidden"
      >
        {icon ?? <MoreHorizontal className="size-4" aria-hidden="true" />}
      </summary>
      <div
        className={cn(
          'absolute top-full z-30 mt-1 w-44 rounded-xl border border-border bg-surface p-1 shadow-lg',
          align === 'right' ? 'right-0' : 'left-0',
        )}
        onClick={() => {
          if (ref.current) ref.current.open = false;
        }}
      >
        {children}
      </div>
    </details>
  );
}

export function MenuItem({
  children,
  onClick,
  destructive = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors disabled:opacity-50',
        destructive
          ? 'text-error hover:bg-error/10'
          : 'text-foreground hover:bg-surface-raised',
      )}
    >
      {children}
    </button>
  );
}
