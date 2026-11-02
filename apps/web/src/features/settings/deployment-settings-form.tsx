'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type {
  DeploymentSettingsResponse,
  DeploymentSettingsUpdate,
  StorageProvider,
} from '@stackbase/contracts';
import { CheckCircle2, KeyRound, Send, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeading } from '@/components/ui/Card';
import { FormError } from '@/components/ui/Dialog';
import { sendJson } from '@/lib/api/browser';
import { formatDateTime } from '@/lib/utils/format';

type SupabasePatch = NonNullable<DeploymentSettingsUpdate['supabase']>;
type TelegramPatch = NonNullable<DeploymentSettingsUpdate['telegram']>;

const describe = (failure: unknown): string =>
  failure instanceof Error ? failure.message : 'The settings could not be saved.';

const fieldClass =
  'mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted/70 focus-visible:border-primary font-mono';

function SecretState({
  configured,
  clear,
  onClear,
  disabled,
}: {
  configured: boolean;
  clear: boolean;
  onClear: (value: boolean) => void;
  disabled: boolean;
}) {
  if (!configured) {
    return <p className="mt-1 text-[11px] text-muted">No saved value.</p>;
  }
  return (
    <label className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
      <input
        type="checkbox"
        checked={clear}
        disabled={disabled}
        onChange={(event) => onClear(event.target.checked)}
        className="size-3.5 rounded border-border"
      />
      Remove the saved value on save
    </label>
  );
}

