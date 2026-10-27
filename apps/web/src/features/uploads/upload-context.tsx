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
import { fingerprintSource } from '@/lib/crypto/file-format';
import { useVault } from '@/features/encryption/vault-context';
import {
  UploadAbortedError,
  createIdempotencyKey,
  retryDelayMs,
  runUpload,
  type UploadProgress,
} from './pipeline';
import { uploadJobTransport, uploadTransport } from './transport';

/**
 * Owns the upload queue. Jobs run one at a time so a batch of files cannot
 * saturate the connection (or the provider's rate limits), each one reports its
 * own progress, and a failure leaves the server-side job intact so "Retry"
 * resumes instead of starting over.
 *
 * The server is the durable store (A5.4): unfinished jobs are re-read from
 * `GET /api/v1/uploads` on mount. Those rows lost their `File` handle in the
 * refresh, so they come back as `needs_source_file` and the user reselects it;
 * the stored source fingerprint proves it is the same bytes before any chunk is
 * resent.
 */

export type UploadItemStatus =
  | 'queued'
  | 'encrypting'
  | 'transferring'
  | 'finalizing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused'
  | 'needs_source_file';

export interface UploadItem {
  id: string;
  name: string;
  sizeBytes: number;
  status: UploadItemStatus;
  /** 0–100. Approximate on purpose: the server confirms chunks, not bytes. */
  percent: number;
  detail: string;
  error: string | null;
  /** Server job backing this row; known after create, or from the restore. */
  uploadId: string | null;
  /** The local File is gone (refresh) — the user must pick it again. */
  needsSource: boolean;
  /** False for states the server refuses to retry (reconciliation). */
  retryable: boolean;
}

interface QueuedUpload {
  itemId: string;
  file: File | null;
  folderId: string | null;
  idempotencyKey: string;
  uploadId: string | null;
  /** Expected source fingerprint from the job; verified on reselection. */
  fingerprint: string | null;
  /** Automatic retries since the last success (A5.5 exponential backoff). */
  attempts: number;
}

export interface UploadContextValue {
  items: readonly UploadItem[];
  activeCount: number;
  enqueue(files: readonly File[], folderId: string | null): void;
  cancel(itemId: string): void;
  retry(itemId: string): void;
  /** Pause: aborts the transfer but keeps the server job and staged chunks. */
  pause(itemId: string): void;
  /** Resume a paused job; without a local File it asks for reselection. */
  resume(itemId: string): void;
  /** Re-pick the source file for an interrupted job (A5.4). */
  reselect(itemId: string, file: File): Promise<void>;
  dismiss(itemId: string): void;
  clearFinished(): void;
}

const UploadContext = createContext<UploadContextValue | null>(null);

/** Attempts before a transient failure is handed back to the user (A5.5). */
const MAX_AUTO_RETRIES = 3;

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

const messageOf = (failure: unknown): string => {
  if (failure instanceof CryptoError) return failure.message;
  if (isBrowserRequestError(failure)) return failure.message;
  if (failure instanceof TypeError) return 'The connection was interrupted.';
  if (failure instanceof Error) return failure.message;
  return 'The upload failed.';
};

/** Worth an automatic retry (A5.5): network drops, rate limits, server errors. */
const isTransient = (failure: unknown): boolean => {
  if (failure instanceof TypeError) return true;
  if (isBrowserRequestError(failure)) {
    return failure.status === 429 || failure.status >= 500;
  }
  return false;
};

