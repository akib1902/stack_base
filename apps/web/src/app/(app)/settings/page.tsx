import { redirect } from 'next/navigation';
import type { MeResponse, SetupStatusResponse } from '@stackbase/contracts';
import type { ReactNode } from 'react';
import { Lock, Palette, Send, ShieldCheck, SlidersHorizontal, UserRound } from 'lucide-react';
import { Badge, StatusDot } from '@/components/ui/Badge';
import { Card, CardHeading } from '@/components/ui/Card';
import { ThemePicker } from '@/features/settings/theme-picker';
import { describeStorage } from '@/features/setup/storage-status';
import { UnauthenticatedError, apiFetch } from '@/lib/api/client';
import { readTheme } from '@/lib/theme';
import { formatDateTime } from '@/lib/utils/format';

export const metadata = { title: 'Settings' };

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2.5 last:border-0 last:pb-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium">{children}</dd>
    </div>
  );
}

export default async function SettingsPage() {
  let me: MeResponse;
  let setup: SetupStatusResponse;

  try {
    [me, setup] = await Promise.all([
      apiFetch<MeResponse>('/api/v1/me'),
      apiFetch<SetupStatusResponse>('/api/v1/setup/status'),
    ]);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect('/sign-in');
    }
    throw error;
  }

  const theme = await readTheme();
  const storage = describeStorage(setup.storage);

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Configuration
        </p>
        <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">
          Account, appearance and connection state. Nothing here needs a privileged credential,
          and session material is never displayed.
        </p>
      </header>

      <Card>
        <CardHeading
          icon={<Palette className="size-4" />}
          title="Appearance"
          hint="Applied instantly and remembered in this browser"
        />
        <ThemePicker current={theme} />
      </Card>

      <Card>
        <CardHeading
          icon={<UserRound className="size-4" />}
          title="Account"
          hint="Identity is verified from the session token on every request"
        />
        <dl>
          <DetailRow label="Email">{me.user.email ?? 'Not provided'}</DetailRow>
          <DetailRow label="User ID">
            <code className="font-mono text-xs">{me.user.id}</code>
          </DetailRow>
          <DetailRow label="Display name">{me.user.displayName ?? 'Not set'}</DetailRow>
          <DetailRow label="Member since">{formatDateTime(me.user.createdAt)}</DetailRow>
        </dl>
      </Card>

      <Card>
        <CardHeading
          icon={<Send className="size-4" />}
          title="Telegram connection"
          hint="Encrypted payloads live in your own Saved Messages"
          action={
            <Badge variant={storage.variant}>
              <StatusDot variant={storage.variant} />
              {storage.label}
            </Badge>
          }
        />
        <p className="text-sm leading-relaxed text-muted">{storage.detail}</p>
        <dl className="mt-3">
          <DetailRow label="Provider">Telegram</DetailRow>
          <DetailRow label="Account">
            {setup.storage.accountIdentifier ?? 'No account linked'}
          </DetailRow>
          <DetailRow label="Last validated">
            {setup.storage.lastValidatedAt
              ? formatDateTime(setup.storage.lastValidatedAt)
              : 'Never'}
          </DetailRow>
          {setup.storage.lastErrorCode ? (
            <DetailRow label="Last error">
              <code className="font-mono text-xs">{setup.storage.lastErrorCode}</code>
            </DetailRow>
          ) : null}
        </dl>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          The MTProto session is encrypted with a deployment key and stays server-side; it is
          never sent to the browser, logged or returned by an endpoint.
        </p>
      </Card>

      <Card>
        <CardHeading
          icon={<Lock className="size-4" />}
          title="Encryption and recovery"
          hint="Client-side encryption is not enabled yet"
          action={
            <Badge variant="muted">
              <StatusDot variant="muted" />
              Not set up
            </Badge>
          }
        />
        <p className="text-sm leading-relaxed text-muted">
          Files will be encrypted in the browser before they leave the device, using a
          versioned format and a passphrase-wrapped vault key. Until that format is implemented
          and pinned, uploads stay disabled — no plaintext is stored anywhere in the meantime.
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Losing the passphrase and every recovery copy permanently prevents decryption; the
          server never holds the key material to restore it.
        </p>
      </Card>

      <Card>
        <CardHeading
          icon={<SlidersHorizontal className="size-4" />}
          title="Uploads and retention"
          hint="Stored defaults, read-only until the settings API ships"
        />
        <dl>
          <DetailRow label="Retention for trashed files">
            {me.settings.trashRetentionDays} days
          </DetailRow>
          <DetailRow label="Default view">{me.settings.defaultView}</DetailRow>
          <DetailRow label="Default sort">{me.settings.defaultSort}</DetailRow>
          <DetailRow label="Offline metadata">
            {me.settings.offlineEnabled ? 'Enabled' : 'Disabled'}
          </DetailRow>
        </dl>
      </Card>

      <Card>
        <CardHeading
          icon={<ShieldCheck className="size-4" />}
          title="Sharing"
          hint="Revocable links arrive with the sharing milestone"
        />
        <p className="text-sm leading-relaxed text-muted">
          No shares exist yet. Share links will reference a single immutable file version, be
          revocable server-side and never expose your storage credentials.
        </p>
      </Card>
    </div>
  );
}
