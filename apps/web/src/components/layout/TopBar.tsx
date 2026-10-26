import type { AuthUser } from '@stackbase/contracts';
import { HardDrive, LogOut } from 'lucide-react';
import { signOutAction } from '@/features/auth/actions';
import { readTheme } from '@/lib/theme';
import { CommandPalette } from './CommandPalette';
import { ThemeToggle } from './ThemeToggle';

export async function TopBar({ user }: { user: AuthUser }) {
  const theme = await readTheme();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 lg:hidden">
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"
          >
            <HardDrive className="size-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">StackBase</span>
        </div>
        <p className="hidden text-xs text-muted lg:block">Personal cloud drive</p>

        <div className="flex items-center gap-2">
          <CommandPalette />
          <ThemeToggle current={theme} />
          <span className="hidden max-w-[220px] truncate rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted sm:inline">
            {user.email ?? user.id.slice(0, 8)}
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              title="Sign out"
              className="grid size-9 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="sr-only">Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
