import { HardDrive } from 'lucide-react';
import { NavLinks } from './NavLinks';

export function Sidebar({ email }: { email: string | null }) {
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface lg:flex">
      <div className="flex items-center gap-3 px-5 pb-5 pt-5">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"
        >
          <HardDrive className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">StackBase</p>
          <p className="truncate text-[11px] uppercase tracking-[0.14em] text-muted">
            Personal cloud
          </p>
        </div>
      </div>

      <NavLinks />

      <div className="mt-auto border-t border-border px-5 py-4">
        <p className="truncate text-xs font-medium">{email ?? 'Signed in'}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Metadata build — encrypted uploads arrive in the next milestone.
        </p>
      </div>
    </aside>
  );
}
