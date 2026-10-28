'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Share, ShareStatus } from '@stackbase/contracts';
import { ShieldOff } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Dialog';
import { sendJson } from '@/lib/api/browser';
import { formatDateTime } from '@/lib/utils/format';

const STATUS_VARIANT: Record<ShareStatus, 'success' | 'muted' | 'warning' | 'danger'> = {
  active: 'success',
  expired: 'muted',
  revoked: 'danger',
  exhausted: 'warning',
};

/**
 * All links owned by the account. The raw link is deliberately absent: only its
 * token hash is stored, so management offers status and revocation, not a
 * recoverable URL (ADR-019).
 */
export function ShareList({ shares }: { shares: readonly Share[] }) {
  const router = useRouter();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const revoke = async (share: Share): Promise<void> => {
    setRevokingId(share.id);
    setError(null);
    try {
      await sendJson(`/api/shares/${encodeURIComponent(share.id)}/revoke`, { method: 'POST' });
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The link could not be revoked.');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <FormError message={error} />

      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {shares.map((share) => (
          <li
            key={share.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                <span className="truncate">{share.fileName}</span>
                <Badge variant={STATUS_VARIANT[share.status]}>{share.status}</Badge>
              </p>
              <p className="mt-0.5 text-[11px] text-muted">
                Version {share.versionNumber} · read-only ·{' '}
                {share.expiresAt ? `expires ${formatDateTime(share.expiresAt)}` : 'no expiry'} ·{' '}
                {share.downloadCount}
                {share.maxDownloads === null ? '' : `/${share.maxDownloads}`} downloads
              </p>
              <p className="mt-0.5 text-[11px] text-muted">
                Created {formatDateTime(share.createdAt)} · key travels in the link fragment,
                never to the server
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start text-error hover:bg-error/10 sm:self-auto"
              disabled={share.status === 'revoked' || revokingId === share.id}
              onClick={() => void revoke(share)}
            >
              <ShieldOff className="size-3.5" aria-hidden="true" />
              {revokingId === share.id ? 'Revoking…' : 'Revoke'}
            </Button>
          </li>
        ))}
      </ul>

      <p className="text-[11px] leading-relaxed text-muted">
        A link can only be copied when it is created. Revocation stops future downloads through
        StackBase; it cannot erase copies a recipient already saved.
      </p>
    </div>
  );
}