export function UploadProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const vault = useVault();
  const [items, setItems] = useState<UploadItem[]>([]);

  const queue = useRef<QueuedUpload[]>([]);
  const running = useRef(false);
  const controllers = useRef(new Map<string, AbortController>());
  const specs = useRef(new Map<string, QueuedUpload>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
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
      if (!job.file) {
        updateItem(job.itemId, {
          status: 'needs_source_file',
          detail: 'Choose the original file to resume this upload.',
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
            onCreated: (uploadId) => {
              job.uploadId = uploadId;
              updateItem(job.itemId, { uploadId });
            },
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
          if (controller.signal.reason === 'pause') {
            const uploadId = job.uploadId;
            if (uploadId) {
              // Keep the job and every chunk that already arrived (A5.4).
              await uploadJobTransport
                .pause(uploadId)
                .catch(() => undefined);
            }
            updateItem(job.itemId, {
              status: 'paused',
              detail: 'Paused. Stored chunks are kept and will resume.',
              error: null,
            });
          } else {
            updateItem(job.itemId, {
              status: 'cancelled',
              detail: 'Cancelled. The staged ciphertext was removed.',
              error: null,
            });
            specs.current.delete(job.itemId);
          }
          return;
        }

        if (isTransient(failure) && job.attempts < MAX_AUTO_RETRIES) {
          job.attempts += 1;
          const delay = retryDelayMs(job.attempts);
          updateItem(job.itemId, {
            status: 'queued',
            detail: `Connection problem — retrying in ${Math.max(1, Math.round(delay / 1000))}s (attempt ${job.attempts} of ${MAX_AUTO_RETRIES})…`,
            error: null,
          });
          timers.current.set(
            job.itemId,
            setTimeout(() => {
              timers.current.delete(job.itemId);
              queue.current.push(job);
              void pump();
            }, delay),
          );
          return;
        }

        updateItem(job.itemId, {
          status: 'failed',
          error: messageOf(failure),
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
        uploadId: null,
        fingerprint: null,
        attempts: 0,
      }));

      setItems((current) => [
        ...current,
        ...created.map<UploadItem>((job) => ({
          id: job.itemId,
          name: job.file?.name ?? 'file',
          sizeBytes: job.file?.size ?? 0,
          status: 'queued',
          percent: 0,
          detail: 'Queued.',
          error: null,
          uploadId: null,
          needsSource: false,
          retryable: true,
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

  const dropTimer = useCallback((itemId: string) => {
    const timer = timers.current.get(itemId);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(itemId);
    }
  }, []);

  const cancel = useCallback(
    (itemId: string) => {
      dropTimer(itemId);
      const controller = controllers.current.get(itemId);
      if (controller) {
        controller.abort();
        return;
      }
      const spec = specs.current.get(itemId);
      // Not running: remove it from the pending queue and free any server job.
      queue.current = queue.current.filter((job) => job.itemId !== itemId);
      if (spec?.uploadId) {
        void uploadTransport.cancel(spec.uploadId).catch(() => undefined);
      }
      specs.current.delete(itemId);
      updateItem(itemId, {
        status: 'cancelled',
        detail: 'Cancelled.',
        error: null,
        needsSource: false,
      });
    },
    [dropTimer, updateItem],
  );

  const pause = useCallback(
    (itemId: string) => {
      dropTimer(itemId);
      const controller = controllers.current.get(itemId);
      if (controller) {
        // Signal carries the reason so the pipeline does not cancel the job.
        controller.abort('pause');
        return;
      }
      queue.current = queue.current.filter((job) => job.itemId !== itemId);
      const spec = specs.current.get(itemId);
      if (spec?.uploadId) {
        void uploadJobTransport.pause(spec.uploadId).catch(() => undefined);
      }
      updateItem(itemId, {
        status: 'paused',
        detail: 'Paused. Stored chunks are kept and will resume.',
        error: null,
      });
    },
    [dropTimer, updateItem],
  );

  const retry = useCallback(
    (itemId: string) => {
      dropTimer(itemId);
      const job = specs.current.get(itemId);
      if (!job) return;
      job.attempts = 0;
      if (!job.file) {
        updateItem(itemId, {
          status: 'needs_source_file',
          detail: 'Choose the original file to resume this upload.',
        });
        return;
      }
      if (job.uploadId) {
        // Best effort: flips failed/needs_source rows back to an open state.
        void uploadJobTransport.retry(job.uploadId).catch(() => undefined);
      }
      updateItem(itemId, { status: 'queued', error: null, detail: 'Queued again.' });
      queue.current.push(job);
      void pump();
    },
    [dropTimer, pump, updateItem],
  );

  const resume = useCallback(
    (itemId: string) => {
      const job = specs.current.get(itemId);
      if (!job) return;
      if (!job.file) {
        updateItem(itemId, {
          status: 'needs_source_file',
          detail: 'Choose the original file to resume this upload.',
        });
        return;
      }

      const start = (): void => {
        updateItem(itemId, { status: 'queued', detail: 'Resuming…', error: null });
        queue.current.push(job);
        void pump();
      };

      if (job.uploadId) {
        // Flip the server row back to an accepting state first; if that fails,
        // the job must not enter the queue, where its chunks would be rejected.
        void uploadJobTransport
          .resume(job.uploadId)
          .then(start)
          .catch(() =>
            updateItem(itemId, {
              status: 'failed',
              error: 'The server refused to resume this upload. Retry it from the queue.',
            }),
          );
        return;
      }
      start();
    },
    [pump, updateItem],
  );

  const reselect = useCallback(
    async (itemId: string, file: File) => {
      const job = specs.current.get(itemId);
      if (!job) return;

      let mismatch = false;
      if (job.fingerprint) {
        try {
          const actual = await fingerprintSource(file);
          mismatch = actual !== job.fingerprint;
        } catch {
          mismatch = false; // The server's comparison still guards the job.
        }
      }
      if (mismatch) {
        updateItem(itemId, {
          status: 'needs_source_file',
          error: 'That is a different file. Choose the original one to resume.',
          detail: 'Fingerprint does not match the interrupted upload.',
        });
        return;
      }

      job.file = file;
      job.attempts = 0;
      updateItem(itemId, {
        status: 'queued',
        error: null,
        needsSource: false,
        name: file.name,
        sizeBytes: file.size,
        detail: 'Fingerprint matched. Resuming…',
      });
      if (job.uploadId) {
        void uploadJobTransport.resume(job.uploadId).catch(() => undefined);
      }
      queue.current.push(job);
      void pump();
    },
    [pump, updateItem],
  );

  const dismiss = useCallback(
    (itemId: string) => {
      dropTimer(itemId);
      specs.current.delete(itemId);
      queue.current = queue.current.filter((job) => job.itemId !== itemId);
      setItems((current) => current.filter((item) => item.id !== itemId));
    },
    [dropTimer],
  );

  const clearFinished = useCallback(() => {
    setItems((current) => current.filter((item) => !isFinished(item.status)));
  }, []);

  // Queue restore (A5.4): every unfinished server job becomes a visible row
  // that waits for its source file, because a refresh cannot keep a File handle.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { items: jobs } = await uploadJobTransport.list();
        if (cancelled) return;
        const restored: UploadItem[] = [];
        for (const job of jobs) {
          if (specs.current.has(job.id)) continue;
          specs.current.set(job.id, {
            itemId: job.id,
            file: null,
            folderId: null,
            idempotencyKey: job.idempotencyKey,
            uploadId: job.id,
            fingerprint: job.sourceFingerprint,
            attempts: 0,
          });
          const percent =
            job.totalChunks > 0
              ? Math.min(99, Math.round((job.receivedChunks / job.totalChunks) * 100))
              : 0;
          const reconciling = job.status === 'reconciliation_required';
          const paused = job.status === 'paused';
          restored.push({
            id: job.id,
            name: job.fileName ?? 'Interrupted upload',
            sizeBytes: job.sourceSizeBytes,
            status: reconciling ? 'failed' : paused ? 'paused' : 'needs_source_file',
            percent,
            detail: reconciling
              ? 'Stopped inside storage verification.'
              : `${job.receivedChunks} of ${job.totalChunks} chunks already stored. Choose the file again to resume.`,
            error: reconciling
              ? 'This upload needs storage reconciliation before it can continue.'
              : null,
            uploadId: job.id,
            needsSource: !reconciling,
            retryable: false,
          });
        }
        if (restored.length > 0) {
          setItems((current) => [...restored, ...current]);
        }
      } catch {
        // Offline now: the rows stay on the server and appear on the next load.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<UploadContextValue>(
    () => ({
      items,
      activeCount: items.filter((item) => !isFinished(item.status)).length,
      enqueue,
      cancel,
      retry,
      pause,
      resume,
      reselect,
      dismiss,
      clearFinished,
    }),
    [cancel, clearFinished, dismiss, enqueue, items, pause, reselect, resume, retry],
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
