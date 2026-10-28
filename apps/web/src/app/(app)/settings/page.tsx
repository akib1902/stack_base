import Link from 'next/link';
import { redirect } from 'next/navigation';
import type {
  MeResponse,
  SetupStatusResponse,
  ShareListResponse,
  TagListResponse,
} from '@stackbase/contracts';
import type { ReactNode } from 'react';
import {
  CloudOff,
  Palette,
  Send,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  UserRound,
} from 'lucide-react';
import { Badge, StatusDot } from '@/components/ui/Badge';
import { Card, CardHeading } from '@/components/ui/Card';
import { VaultCard } from '@/features/encryption/vault-card';
import { LibraryPreferences } from '@/features/settings/library-preferences';
import { OfflinePreferences } from '@/features/settings/offline-preferences';
import { TelegramConnectionForm } from '@/features/settings/telegram-connection';
import { TagManager } from '@/features/settings/tag-manager';
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
  let tags: TagListResponse;
  let shares: ShareListResponse;

  try {
    [me, setup, tags, shares] = await Promise.all([
      apiFetch<MeResponse>('/api/v1/me'),
      apiFetch<SetupStatusResponse>('/api/v1/setup/status'),
      apiFetch<TagListResponse>('/api/v1/tags'),
      apiFetch<ShareListResponse>('/api/v1/shares'),
    ]);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect('/sign-in');
    }
    throw error;
  }

  const theme = await readTheme();
  const storage = describeStorage(setup.storage);
  const activeShares = shares.items.filter((share) => share.status === 'active').length;

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
          icon={<SlidersHorizontal className="size-4" />}
          title="Library defaults"
          hint="Used when a library view opens without an explicit choice"
        />
        <LibraryPreferences settings={me.settings} />
        <dl className="mt-4 border-t border-border pt-3">
          <DetailRow label="Trash retention">
            {me.settings.trashRetentionDays === 0
              ? 'No automatic expiry'
              : `${me.settings.trashRetentionDays} days`}
          </DetailRow>
        </dl>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          Retention is enforced when you open Trash: expired items are permanently removed from
          the provider then, while a setting of 0 keeps everything until you delete it.
        </p>
      </Card>

      <Card>
        <CardHeading
          icon={<CloudOff className="size-4" />}
          title="Offline and cache"
          hint="Metadata this device keeps, and the changes waiting to sync"
        />
        <OfflinePreferences settings={me.settings} />
      </Card>

      <Card>
        <CardHeading
          icon={<Tag className="size-4" />}
          title="Tags"
          hint="Labels that group files across folders"
        />
        <TagManager tags={tags.items} />
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
          title={
            setup.storage.provider === 'local' ? 'Storage connection' : 'Telegram connection'
          }
          hint={
            setup.storage.provider === 'local'
              ? 'Where this deployment writes ciphertext'
              : 'Encrypted payloads live in your own Saved Messages'
          }
          action={
            <Badge variant={storage.variant}>
              <StatusDot variant={storage.variant} />
              {storage.label}
            </Badge>
          }
        />
        <p className="text-sm leading-relaxed text-muted">{storage.detail}</p>
        {setup.storage.lastErrorCode ? (
          <dl className="mt-3">
            <DetailRow label="Last error">
              <code className="font-mono text-xs">{setup.storage.lastErrorCode}</code>
            </DetailRow>
          </dl>
        ) : null}
        <TelegramConnectionForm storage={setup.storage} />
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          The MTProto session is encrypted with a deployment key and stays server-side; it is
          never sent to the browser, logged or returned by an endpoint.
        </p>
      </Card>

      <VaultCard />

      <Card>
        <CardHeading
          icon={<Share2 className="size-4" />}
          title="Sharing"
          hint="Read-only, revocable links to one immutable version"
          action={
            <Link href="/shared" className="text-xs font-medium text-primary hover:underline">
              Manage links
            </Link>
          }
        />
        <dl>
          <DetailRow label="Active links">{activeShares}</DetailRow>
          <DetailRow label="Total links">{shares.items.length}</DetailRow>
          <DetailRow label="Key transfer">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
              URL fragment, never sent to the server
            </span>
          </DetailRow>
        </dl>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Each link carries its own wrapped data key, so a shared link cannot unlock the vault or
          any other file. Revoking stops future downloads through StackBase; copies a recipient
          already saved cannot be recalled.
        </p>
      </Card>
    </div>
  );
}
