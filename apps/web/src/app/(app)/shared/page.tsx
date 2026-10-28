import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { AuditEvent, AuditListResponse, ShareListResponse } from '@stackbase/contracts';
import { Activity, Share2 } from 'lucide-react';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeading } from '@/components/ui/Card';
import { ShareList } from '@/features/shares/share-list';
import { UnauthenticatedError, apiFetch } from '@/lib/api/client';
import { formatRelativeDate } from '@/lib/utils/format';

export const metadata = { title: 'Shared' };

const EVENT_LABELS: Record<string, string> = {
  'file.trash': 'Moved a file to Trash',
  'folder.trash': 'Moved a folder to Trash',
  'file.restore': 'Restored a file from Trash',
  'folder.restore': 'Restored a folder from Trash',
  'file.purge': 'Permanently deleted a file',
  'folder.purge': 'Permanently deleted a folder',
  'trash.purge': 'Purged expired Trash entries',
  'version.restore': 'Restored an earlier version',
  'share.create': 'Created a share link',
  'share.revoke': 'Revoked a share link',
  'share.download': 'Share link downloaded',
};

function describeEvent(event: AuditEvent): string {
  if (event.eventType === 'share.download' && event.result === 'denied') {
    const reason = typeof event.metadata.reason === 'string' ? event.metadata.reason : null;
    return reason ? `Refused a share download (${reason.toLowerCase()})` : 'Refused a share download';
  }
  if (event.eventType === 'share.download') {
    const count = event.metadata.downloadCount;
    return typeof count === 'number'
      ? `Share link downloaded · count ${count}`
      : 'Share link downloaded';
  }
  return EVENT_LABELS[event.eventType] ?? event.eventType;
}

function resultVariant(event: AuditEvent): 'success' | 'danger' | 'warning' {
  if (event.result === 'denied') return 'warning';
  if (event.result === 'failure') return 'danger';
  return 'success';
}

export default async function SharedPage() {
  let shares: ShareListResponse;
  let audit: AuditListResponse;

  try {
    [shares, audit] = await Promise.all([
      apiFetch<ShareListResponse>('/api/v1/shares'),
      apiFetch<AuditListResponse>('/api/v1/audit?limit=20'),
    ]);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect('/sign-in');
    }
    throw error;
  }

  const active = shares.items.filter((share) => share.status === 'active').length;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Library
          </p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight sm:text-3xl">
            Shared
          </h1>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">
            Revocable links to single immutable versions, plus the owner-scoped trail of what
            happened to your files.
          </p>
        </div>
        <Badge variant="primary" className="self-start sm:self-auto">
          {active} active {active === 1 ? 'link' : 'links'}
        </Badge>
      </header>

      <Card>
        <CardHeading
          icon={<Share2 className="size-4" />}
          title="Share links"
          hint="Create one from a file’s details; each link pins the version it was made from"
        />
        {shares.items.length === 0 ? (
          <EmptyState
            icon={<Share2 className="size-4" aria-hidden="true" />}
            title="No share links yet"
            description="Open a file’s details and choose “Share link” to create a revocable, read-only link to that version."
            footer={
              <Link href="/files" className="text-xs font-medium text-primary hover:underline">
                Browse all files
              </Link>
            }
          />
        ) : (
          <ShareList shares={shares.items} />
        )}
      </Card>

      <Card>
        <CardHeading
          icon={<Activity className="size-4" />}
          title="Recent activity"
          hint="Append-only events scoped to your account; no keys, tokens or plaintext are recorded"
        />
        {audit.items.length === 0 ? (
          <p className="text-sm text-muted">Nothing recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {audit.items.map((event) => (
              <li key={event.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-xs font-medium">{describeEvent(event)}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {event.resourceType ?? 'account'}
                    {event.resourceId ? ` · ${event.resourceId.slice(0, 8)}` : ''} ·{' '}
                    {formatRelativeDate(event.createdAt)}
                  </p>
                </div>
                <Badge variant={resultVariant(event)}>{event.result}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