export function DeploymentSettingsForm({ initial }: { initial: DeploymentSettingsResponse }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [supabaseUrl, setSupabaseUrl] = useState(initial.auth.supabaseUrl ?? '');
  const [publishableKey, setPublishableKey] = useState('');
  const [jwtSecret, setJwtSecret] = useState('');
  const [jwksUrl, setJwksUrl] = useState(initial.auth.jwksUrl ?? '');
  const [provider, setProvider] = useState<StorageProvider>(initial.storage.provider);
  const [apiId, setApiId] = useState(initial.storage.telegramApiId?.toString() ?? '');
  const [apiHash, setApiHash] = useState('');
  const [clearPublishable, setClearPublishable] = useState(false);
  const [clearJwt, setClearJwt] = useState(false);
  const [clearApiHash, setClearApiHash] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const secretsAvailable = settings.secretStorage.configured;

  const save = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (pending) return;

    const parsedApiId = apiId.trim() ? Number(apiId) : null;
    if (parsedApiId !== null && (!Number.isInteger(parsedApiId) || parsedApiId < 1)) {
      setError('Telegram API ID must be a positive whole number.');
      return;
    }

    setPending(true);
    setError(null);
    setNotice(null);

    const supabase: SupabasePatch = {
      url: supabaseUrl.trim() || null,
      jwksUrl: jwksUrl.trim() || null,
    };
    if (publishableKey.trim()) supabase.publishableKey = publishableKey.trim();
    else if (clearPublishable) supabase.publishableKey = null;
    if (jwtSecret.trim()) supabase.jwtSecret = jwtSecret.trim();
    else if (clearJwt) supabase.jwtSecret = null;

    const telegram: TelegramPatch = {
      provider,
      apiId: parsedApiId,
    };
    if (apiHash.trim()) telegram.apiHash = apiHash.trim();
    else if (clearApiHash) telegram.apiHash = null;

    try {
      const result = await sendJson<DeploymentSettingsResponse>('/api/deployment', {
        method: 'PUT',
        body: { supabase, telegram } satisfies DeploymentSettingsUpdate,
      });
      setSettings(result);
      setSupabaseUrl(result.auth.supabaseUrl ?? '');
      setJwksUrl(result.auth.jwksUrl ?? '');
      setProvider(result.storage.provider);
      setApiId(result.storage.telegramApiId?.toString() ?? '');
      setPublishableKey('');
      setJwtSecret('');
      setApiHash('');
      setClearPublishable(false);
      setClearJwt(false);
      setClearApiHash(false);
      setNotice('Deployment settings saved and applied to the running API.');
      router.refresh();
    } catch (failure) {
      setError(describe(failure));
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={(event) => void save(event)}>
      <Card>
        <CardHeading
          icon={<ShieldCheck className="size-4" />}
          title="Supabase Auth"
          hint="Verification material used by the API; the web sign-in screen is unchanged"
          action={
            <Badge variant={settings.auth.active ? 'success' : 'muted'}>
              {settings.auth.mode === 'supabase' ? 'AUTH_MODE=supabase' : 'AUTH_MODE=dev'}
            </Badge>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium">
            Project URL
            <input
              value={supabaseUrl}
              onChange={(event) => setSupabaseUrl(event.target.value)}
              placeholder="https://your-project.supabase.co"
              inputMode="url"
              autoComplete="url"
              className={fieldClass}
            />
            <span className="mt-1 block text-[11px] font-normal leading-relaxed text-muted">
              The base URL only; a trailing <code className="font-mono">/auth/v1</code> is removed.
              HTTPS is required outside localhost development.
            </span>
          </label>

          <label className="text-xs font-medium">
            JWKS URL
            <input
              value={jwksUrl}
              onChange={(event) => setJwksUrl(event.target.value)}
              placeholder="https://your-project.supabase.co/auth/v1/.well-known/jwks.json"
              inputMode="url"
              autoComplete="url"
              className={fieldClass}
            />
            <span className="mt-1 block text-[11px] font-normal leading-relaxed text-muted">
              Leave blank to derive it from the project URL. Used for asymmetric signing keys.
            </span>
          </label>

          <label className="text-xs font-medium">
            Publishable / anon key
            <input
              type="password"
              value={publishableKey}
              onChange={(event) => setPublishableKey(event.target.value)}
              placeholder={
                settings.auth.publishableKeyConfigured
                  ? 'Saved — enter a new value to replace'
                  : 'eyJ…'
              }
              autoComplete="new-password"
              disabled={!secretsAvailable}
              className={fieldClass}
            />
            <SecretState
              configured={settings.auth.publishableKeyConfigured}
              clear={clearPublishable}
              onClear={setClearPublishable}
              disabled={!secretsAvailable || publishableKey.length > 0}
            />
          </label>

          <label className="text-xs font-medium">
            Legacy JWT secret
            <input
              type="password"
              value={jwtSecret}
              onChange={(event) => setJwtSecret(event.target.value)}
              placeholder={
                settings.auth.jwtSecretConfigured
                  ? 'Saved — enter a new value to replace'
                  : 'Optional; prefer JWKS'
              }
              autoComplete="new-password"
              disabled={!secretsAvailable}
              className={fieldClass}
            />
            <SecretState
              configured={settings.auth.jwtSecretConfigured}
              clear={clearJwt}
              onClear={setClearJwt}
              disabled={!secretsAvailable || jwtSecret.length > 0}
            />
          </label>
        </div>

        <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted">
          These values are applied only when the API runs with <code className="font-mono">AUTH_MODE=supabase</code>.
          Changing the project URL requires the matching JWT secret or JWKS URL, so saved material
          cannot silently verify tokens from a different project. The publishable key is stored for
          future client configuration; it is never returned by this API.
        </p>
        {settings.auth.source === 'saved' ? (
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Source: saved database values. Environment values remain the fallback.
          </p>
        ) : (
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Source: environment. Saving a value here makes it the active override.
          </p>
        )}
      </Card>

      <Card>
        <CardHeading
          icon={<Send className="size-4" />}
          title="Telegram storage"
          hint="MTProto application credentials and the active ciphertext provider"
          action={<Badge variant="muted">{settings.storage.provider}</Badge>}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium">
            Storage provider
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value as StorageProvider)}
              className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
            >
              <option value="local">Local filesystem (development only)</option>
              <option value="telegram">Telegram Saved Messages</option>
            </select>
            <span className="mt-1 block text-[11px] font-normal leading-relaxed text-muted">
              Production rejects the local provider. Switching to Telegram requires a linked
              account before uploads work.
            </span>
          </label>

          <label className="text-xs font-medium">
            API ID
            <input
              value={apiId}
              onChange={(event) => setApiId(event.target.value)}
              placeholder="12345678"
              inputMode="numeric"
              autoComplete="off"
              className={fieldClass}
            />
            <span className="mt-1 block text-[11px] font-normal leading-relaxed text-muted">
              From <span className="font-mono">my.telegram.org</span>. Changing it can invalidate
              existing sessions.
            </span>
          </label>

          <label className="text-xs font-medium sm:col-span-2">
            API hash
            <input
              type="password"
              value={apiHash}
              onChange={(event) => setApiHash(event.target.value)}
              placeholder={
                settings.storage.apiHashConfigured
                  ? 'Saved — enter a new value to replace'
                  : '32-character hexadecimal value'
              }
              autoComplete="new-password"
              disabled={!secretsAvailable}
              className={fieldClass}
            />
            <SecretState
              configured={settings.storage.apiHashConfigured}
              clear={clearApiHash}
              onClear={setClearApiHash}
              disabled={!secretsAvailable || apiHash.length > 0}
            />
          </label>
        </div>

        <dl className="mt-4 grid gap-3 border-t border-border pt-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted">Session encryption key</dt>
            <dd className="mt-0.5 font-medium">
              {settings.storage.sessionKeyConfigured ? (
                <span className="inline-flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  Configured in the API environment
                </span>
              ) : (
                <span className="text-warning">Missing: set SESSION_ENCRYPTION_KEY</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Last changed</dt>
            <dd className="mt-0.5 font-medium">
              {settings.updatedAt ? formatDateTime(settings.updatedAt) : 'Never'}
              {settings.updatedByEmail ? ` · ${settings.updatedByEmail}` : ''}
            </dd>
          </div>
        </dl>

        <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed text-muted">
          The API ID and hash identify the Telegram application; each user still connects their own
          account. Changing these credentials does not move already-stored ciphertext, but old
          sessions may need to be reconnected. The MTProto session key is not editable here.
        </p>
      </Card>

      <FormError message={error} />
      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-success/25 bg-success/10 px-3 py-2 text-sm text-success"
        >
          {notice}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-4">
        <p className="max-w-prose text-[11px] leading-relaxed text-muted">
          Saving writes an audit event with field names only. No secret is sent back, written to an
          audit row, or included in a log line.
        </p>
        <Button type="submit" disabled={pending}>
          <KeyRound className="size-4" aria-hidden="true" />
          {pending ? 'Saving…' : 'Save deployment settings'}
        </Button>
      </div>
    </form>
  );
}
