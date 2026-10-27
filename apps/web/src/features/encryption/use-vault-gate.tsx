'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Dialog } from '@/components/ui/Dialog';
import { UnlockVaultDialog } from './unlock-dialog';
import { useVault } from './vault-context';

/**
 * Every content action (upload, download) needs the vault key. The gate runs the
 * action straight away when the vault is unlocked, asks for the passphrase when
 * it is locked, and points at Settings when no vault exists yet — so callers
 * never have to branch on vault state themselves.
 */
export function useVaultGate() {
  const vault = useVault();
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  const requireUnlocked = useCallback(
    (action: () => void) => {
      if (vault.status === 'unlocked') {
        action();
        return;
      }
      setPending(() => action);
      if (vault.status === 'locked') setUnlockOpen(true);
      else setSetupOpen(true);
    },
    [vault.status],
  );

  const close = useCallback(() => {
    setUnlockOpen(false);
    setSetupOpen(false);
    setPending(null);
  }, []);

  const dialog = (
    <>
      <UnlockVaultDialog
        open={unlockOpen}
        onClose={close}
        onUnlocked={() => {
          const action = pending;
          close();
          action?.();
        }}
      />
      <Dialog
        open={setupOpen}
        onClose={close}
        title="Create a vault first"
        description="Encryption is mandatory: nothing is uploaded, and no metadata is described as stored, until a vault exists."
        footer={
          <Link
            href="/settings"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Open settings
          </Link>
        }
      >
        <p className="text-sm leading-relaxed text-muted">
          A vault is a passphrase-wrapped key that lives in your browser. Create it once from the
          encryption card in Settings, and every upload is encrypted on this device before it
          leaves it.
        </p>
      </Dialog>
    </>
  );

  return { requireUnlocked, dialog, status: vault.status };
}
