'use client';

import { useEffect, useState } from 'react';
import type {
  CreateShareResponse,
  FileSummary,
  FileVersion,
  FileVersionListResponse,
  Share,
  ShareListResponse,
  ShareStatus,
} from '@stackbase/contracts';
import { Copy, Link2, Share2, ShieldOff } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog, FormError } from '@/components/ui/Dialog';
import { useVault } from '@/features/encryption/vault-context';
import { useVaultGate } from '@/features/encryption/use-vault-gate';
import { latestAvailable } from '@/features/uploads/download-button';
import { sendJson } from '@/lib/api/browser';
import { buildShareUrl, createShareCapability } from '@/lib/crypto/share';
import { formatDateTime } from '@/lib/utils/format';

const STATUS_VARIANT: Record<ShareStatus, 'success' | 'muted' | 'warning' | 'danger'> = {
  active: 'success',
  expired: 'muted',
  revoked: 'danger',
  exhausted: 'warning',
};

const EXPIRY_OPTIONS = [
  { value: '1', label: '1 day' },
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '0', label: 'Never expires' },
] as const;

/**
 * Share links pin one immutable version (SRS A7). The data key is re-wrapped
 * under a fresh secret that only enters the URL fragment on the client, so the
 * link can be created here without the API ever learning that secret.
 */
