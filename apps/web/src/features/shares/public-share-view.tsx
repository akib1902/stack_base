'use client';

import { useEffect, useState } from 'react';
import type { PublicShare } from '@stackbase/contracts';
import { Download, KeyRound, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormError } from '@/components/ui/Dialog';
import { sendJson, sendRaw } from '@/lib/api/browser';
import { CryptoError } from '@/lib/crypto/errors';
import { decryptSharedFile, readShareSecret } from '@/lib/crypto/share';
import { formatBytes, formatDateTime } from '@/lib/utils/format';
import { saveDecryptedBlob } from '@/lib/utils/save-file';

/**
 * Recipient view. The decryption secret is read from `location.hash` after
 * mount and never leaves the browser; the server only ever sees the path token.
 */
export function PublicShareView({
  token,
  initialView,
}: {
  token: string;
  initialView: PublicShare;
}) {
  const [view, setView] = useState(initialView);
  const [secret, setSecret] = useState<string | null | undefined>(undefined);
  const [percent, setPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSecret(readShareSecret(window.location.hash));
  }, []);

  const download = async (): Promise<void> => {
    if (!secret) return;
    setError(null);
    setSaved(false);
    setPercent(0);

    try {
      const response = await sendRaw(
        `/api/public/shares/${encodeURIComponent(token)}/download`,
      );
      if (!response.body) {
        throw new Error('The download stream is empty.');
      }

      const parts: Uint8Array[] = [];
      let received = 0;
      for await (const chunk of decryptSharedFile({ view, secret, body: response.body })) {
        parts.push(chunk);
        received += chunk.length;
        setPercent(
          view.manifest.plaintextSize === 0
            ? 100
            : Math.min(99, Math.round((received / view.manifest.plaintextSize) * 100)),
        );
      }

      saveDecryptedBlob(parts, view.fileName);
      setPercent(null);
      setSaved(true);

      // The API already counted this delivery; refresh the displayed remaining
      // count without making the download itself depend on this call.
      sendJson<PublicShare>(`/api/public/shares/${encodeURIComponent(token)}`, {
        method: 'GET',
      })
        .then(setView)
        .catch(() => undefined);
    } catch (failure) {
      setPercent(null);
      setError(
        failure instanceof CryptoError || failure instanceof Error
          ? failure.message
          : 'The file could not be downloaded.',
      );
    }
  };

  const active = percent !== null;

  return (
    <Card className="w-full max-w-lg">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Shared with StackBase
          </p>
          <h1 className="mt-1 break-all text-lg font-semibold leading-tight">
            {view.fileName}
          </h1>
          <p className="mt-1 text-xs text-muted">
            {formatBytes(view.sizeBytes)} · version {view.versionNumber} · read-only
          </p>
        </div>
      </div>

      <dl className="mt-4 space-y-2 rounded-xl border border-border bg-surface-raised/40 px-3 py-2.5 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Shared</dt>
          <dd className="font-medium">{formatDateTime(view.createdAt)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Expires</dt>
          <dd className="font-medium">
            {view.expiresAt ? formatDateTime(view.expiresAt) : 'Never'}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Downloads</dt>
          <dd className="font-medium">
            {view.downloadCount}
            {view.maxDownloads === null ? '' : ` of ${view.maxDownloads}`}
          </dd>
        </div>
      </dl>

      <div className="mt-4 space-y-3">
        {secret === undefined ? (
          <p className="text-xs text-muted">Reading the link key…</p>
        ) : secret === null ? (
          <div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <KeyRound className="size-3.5" aria-hidden="true" />
              The decryption key is missing
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              This link is incomplete. Ask the sender for the full URL, including everything
              after <code>#</code>. Without that fragment, nobody — including StackBase — can
              open the file.
            </p>
          </div>
        ) : (
          <>
            <Button
              type="button"
              className="w-full"
              disabled={active || view.remainingDownloads === 0}
              onClick={() => void download()}
            >
              <Download className="size-4" aria-hidden="true" />
              {active
                ? `Decrypting ${percent}%`
                : view.remainingDownloads === 0
                  ? 'Download limit reached'
                  : 'Download & decrypt'}
            </Button>

            <p className="text-[11px] leading-relaxed text-muted">
              The encrypted bytes are verified chunk by chunk and against the recorded SHA-256,
              then decrypted on this device. The key stays in the address-bar fragment and is
              never sent to the server.
            </p>
          </>
        )}

        <FormError message={error} />
        {saved ? (
          <p role="status" className="flex items-center gap-1.5 text-xs text-success">
            <Badge variant="success">Saved</Badge>
            Check your downloads folder.
          </p>
        ) : null}
      </div>
    </Card>
  );
}
