'use client';

import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog, FormError } from '@/components/ui/Dialog';
import { CRYPTO_ERROR_COPY, CryptoError } from '@/lib/crypto/errors';
import { MIN_PASSPHRASE_LENGTH } from '@/lib/crypto/vault';
import { useVault } from './vault-context';

/**
 * Shown whenever an action needs the vault key: uploading, downloading or
 * opening the settings card while locked. Unlocking only ever happens here, in
 * the browser, against the record the server already holds.
 */
export function UnlockVaultDialog({
  open,
  onClose,
  onUnlocked,
}: {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void;
}) {
  const vault = useVault();
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setPassphrase('');
      setError(null);
      setPending(false);
    }
  }, [open]);

  const submit = async (): Promise<void> => {
    if (pending || passphrase.length === 0) return;
    setPending(true);
    setError(null);
    try {
      await vault.unlock(passphrase);
      onUnlocked();
    } catch (failure) {
      setError(
        failure instanceof CryptoError
          ? failure.message
          : 'The vault could not be unlocked on this device.',
      );
      setPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Unlock your vault"
      description="The vault key never leaves this device; unlocking derives it from your passphrase in the browser."
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void submit()}
            disabled={pending || passphrase.length === 0}
          >
            {pending ? 'Unlocking…' : 'Unlock'}
          </Button>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <FormError message={error} />
        <label className="block">
          <span className="text-xs font-medium">Passphrase</span>
          <input
            type="password"
            autoFocus
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            autoComplete="current-password"
            className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
          />
        </label>
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
          <KeyRound className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {CRYPTO_ERROR_COPY.WRONG_PASSPHRASE} There is no recovery server-side: a lost passphrase
          means the encrypted files stay unreadable.
        </p>
        <p className="text-[11px] text-muted">
          Deriving the key takes a moment: Argon2id is deliberately slow
          ({MIN_PASSPHRASE_LENGTH}+ characters required).
        </p>
      </form>
    </Dialog>
  );
}