export function ShareDialog({
  open,
  file,
  onClose,
}: {
  open: boolean;
  file: FileSummary | null;
  onClose: () => void;
}) {
  const vault = useVault();
  const gate = useVaultGate();
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [expiryDays, setExpiryDays] = useState('7');
  const [limit, setLimit] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !file) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCreatedUrl(null);
    setCopied(false);

    Promise.all([
      sendJson<FileVersionListResponse>(`/api/files/${encodeURIComponent(file.id)}/versions`, {
        method: 'GET',
      }),
      sendJson<ShareListResponse>(`/api/shares?fileId=${encodeURIComponent(file.id)}`, {
        method: 'GET',
      }),
    ])
      .then(([versionData, shareData]) => {
        if (cancelled) return;
        const available = versionData.items.filter(
          (version) => version.storageStatus === 'available',
        );
        setVersions(available);
        setSelectedVersionId(latestAvailable(available)?.id ?? '');
        setShares(shareData.items);
      })
      .catch((failure: unknown) => {
        if (cancelled) return;
        setError(
          failure instanceof Error ? failure.message : 'Share links could not be loaded.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, file?.id]);

  if (!file) return null;

  const refreshShares = async (): Promise<void> => {
    const data = await sendJson<ShareListResponse>(
      `/api/shares?fileId=${encodeURIComponent(file.id)}`,
      { method: 'GET' },
    );
    setShares(data.items);
  };

  const create = async (): Promise<void> => {
    const vaultKey = vault.key;
    const version = versions.find((item) => item.id === selectedVersionId);
    if (!vaultKey || !version || creating) return;

    setCreating(true);
    setError(null);
    setCreatedUrl(null);
    setCopied(false);

    try {
      const capability = await createShareCapability(vaultKey, version.manifest);
      const days = Number(expiryDays);
      const response = await sendJson<CreateShareResponse>('/api/shares', {
        method: 'POST',
        body: {
          fileId: file.id,
          versionId: version.id,
          wrappedKey: capability.wrappedKey,
          expiresAt:
            days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null,
          maxDownloads: limit.trim() ? Number(limit) : null,
        },
      });

      setCreatedUrl(buildShareUrl(window.location.origin, response.token, capability.secret));
      await refreshShares();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The link could not be created.');
    } finally {
      setCreating(false);
    }
  };

  const copy = async (): Promise<void> => {
    if (!createdUrl) return;
    try {
      await navigator.clipboard.writeText(createdUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const revoke = async (share: Share): Promise<void> => {
    setRevokingId(share.id);
    setError(null);
    try {
      await sendJson(`/api/shares/${encodeURIComponent(share.id)}/revoke`, { method: 'POST' });
      await refreshShares();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The link could not be revoked.');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Share “${file.name}”`}
      description="Recipients decrypt in their browser. The server serves ciphertext it cannot open."
      className="w-[min(94vw,44rem)]"
      footer={
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-5">
        <FormError message={error} />

        {loading ? <p className="text-xs text-muted">Loading versions and links…</p> : null}

        {!loading && versions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-4 text-xs text-muted">
            This file has no stored ciphertext yet, so there is nothing to share. Finish an
            upload first.
          </p>
        ) : null}

        {versions.length > 0 ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-medium">Version</span>
                <select
                  value={selectedVersionId}
                  onChange={(event) => setSelectedVersionId(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
                >
                  {[...versions]
                    .sort((a, b) => b.versionNumber - a.versionNumber)
                    .map((version) => (
                      <option key={version.id} value={version.id}>
                        Version {version.versionNumber}
                        {latestAvailable(versions)?.id === version.id ? ' (current)' : ''}
                      </option>
                    ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium">Expires</span>
                <select
                  value={expiryDays}
                  onChange={(event) => setExpiryDays(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
                >
                  {EXPIRY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium">Download limit</span>
                <input
                  type="number"
                  min={1}
                  max={100_000}
                  value={limit}
                  onChange={(event) => setLimit(event.target.value)}
                  placeholder="Unlimited"
                  className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={creating || !selectedVersionId}
                onClick={() => gate.requireUnlocked(() => void create())}
              >
                <Link2 className="size-3.5" aria-hidden="true" />
                {creating ? 'Creating link…' : 'Create share link'}
              </Button>
              <p className="text-[11px] leading-relaxed text-muted">
                Read-only. Anyone with the link can download this one version.
              </p>
            </div>

            {createdUrl ? (
              <div className="rounded-xl border border-success/25 bg-success/5 p-3">
                <p className="text-xs font-medium">Copy this link now</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  The decryption key is only in the part after <code>#</code>, which never
                  reaches the server. It is not stored and cannot be shown again.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    readOnly
                    value={createdUrl}
                    onFocus={(event) => event.currentTarget.select()}
                    aria-label="Share link"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 font-mono text-[11px]"
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={() => void copy()}>
                    <Copy className="size-3.5" aria-hidden="true" />
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <section aria-label="Existing share links" className="space-y-2">
          <div className="flex items-center gap-2">
            <Share2 className="size-3.5 text-primary-ink" aria-hidden="true" />
            <h3 className="text-xs font-semibold">Links for this file</h3>
            <span className="text-[11px] text-muted">{shares.length}</span>
          </div>

          {shares.length === 0 ? (
            <p className="text-[11px] text-muted">No share links yet.</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {shares.map((share) => (
                <li
                  key={share.id}
                  className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
                      Version {share.versionNumber}
                      <Badge variant={STATUS_VARIANT[share.status]}>{share.status}</Badge>
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      Created {formatDateTime(share.createdAt)} ·{' '}
                      {share.expiresAt ? `expires ${formatDateTime(share.expiresAt)}` : 'no expiry'}{' '}
                      · {share.downloadCount}
                      {share.maxDownloads === null ? '' : `/${share.maxDownloads}`} downloads ·
                      key in link, no password
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-error hover:bg-error/10"
                    disabled={share.status === 'revoked' || revokingId === share.id}
                    onClick={() => void revoke(share)}
                  >
                    <ShieldOff className="size-3.5" aria-hidden="true" />
                    {revokingId === share.id ? 'Revoking…' : 'Revoke'}
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <p className="text-[11px] leading-relaxed text-muted">
            Revoking stops future downloads through StackBase. It cannot erase copies a
            recipient already saved, and the link itself cannot be reconstructed later.
          </p>
        </section>

        <p className="text-[11px] leading-relaxed text-muted">
          Share links reference one immutable version. The vault key never leaves this browser;
          each link carries a separate key wrapped for that version only.
        </p>
      </div>
      {gate.dialog}
    </Dialog>
  );
}
