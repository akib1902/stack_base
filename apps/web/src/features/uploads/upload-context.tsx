'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { isBrowserRequestError } from '@/lib/api/browser';
import { CryptoError } from '@/lib/crypto/errors';
import { useVault } from '@/features/encryption/vault-context';
import {
  UploadAbortedError,
  createIdempotencyKey,
  runUpload,
  type UploadProgress,
} from './pipeline';
import { uploadTransport } from './transport';

/**
 * Owns the upload queue. Jobs run one at a time so a batch of files cannot
 * saturate the connection (or the provider's rate limits), each one reports its
 * own progress, and a failure leaves the server-side job intact so "Retry"
 * resumes instead of starting over.
 */

export type UploadItemStatus =
  | 'queued'
  | 'encrypting'
  | 'transferring'
  | 'finalizing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface UploadItem {
  id: string;
  name: string;
  sizeBytes: number;
  status: UploadItemStatus;
  /** 0–100. Approximate on purpose: the server confirms chunks, not bytes. */
  percent: number;
  detail: string;
  error: string | null;
}

interface QueuedUpload {
  itemId: string;
  file: File;
  folderId: string | null;
  idempotencyKey: string;
}

export interface UploadContextValue {
  items: readonly UploadItem[];
  activeCount: number;
  enqueue(files: readonly File[], folderId: string | null): void;
  cancel(itemId: string): void;
  retry(itemId: string): void;
  dismiss(itemId: string): void;
  clearFinished(): void;
}

const UploadContext = createContext<UploadContextValue | null>(null);

const isFinished = (status: UploadItemStatus): boolean =>
  status === 'completed' || status === 'failed' || status === 'cancelled';

const percentOf = (progress: UploadProgress): number => {
  if (progress.phase === 'encrypting') return 2;
  if (progress.phase === 'finalizing') return 99;
  if (progress.ciphertextSizeBytes <= 0) return 50;
  return Math.min(
    98,
    Math.max(1, Math.round((progress.ciphertextBytesSent / progress.ciphertextSizeBytes) * 100)),
  );
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const detailOf = (progress: UploadProgress): string => {
  if (progress.phase === 'encrypting') return 'Encrypting on this device…';
  if (progress.phase === 'finalizing') return 'Verifying the assembled stream…';
  return `${progress.chunksSent} of ${progress.totalChunks} chunks · ${formatBytes(
    progress.ciphertextBytesSent,
  )} of ${formatBytes(progress.ciphertextSizeBytes)}`;
};

export function UploadProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const vault = useVault();
  const [items, setItems] = useState<UploadItem[]>([]);

  const queue = useRef<QueuedUpload[]>([]);
  const running = useRef(false);
  const controllers = useRef(new Map<string, AbortController>());
  const specs = useRef(new Map<string, QueuedUpload>());
  const vaultKey = useRef<Uint8Array | null>(vault.key);

  useEffect(() => {
    vaultKey.current = vault.key;
  }, [vault.key]);

  const updateItem = useCallback((itemId: string, patch: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    );
  }, []);

  const process = useCallback(
    async (job: QueuedUpload) => {
      const key = vaultKey.current;
      if (!key) {
        updateItem(job.itemId, {
          status: 'failed',
          error: 'Unlock the vault before uploading.',
          detail: 'Waiting for the vault key.',
        });
        return;
      }

      const controller = new AbortController();
      controllers.current.set(job.itemId, controller);
      updateItem(job.itemId, { status: 'encrypting', percent: 2, detail: 'Encrypting…' });

      try {
        await runUpload(
          {
            source: job.file,
            vaultKey: key,
            name: job.file.name,
            mimeType: job.file.type || 'application/octet-stream',
            folderId: job.folderId,
            idempotencyKey: job.idempotencyKey,
          },
          uploadTransport,
          {
            signal: controller.signal,
            onProgress: (progress) =>
              updateItem(job.itemId, {
                status: progress.phase,
                percent: percentOf(progress),
                detail: detailOf(progress),
              }),
          },
        );

        updateItem(job.itemId, {
          status: 'completed',
          percent: 100,
          detail: 'Encrypted and stored.',
          error: null,
        });
        specs.current.delete(job.itemId);
        // The library lists are server-rendered; pull them again once stored.
        router.refresh();
      } catch (failure) {
        if (failure instanceof UploadAbortedError) {
          updateItem(job.itemId, {
            status: 'cancelled',
            detail: 'Cancelled. The staged ciphertext was removed.',
            error: null,
          });
          specs.current.delete(job.itemId);
          return;
        }
        updateItem(job.itemId, {
          status: 'failed',
          error:
            failure instanceof CryptoError
              ? failure.message
              : isBrowserRequestError(failure)
                ? failure.message
                : failure instanceof Error
                  ? failure.message
                  : 'The upload failed.',
          detail: 'Not stored. Retry keeps the chunks that already arrived.',
        });
      } finally {
        controllers.current.delete(job.itemId);
      }
    },
    [router, updateItem],
  );

  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      for (;;) {
        const next = queue.current.shift();
        if (!next) break;
        await process(next);
      }
    } finally {
      running.current = false;
    }
  }, [process]);

  const enqueue = useCallback(
    (files: readonly File[], folderId: string | null) => {
      if (files.length === 0) return;
      const created: QueuedUpload[] = files.map((file) => ({
        itemId: createIdempotencyKey(),
        file,
        folderId,
        idempotencyKey: createIdempotencyKey(),
      }));

      setItems((current) => [
        ...current,
        ...created.map<UploadItem>((job) => ({
          id: job.itemId,
          name: job.file.name,
          sizeBytes: job.file.size,
          status: 'queued',
          percent: 0,
          detail: 'Queued.',
          error: null,
        })),
      ]);

      for (const job of created) {
        specs.current.set(job.itemId, job);
        queue.current.push(job);
      }
      void pump();
    },
    [pump],
  );

  const cancel = useCallback((itemId: string) => {
    controllers.current.get(itemId)?.abort();
  }, []);

  const retry = useCallback(
    (itemId: string) => {
      const job = specs.current.get(itemId);
      if (!job) return;
      updateItem(itemId, {
        status: 'queued',
        percent: 0,
        error: null,
        detail: 'Queued again.',
      });
      queue.current.push(job);
      void pump();
    },
    [pump, updateItem],
  );

  const dismiss = useCallback((itemId: string) => {
    specs.current.delete(itemId);
    setItems((current) => current.filter((item) => item.id !== itemId));
  }, []);

  const clearFinished = useCallback(() => {
    setItems((current) => current.filter((item) => !isFinished(item.status)));
  }, []);

  const value = useMemo<UploadContextValue>(
    () => ({
      items,
      activeCount: items.filter((item) => !isFinished(item.status)).length,
      enqueue,
      cancel,
      retry,
      dismiss,
      clearFinished,
    }),
    [cancel, clearFinished, dismiss, enqueue, items, retry],
  );

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
}

export function useUploads(): UploadContextValue {
  const value = useContext(UploadContext);
  if (!value) {
    throw new Error('useUploads must be used inside an UploadProvider.');
  }
  return value;
}
