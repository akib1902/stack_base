'use client';

import { useState, type ReactNode } from 'react';
import type { VaultRecord } from '@stackbase/contracts';
import { Lock, LockKeyhole, ShieldCheck, Unlock } from 'lucide-react';
import { Badge, StatusDot } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeading } from '@/components/ui/Card';
import { FormError } from '@/components/ui/Dialog';
import { CryptoError } from '@/lib/crypto/errors';
import { MIN_PASSPHRASE_LENGTH, assertPassphraseUsable, describeVaultRecord } from '@/lib/crypto/vault';
import { useVault } from './vault-context';

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2.5 last:border-0 last:pb-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium">{children}</dd>
    </div>
  );
}

function PassphraseField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium">{label}</span>
      <input
        type="password"
        value={value}
        autoComplete="new-password"
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
      />
      {hint ? <span className="mt-1 block text-[11px] text-muted">{hint}</span> : null}
    </label>
  );
}

function CreateVaultForm() {
  const vault = useVault();
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (): Promise<void> => {
    if (pending) return;
    setError(null);

    if (passphrase !== confirmation) {
      setError('The two passphrases do not match.');
      return;
    }
    try {
      assertPassphraseUsable(passphrase);
    } catch (failure) {
      setError(failure instanceof CryptoError ? failure.message : 'Use a longer passphrase.');
      return;
    }

    setPending(true);
    try {
      await vault.create(passphrase);
      setPassphrase('');
      setConfirmation('');
    } catch (failure) {
      setError(
        failure instanceof CryptoError
          ? failure.message
          : 'The vault could not be stored. Try again.',
      );
      setPending(false);
    }
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <FormError message={error} />
      <p className="text-sm leading-relaxed text-muted">
        Files are encrypted in this browser before they are uploaded, using a versioned format and
        a vault key that only your passphrase can unwrap. The server stores ciphertext, wrapped
        keys and hashes — never plaintext, never the passphrase.
      </p>
      <PassphraseField
        label="Passphrase"
        value={passphrase}
        onChange={setPassphrase}
        hint={`At least ${MIN_PASSPHRASE_LENGTH} characters. It is never stored or sent anywhere.`}
      />
      <PassphraseField
        label="Repeat passphrase"
        value={confirmation}
        onChange={setConfirmation}
        hint="A lost passphrase cannot be recovered: the server holds no key material."
      />
      <Button type="submit" size="sm" disabled={pending || passphrase.length === 0}>
        {pending ? 'Creating…' : 'Create vault'}
      </Button>
    </form>
  );
}

function UnlockForm() {
  const vault = useVault();
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (): Promise<void> => {
    if (pending || passphrase.length === 0) return;
    setPending(true);
    setError(null);
    try {
      await vault.unlock(passphrase);
      setPassphrase('');
    } catch (failure) {
      setError(
        failure instanceof CryptoError ? failure.message : 'The vault could not be unlocked.',
      );
      setPending(false);
    }
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <FormError message={error} />
      <p className="text-sm leading-relaxed text-muted">
        The vault record is stored, but the key is not: enter your passphrase to derive it in this
        browser. Every reload locks the vault again.
      </p>
      <PassphraseField label="Passphrase" value={passphrase} onChange={setPassphrase} />
      <Button type="submit" size="sm" disabled={pending || passphrase.length === 0}>
        {pending ? 'Unlocking…' : 'Unlock'}
      </Button>
    </form>
  );
}

export function VaultCard() {
  const vault = useVault();
  const record: VaultRecord | null = vault.record;

  const badge =
    vault.status === 'unlocked' ? (
      <Badge variant="success">
        <StatusDot variant="success" />
        Unlocked
      </Badge>
    ) : vault.status === 'locked' ? (
      <Badge variant="warning">
        <StatusDot variant="warning" />
        Locked
      </Badge>
    ) : (
      <Badge variant="muted">
        <StatusDot variant="muted" />
        Not set up
      </Badge>
    );

  return (
    <Card>
      <CardHeading
        icon={<Lock className="size-4" />}
        title="Encryption and recovery"
        hint="Client-side encryption is mandatory for every upload"
        action={badge}
      />
      <div className="space-y-4">
        {record === null ? <CreateVaultForm /> : null}
        {record !== null && vault.status === 'locked' ? <UnlockForm /> : null}

        {record !== null && vault.status === 'unlocked' ? (
          <div className="space-y-3">
            <p className="flex items-start gap-2 text-sm leading-relaxed text-muted">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              The vault key is held in this tab&apos;s memory only. Locking, closing the tab or
              reloading discards it until the passphrase is entered again.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => vault.lock()}
            >
              <Unlock className="size-3.5" aria-hidden="true" />
              Lock vault
            </Button>
          </div>
        ) : null}

        {record !== null ? (
          <dl className="border-t border-border pt-3">
            <DetailRow label="Format">
              <span className="inline-flex items-center gap-1.5">
                <LockKeyhole className="size-3.5 text-muted" aria-hidden="true" />
                {describeVaultRecord(record)}
              </span>
            </DetailRow>
            <DetailRow label="Created">{new Date(record.createdAt).toLocaleString()}</DetailRow>
            <DetailRow label="Last updated">{new Date(record.updatedAt).toLocaleString()}</DetailRow>
          </dl>
        ) : null}

        <p className="text-[11px] leading-relaxed text-muted">
          Losing the passphrase and every recovery copy permanently prevents decryption; the server
          never holds the key material to restore it.
        </p>
      </div>
    </Card>
  );
}
