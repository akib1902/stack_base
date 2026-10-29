'use client';

import { useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/** Width of the menu in `w-44`; used to choose a side that stays on screen. */
const MENU_WIDTH = 176;
const EDGE = 8;

/**
 * A <details> menu keeps the trigger and items in the same focus order and needs
 * no portal. Choosing an item closes the menu, returning focus to the trigger
 * so a dialog opened from an item restores focus there on close.
 *
 * The menu opens to whichever side has room: a right-aligned menu next to a
 * trigger on the left of a narrow screen would otherwise be clipped.
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
  const [side, setSide] = useState<'left' | 'right'>(align);

  const chooseSide = (): void => {
    const trigger = ref.current?.querySelector('summary');
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const fitsRight = window.innerWidth - rect.left >= MENU_WIDTH + EDGE;
    const fitsLeft = rect.right - MENU_WIDTH >= EDGE;
    setSide(fitsRight || !fitsLeft ? 'left' : 'right');
  };

  return (
    <details ref={ref} className={cn('relative shrink-0', className)}>
      <summary
        aria-label={label}
        onClick={() => {
          // Runs before the native toggle, so the menu mounts on the side that
          // has room. Enter and Space on the summary dispatch a click too.
          if (ref.current && !ref.current.open) chooseSide();
        }}
        className="grid size-8 cursor-pointer list-none place-items-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-foreground [&::-webkit-details-marker]:hidden"
      >
        {icon ?? <MoreHorizontal className="size-4" aria-hidden="true" />}
      </summary>
      <div
        className={cn(
          'absolute top-full z-30 mt-1 w-44 rounded-xl border border-border bg-surface p-1 shadow-lg',
          side === 'right' ? 'right-0' : 'left-0',
        )}
        onClick={() => {
          const details = ref.current;
          if (!details) return;
          // Focus the visible trigger before hiding the item that was clicked:
          // native <dialog> restores focus to whatever was focused when it
          // opened, and the menu item is about to disappear.
          details.querySelector('summary')?.focus();
          details.open = false;
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
