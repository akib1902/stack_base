'use client';

import { useState } from 'react';
import type { FileVersionListResponse, FileVersion } from '@stackbase/contracts';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { sendJson, sendRaw } from '@/lib/api/browser';
import { CryptoError } from '@/lib/crypto/errors';
import { decryptFile } from '@/lib/crypto/file-format';
import { useVault } from '@/features/encryption/vault-context';
import { useVaultGate } from '@/features/encryption/use-vault-gate';
import { saveDecryptedBlob } from '@/lib/utils/save-file';

/**
 * Downloads ciphertext through this app's route handler, decrypts it in the
 * browser and only then offers it as a file. The stream is verified chunk by
 * chunk (and against the recorded SHA-256) before anything is written to disk.
 */
export function DownloadFileButton({
  fileId,
  fileName,
  sizeBytes,
  variant = 'secondary',
  label = 'Download & decrypt',
}: {
  fileId: string;
  fileName: string;
  sizeBytes: number;
  variant?: 'primary' | 'secondary';
  label?: string;
}) {
  const vault = useVault();
  const gate = useVaultGate();
  const [percent, setPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async (): Promise<void> => {
    const vaultKey = vault.key;
    if (!vaultKey) return;
    setError(null);
    setPercent(0);

    try {
      const versions = await sendJson<FileVersionListResponse>(
        `/api/files/${encodeURIComponent(fileId)}/versions`,
        { method: 'GET' },
      );
      const version = latestAvailable(versions.items);
      if (!version) {
        throw new Error('This file has no stored version yet.');
      }

      await downloadFileVersion({
        fileId,
        version,
        fileName,
        vaultKey,
        onProgress: (percent) => setPercent(percent),
      });
      setPercent(null);
    } catch (failure) {
      setPercent(null);
      setError(
        failure instanceof CryptoError
          ? failure.message
          : failure instanceof Error
            ? failure.message
            : 'The file could not be downloaded.',
      );
    }
  };

  const active = percent !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={variant}
        size="sm"
        disabled={active}
        onClick={() => gate.requireUnlocked(() => void save())}
      >
        <Download className="size-3.5" aria-hidden="true" />
        {active ? `Decrypting ${percent}%` : label}
      </Button>
      <span className="text-[11px] text-muted">
        {(sizeBytes / (1024 * 1024)).toFixed(1)} MB decrypted locally
      </span>
      {error ? (
        <p role="alert" className="w-full text-[11px] leading-relaxed text-error">
          {error}
        </p>
      ) : null}
      {gate.dialog}
    </div>
  );
}

/**
 * Streams, verifies and decrypts one immutable version, then saves it. Shared by
 * the latest-version button and the version history so both paths verify the
 * same manifest and ciphertext hash.
 */
export async function downloadFileVersion({
  fileId,
  version,
  fileName,
  vaultKey,
  onProgress,
}: {
  fileId: string;
  version: FileVersion;
  fileName: string;
  vaultKey: Uint8Array;
  onProgress?: (percent: number) => void;
}): Promise<void> {
  const response = await sendRaw(
    `/api/files/${encodeURIComponent(fileId)}/versions/${encodeURIComponent(version.id)}/download`,
  );
  if (!response.body) {
    throw new Error('The download stream is empty.');
  }

  const parts: Uint8Array[] = [];
  let received = 0;
  for await (const chunk of decryptFile({
    manifest: version.manifest,
    vaultKey,
    body: response.body,
  })) {
    parts.push(chunk);
    received += chunk.length;
    onProgress?.(
      version.manifest.plaintextSize === 0
        ? 100
        : Math.min(99, Math.round((received / version.manifest.plaintextSize) * 100)),
    );
  }

  saveDecryptedBlob(parts, fileName);
}

/** Highest version number whose ciphertext is still stored. */
export function latestAvailable(versions: readonly FileVersion[]): FileVersion | undefined {
  return versions
    .filter((version) => version.storageStatus === 'available')
    .reduce<FileVersion | undefined>(
      (latest, version) =>
        latest === undefined || version.versionNumber > latest.versionNumber ? version : latest,
      undefined,
    );
}
