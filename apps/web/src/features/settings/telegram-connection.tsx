'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type {
  SetupStatusResponse,
  TelegramAuthorizeResponse,
  TelegramVerifyResponse,
} from '@stackbase/contracts';
import { CheckCircle2, Link2, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Dialog';
import { sendJson } from '@/lib/api/browser';
import { formatDateTime } from '@/lib/utils/format';

type Step = 'idle' | 'code' | 'password';
type Storage = SetupStatusResponse['storage'];

const describe = (failure: unknown): string =>
  failure instanceof Error ? failure.message : 'The Telegram request failed.';

/**
 * Phone → code → (optional) two-factor password, then a status view with
 * revalidation and disconnect. The pending login id stays in component state
 * only; it is a single-use handle that the server also keeps in memory.
 */
export function TelegramConnectionForm({ storage }: { storage: Storage }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('idle');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loginId, setLoginId] = useState<string | null>(null);
  const [viaApp, setViaApp] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const connected = storage.status === 'connected';

  const authorize = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (pending || !phoneNumber.trim()) return;
    setPending(true);
    setError(null);
    try {
      const result = await sendJson<TelegramAuthorizeResponse>('/api/storage/telegram', {
        method: 'POST',
        body: { action: 'authorize', request: { phoneNumber: phoneNumber.trim() } },
      });
      setLoginId(result.loginId);
      setViaApp(result.viaApp);
      setStep('code');
      setCode('');
      setHint(null);
    } catch (failure) {
      setError(describe(failure));
    } finally {
      setPending(false);
    }
  };

  const verify = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (pending || !loginId) return;
    setPending(true);
    setError(null);
    try {
      const result = await sendJson<TelegramVerifyResponse>('/api/storage/telegram', {
        method: 'POST',
        body: {
          action: 'verify',
          request:
            step === 'password' ? { loginId, password } : { loginId, code: code.trim() },
        },
      });
      if (result.kind === 'password_required') {
        setStep('password');
        setHint(result.hint);
        setPassword('');
        return;
      }
      // Success: back to the server-rendered status view.
      setStep('idle');
      setLoginId(null);
      setPhoneNumber('');
      router.refresh();
    } catch (failure) {
      setError(describe(failure));
    } finally {
      setPending(false);
    }
  };

  const revalidate = async (): Promise<void> => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await sendJson<TelegramVerifyResponse>('/api/storage/telegram', {
        method: 'POST',
        body: { action: 'verify', request: {} },
      });
      router.refresh();
    } catch (failure) {
      setError(describe(failure));
    } finally {
      setPending(false);
    }
  };

  const disconnect = async (): Promise<void> => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await sendJson<{ status: string }>('/api/storage/telegram', {
        method: 'POST',
        body: { action: 'disconnect' },
      });
      setStep('idle');
      setLoginId(null);
      setPhoneNumber('');
      router.refresh();
    } catch (failure) {
      setError(describe(failure));
    } finally {
      setPending(false);
    }
  };

  if (storage.provider === 'local') {
    return (
      <div className="mt-3 rounded-xl border border-border bg-surface-raised/50 px-3 py-3">
        <p className="text-xs leading-relaxed text-muted">
          This deployment stores ciphertext with the development filesystem provider, so no
          Telegram account is needed. Set <code className="font-mono">TELEGRAM_API_ID</code> and{' '}
          <code className="font-mono">TELEGRAM_API_HASH</code> and restart the API to link your own
          account instead.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <FormError message={error} />

      {connected ? (
        <div className="space-y-3">
          <dl className="rounded-xl border border-border bg-surface-raised/50 px-3 py-2">
            <div className="flex items-center justify-between gap-3 py-1.5">
              <dt className="text-xs text-muted">Account</dt>
              <dd className="text-xs font-medium">{storage.accountIdentifier ?? 'Unknown'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-1.5">
              <dt className="text-xs text-muted">Last validated</dt>
              <dd className="text-xs font-medium">
                {storage.lastValidatedAt ? formatDateTime(storage.lastValidatedAt) : 'Never'}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => void revalidate()} disabled={pending}>
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              {pending ? 'Checking…' : 'Check connection'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => void disconnect()} disabled={pending}>
              <Unlink className="size-3.5" aria-hidden="true" />
              Disconnect
            </Button>
          </div>
          <p className="text-[11px] leading-relaxed text-muted">
            Disconnecting forgets the session; stored ciphertext stays untouched, so reconnecting
            with the same account can read it again.
          </p>
        </div>
      ) : step === 'idle' ? (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => void authorize(event)}>
          <label className="min-w-[14rem] flex-1">
            <span className="text-xs font-medium">Phone number</span>
            <input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="+1 555 000 0000"
              autoComplete="tel"
              className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
            />
          </label>
          <Button type="submit" size="sm" disabled={pending || !phoneNumber.trim()}>
            <Link2 className="size-3.5" aria-hidden="true" />
            {pending ? 'Sending…' : 'Send code'}
          </Button>
        </form>
      ) : step === 'code' ? (
        <form className="space-y-3" onSubmit={(event) => void verify(event)}>
          <p className="text-xs leading-relaxed text-muted">
            {viaApp
              ? 'Telegram delivered the code inside your app session — enter it below.'
              : 'Enter the login code Telegram just sent to your account.'}
          </p>
          <label className="block">
            <span className="text-xs font-medium">Login code</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending || code.trim().length < 3}>
              {pending ? 'Verifying…' : 'Verify'}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setStep('idle')}>
              Use another number
            </Button>
          </div>
        </form>
      ) : (
        <form className="space-y-3" onSubmit={(event) => void verify(event)}>
          <p className="text-xs leading-relaxed text-muted">
            This account has two-step verification enabled.
            {hint ? ` Telegram’s hint: ${hint}` : ''}
          </p>
          <label className="block">
            <span className="text-xs font-medium">Two-step verification password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending || password.length === 0}>
              {pending ? 'Verifying…' : 'Verify'}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setStep('idle')}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}