'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  FileVersion,
  FileVersionListResponse,
  RestoreVersionResponse,
} from '@stackbase/contracts';
import { History, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Dialog';
import { useVault } from '@/features/encryption/vault-context';
import { useVaultGate } from '@/features/encryption/use-vault-gate';
import { downloadFileVersion, latestAvailable } from '@/features/uploads/download-button';
import { sendJson } from '@/lib/api/browser';
import { formatBytes, formatDateTime } from '@/lib/utils/format';

/**
 * Immutable version list (FR-11). Restoring appends a new version that points at
 * the old ciphertext, so history is never rewritten; downloading an old version
 * verifies that version's own manifest and hash before anything is saved.
 */
export function VersionHistory({
  fileId,
  fileName,
  onRestored,
}: {
  fileId: string;
  fileName: string;
  onRestored: () => void;
}) {
  const vault = useVault();
  const gate = useVaultGate();
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyVersionId, setBusyVersionId] = useState<string | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    sendJson<FileVersionListResponse>(`/api/files/${encodeURIComponent(fileId)}/versions`, {
      method: 'GET',
    })
      .then((data) => {
        if (cancelled) return;
        setVersions(data.items);
      })
      .catch((failure: unknown) => {
        if (cancelled) return;
        setError(failure instanceof Error ? failure.message : 'Version history could not load.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fileId, reloadToken]);

  const latest = latestAvailable(versions);

  const download = useCallback(
    (version: FileVersion): void => {
      const vaultKey = vault.key;
      if (!vaultKey) return;
      setError(null);
      setMessage(null);
      setBusyVersionId(version.id);
      setPercent(0);

      downloadFileVersion({
        fileId,
        version,
        fileName: `${fileName} (v${version.versionNumber})`,
        vaultKey,
        onProgress: setPercent,
      })
        .then(() => {
          setPercent(null);
          setBusyVersionId(null);
        })
        .catch((failure: unknown) => {
          setPercent(null);
          setBusyVersionId(null);
          setError(failure instanceof Error ? failure.message : 'That version could not be opened.');
        });
    },
    [fileId, fileName, vault.key],
  );

  const restore = async (version: FileVersion): Promise<void> => {
    setBusyVersionId(version.id);
    setError(null);
    setMessage(null);
    try {
      await sendJson<RestoreVersionResponse>(
        `/api/files/${encodeURIComponent(fileId)}/versions/${encodeURIComponent(version.id)}/restore`,
        { method: 'POST' },
      );
      setMessage(`Version ${version.versionNumber} restored as a new version.`);
      setReloadToken((value) => value + 1);
      onRestored();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The version could not be restored.');
    } finally {
      setBusyVersionId(null);
    }
  };

  return (
    <section aria-label="Version history" className="space-y-2">
      <div className="flex items-center gap-2">
        <History className="size-3.5 text-primary-ink" aria-hidden="true" />
        <h3 className="text-xs font-semibold">Version history</h3>
        <span className="text-[11px] text-muted">
          {versions.length} {versions.length === 1 ? 'version' : 'versions'}
        </span>
      </div>

      {loading ? <p className="text-[11px] text-muted">Loading versions…</p> : null}
      <FormError message={error} />
      {message ? (
        <p role="status" className="text-[11px] text-success">
          {message}
        </p>
      ) : null}

      {!loading && versions.length === 0 ? (
        <p className="text-[11px] text-muted">
          No stored version yet. Upload the file to create version 1.
        </p>
      ) : null}

      {versions.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface-raised/40">
          {[...versions]
            .sort((a, b) => b.versionNumber - a.versionNumber)
            .map((version) => {
              const isLatest = latest?.id === version.id;
              const available = version.storageStatus === 'available';
              const busy = busyVersionId === version.id;
              return (
                <li key={version.id} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
                      Version {version.versionNumber}
                      {isLatest ? <Badge variant="success">Current</Badge> : null}
                      {!available ? <Badge variant="warning">{version.storageStatus}</Badge> : null}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {formatDateTime(version.createdAt)} · {formatBytes(version.sizeBytes)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={!available || busy}
                      onClick={() => gate.requireUnlocked(() => download(version))}
                    >
                      {busy && percent !== null ? `Decrypting ${percent}%` : 'Download'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!available || busy || isLatest}
                      onClick={() => void restore(version)}
                    >
                      <RotateCcw className="size-3.5" aria-hidden="true" />
                      {busy && percent === null ? 'Working…' : 'Restore'}
                    </Button>
                  </div>
                </li>
              );
            })}
        </ul>
      ) : null}

      <p className="text-[11px] leading-relaxed text-muted">
        Restoring never deletes anything: it appends a new version pointing at the same
        authenticated ciphertext, so every earlier version stays downloadable.
      </p>
      {gate.dialog}
    </section>
  );
}
