import type { ReactNode } from 'react';
import type { AuthUser } from '@stackbase/contracts';
import { MobileNavigation } from './MobileNavigation';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell({ user, children }: { user: AuthUser; children: ReactNode }) {
  return (
    <div className="app-canvas min-h-dvh lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only rounded-lg bg-surface px-3 py-2 text-sm focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:border focus:border-border"
      >
        Skip to content
      </a>
      <Sidebar email={user.email} />
      <div className="flex min-h-dvh flex-col">
        <TopBar user={user} />
        <main
          id="main"
          className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-12"
        >
          {children}
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
}
