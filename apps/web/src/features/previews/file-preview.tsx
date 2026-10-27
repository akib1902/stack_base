'use client';

import { useEffect, useState } from 'react';
import type { FileSummary, FileVersionListResponse } from '@stackbase/contracts';
import { FileQuestion, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { sendJson, sendRaw } from '@/lib/api/browser';
import { CryptoError } from '@/lib/crypto/errors';
import { decryptFile } from '@/lib/crypto/file-format';
import { useVault } from '@/features/encryption/vault-context';
import { useVaultGate } from '@/features/encryption/use-vault-gate';
import { MAX_PREVIEW_BYTES, previewKindFor } from './preview-kind';

/**
 * Image / video / audio / PDF preview (FR-08). The ciphertext travels through
 * this app's own route handler and is decrypted here, in the browser: the
 * server never sees plaintext and never serves preview bytes (A5.6). The
 * decrypted blob stays in an object URL that is revoked as soon as the preview
 * goes away, and nothing is ever executed — the PDF viewer gets a typed object
 * element with a plain fallback.
 */

type PreviewState =
  | { phase: 'locked' }
  | { phase: 'loading'; percent: number }
  | { phase: 'ready'; url: string }
  | { phase: 'error'; message: string };

const latestAvailable = (versions: FileVersionListResponse['items']) =>
  versions.reduce<FileVersionListResponse['items'][number] | null>(
    (latest, version) =>
      version.storageStatus === 'available' &&
      (latest === null || version.versionNumber > latest.versionNumber)
        ? version
        : latest,
    null,
  );

async function decryptToBlob(
  fileId: string,
  mimeType: string,
  vaultKey: Uint8Array,
  onProgress: (percent: number) => void,
): Promise<Blob> {
  const versions = await sendJson<FileVersionListResponse>(
    `/api/files/${encodeURIComponent(fileId)}/versions`,
    { method: 'GET' },
  );
  const version = latestAvailable(versions.items);
  if (!version) {
    throw new Error('This file has no stored version to preview yet.');
  }
  if (version.manifest.plaintextSize > MAX_PREVIEW_BYTES) {
    throw new Error(
      `This file is larger than ${Math.round(MAX_PREVIEW_BYTES / (1024 * 1024))} MB, so it is download-only.`,
    );
  }

  const response = await sendRaw(
    `/api/files/${encodeURIComponent(fileId)}/versions/${encodeURIComponent(version.id)}/download`,
  );
  if (!response.body) throw new Error('The download stream is empty.');

  const parts: Uint8Array[] = [];
  let received = 0;
  for await (const chunk of decryptFile({
    manifest: version.manifest,
    vaultKey,
    body: response.body,
  })) {
    parts.push(chunk);
    received += chunk.length;
    onProgress(
      version.manifest.plaintextSize === 0
        ? 100
        : Math.min(99, Math.round((received / version.manifest.plaintextSize) * 100)),
    );
  }

  return new Blob(parts as BlobPart[], { type: mimeType || 'application/octet-stream' });
}

export function FilePreview({ file }: { file: FileSummary }) {
  const vault = useVault();
  const gate = useVaultGate();
  const [state, setState] = useState<PreviewState>({ phase: 'locked' });

  const kind = previewKindFor(file.mimeType, file.name);

  // Revoke the object URL whenever the preview changes or unmounts, so large
  // decrypted blobs are released immediately (A5.6 step 7).
  useEffect(() => {
    if (state.phase === 'ready') {
      return () => URL.revokeObjectURL(state.url);
    }
    return undefined;
  }, [state]);

  useEffect(() => {
    const key = vault.key;
    if (!key) {
      setState({ phase: 'locked' });
      return;
    }
    let stale = false;
    setState({ phase: 'loading', percent: 0 });
    void (async () => {
      try {
        const blob = await decryptToBlob(file.id, file.mimeType, key, (percent) => {
          if (!stale) setState({ phase: 'loading', percent });
        });
        if (!stale) setState({ phase: 'ready', url: URL.createObjectURL(blob) });
      } catch (failure) {
        if (stale) return;
        setState({
          phase: 'error',
          message:
            failure instanceof CryptoError
              ? failure.message
              : failure instanceof Error
                ? failure.message
                : 'The preview could not be decrypted.',
        });
      }
    })();
    return () => {
      stale = true;
    };
  }, [file.id, vault.key]);

  if (file.contentStatus !== 'ready' || kind === 'none') {
    return (
      <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-border bg-surface-raised/40 px-4 py-6 text-center">
        <FileQuestion className="size-5 text-muted" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-muted">
          {file.contentStatus !== 'ready'
            ? 'No stored version yet — this file exists as metadata only.'
            : 'No inline preview for this file type. Decrypt and download it instead.'}
        </p>
      </div>
    );
  }

  if (state.phase === 'locked') {
    return (
      <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-border bg-surface-raised/40 px-4 py-6 text-center">
        <Lock className="size-5 text-muted" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-muted">
          The vault is locked, so nothing can be decrypted for preview.
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={() => gate.requireUnlocked(() => undefined)}>
          Unlock vault
        </Button>
        {gate.dialog}
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div
        role="alert"
        className="rounded-xl border border-error/25 bg-error/5 px-4 py-3 text-xs leading-relaxed text-error"
      >
        {state.message}
      </div>
    );
  }

  if (state.phase === 'loading') {
    return (
      <div
        role="status"
        className="rounded-xl border border-border bg-surface-raised/40 px-4 py-6 text-center text-xs text-muted"
      >
        Decrypting preview… {state.percent}%
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={state.percent}
          aria-label="Preview decryption"
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-raised"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${state.percent}%` }}
          />
        </div>
      </div>
    );
  }

  const url = state.url;
  const frame =
    'w-full rounded-xl border border-border bg-surface-raised/40 object-contain';

  return (
    <div className="space-y-1.5">
      {kind === 'image' ? (
        // eslint-disable-next-line @next/next/no-img-element -- decrypted blob, not a route
        <img src={url} alt={`Preview of ${file.name}`} className={`${frame} max-h-64`} />
      ) : null}
      {kind === 'video' ? (
        <video src={url} controls preload="metadata" className={`${frame} max-h-64`} />
      ) : null}
      {kind === 'audio' ? (
        <audio src={url} controls preload="metadata" className="w-full" />
      ) : null}
      {kind === 'pdf' ? (
        <object data={url} type="application/pdf" aria-label={`Preview of ${file.name}`} className={`${frame} h-80`}>
          <p className="p-3 text-xs text-muted">
            This browser cannot display PDFs inline. Download the file to open it.
          </p>
        </object>
      ) : null}
      <p className="text-[11px] text-muted">
        Decrypted in this tab from the stored ciphertext; the server never sees the plaintext.
      </p>
    </div>
  );
}