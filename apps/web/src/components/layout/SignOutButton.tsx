'use client';

import { useTransition } from 'react';
import { LogOut } from 'lucide-react';
import { signOutAction } from '@/features/auth/actions';
import { clearOfflineData } from '@/features/offline/metadata-cache';

/**
 * Sign-out must also drop the account-scoped local state: the IndexedDB
 * metadata mirror and the queued-operation store (SRS C8). The service
 * worker's caches hold public shell assets only, so they stay.
 */
export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      title="Sign out"
      disabled={pending}
      onClick={() => {
        void clearOfflineData();
        startTransition(async () => {
          await signOutAction();
        });
      }}
      className="grid size-9 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:bg-surface-raised hover:text-foreground disabled:opacity-60"
    >
      <LogOut className="size-4" aria-hidden="true" />
      <span className="sr-only">Sign out</span>
    </button>
  );
}