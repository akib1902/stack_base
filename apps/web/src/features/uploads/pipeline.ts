import type {
  CancelUploadResponse,
  CreateUploadRequest,
  CreateUploadResponse,
  FileSummary,
  FileVersion,
  FileVersionListResponse,
  FinalizeUploadRequest,
  FinalizeUploadResponse,
  UploadChunkResponse,
} from '@stackbase/contracts';
import { fingerprintSource, startEncryption, type ByteSource } from '@/lib/crypto/file-format';

/**
 * One upload from end to end: generate the data key and stream header, create
 * the job, encrypt and send each chunk (skipping the ones a previous attempt
 * already delivered), then declare the two hashes at finalize. Everything that
 * touches encryption lives in the crypto modules; everything that touches HTTP
 * lives in the transport, so this file is testable without a browser.
 */

export type UploadPhase = 'encrypting' | 'transferring' | 'finalizing';

export interface UploadProgress {
  phase: UploadPhase;
  /** Chunks the server has confirmed, including ones from an earlier attempt. */
  chunksSent: number;
  totalChunks: number;
  ciphertextBytesSent: number;
  ciphertextSizeBytes: number;
  sourceBytes: number;
}

export interface UploadTransport {
  create(body: CreateUploadRequest): Promise<CreateUploadResponse>;
  putChunk(
    uploadId: string,
    chunkNumber: number,
    data: Uint8Array,
    checksum: string,
  ): Promise<UploadChunkResponse>;
  finalize(uploadId: string, body: FinalizeUploadRequest): Promise<FinalizeUploadResponse>;
  cancel(uploadId: string): Promise<CancelUploadResponse>;
  listVersions(fileId: string): Promise<FileVersionListResponse>;
}

export interface UploadJobInput {
  source: ByteSource;
  vaultKey: Uint8Array;
  name: string;
  mimeType: string;
  folderId: string | null;
  /** Stable per file, so retrying reuses the same job instead of duplicating it. */
  idempotencyKey: string;
  chunkSize?: number;
}

export interface UploadOutcome {
  file: FileSummary;
  version: FileVersion;
}

export interface UploadHooks {
  onProgress?: (progress: UploadProgress) => void;
  /** Called once the job exists server-side, so the UI can act on its id. */
  onCreated?: (uploadId: string) => void;
  signal?: AbortSignal;
}

/** Thrown when the caller stopped the upload; the job is cancelled server-side. */
export class UploadAbortedError extends Error {
  constructor() {
    super('Upload cancelled.');
    this.name = 'UploadAbortedError';
  }
}

const latestVersionOf = (versions: readonly FileVersion[]): FileVersion | undefined =>
  versions.reduce<FileVersion | undefined>(
    (latest, version) =>
      latest === undefined || version.versionNumber >= latest.versionNumber ? version : latest,
    undefined,
  );

export async function runUpload(
  input: UploadJobInput,
  transport: UploadTransport,
  hooks: UploadHooks = {},
): Promise<UploadOutcome> {
  const { signal } = hooks;
  const abortIfNeeded = (): void => {
    if (signal?.aborted) throw new UploadAbortedError();
  };

  const session = await startEncryption(input.source, {
    vaultKey: input.vaultKey,
    ...(input.chunkSize === undefined ? {} : { chunkSize: input.chunkSize }),
  });

  hooks.onProgress?.({
    phase: 'encrypting',
    chunksSent: 0,
    totalChunks: session.totalChunks,
    ciphertextBytesSent: 0,
    ciphertextSizeBytes: session.manifest.ciphertextSize,
    sourceBytes: session.manifest.plaintextSize,
  });

  abortIfNeeded();
  // Content fingerprint of the source, stored on the job so a reselected file
  // can be compared before it is allowed onto this job (A5.4).
  const sourceFingerprint = await fingerprintSource(input.source);
  const created = await transport.create({
    idempotencyKey: input.idempotencyKey,
    name: input.name,
    mimeType: input.mimeType,
    folderId: input.folderId,
    manifest: session.manifest,
    sourceFingerprint,
  });

  // Replaying an idempotency key can hit a job that already finished.
  if (created.upload.status === 'completed') {
    const versions = await transport.listVersions(created.file.id);
    const version = latestVersionOf(versions.items);
    if (!version) {
      throw new Error('The upload is already complete but its version is missing.');
    }
    return { file: created.file, version };
  }

  const uploadId = created.upload.id;
  const alreadyReceived = new Set(created.upload.receivedChunkNumbers);
  hooks.onCreated?.(uploadId);

  try {
    const iterator = session.encrypt();
    let step = await iterator.next();
    let chunksSent = alreadyReceived.size;
    let bytesSent = 0;

    while (!step.done) {
      abortIfNeeded();
      const chunk = step.value;
      if (alreadyReceived.has(chunk.chunkNumber)) {
        // A previous attempt already delivered it: count it so the progress
        // reported to the user reflects confirmed bytes, not just new ones.
        bytesSent += chunk.data.length;
        chunksSent = Math.max(chunksSent, alreadyReceived.size);
      } else {
        const response = await transport.putChunk(
          uploadId,
          chunk.chunkNumber,
          chunk.data,
          chunk.checksum,
        );
        chunksSent = response.upload.receivedChunks;
        bytesSent += chunk.data.length;
      }
      hooks.onProgress?.({
        phase: 'transferring',
        chunksSent,
        totalChunks: session.totalChunks,
        ciphertextBytesSent: bytesSent,
        ciphertextSizeBytes: session.manifest.ciphertextSize,
        sourceBytes: session.manifest.plaintextSize,
      });
      step = await iterator.next();
    }

    const hashes = step.value;
    abortIfNeeded();
    hooks.onProgress?.({
      phase: 'finalizing',
      chunksSent,
      totalChunks: session.totalChunks,
      ciphertextBytesSent: bytesSent,
      ciphertextSizeBytes: session.manifest.ciphertextSize,
      sourceBytes: session.manifest.plaintextSize,
    });

    const finalized = await transport.finalize(uploadId, hashes);
    return { file: finalized.file, version: finalized.version };
  } catch (error) {
    if (error instanceof UploadAbortedError) {
      // Best effort: a cancelled job must not keep staging bytes around —
      // unless the abort was a pause, which must leave the job intact (A5.4).
      if (signal?.reason !== 'pause') {
        await transport.cancel(uploadId).catch(() => undefined);
      }
    }
    throw error;
  }
}

/** Idempotency key for a file selection: stable for retries, unique per attempt. */
export function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Exponential backoff with jitter for transient upload failures (A5.5):
 * 500 ms doubling to a ceiling of 8 seconds, spread by ±30 % so a batch of
 * interrupted uploads does not retry in lockstep.
 */
export function retryDelayMs(attempt: number): number {
  const base = Math.min(8000, 500 * 2 ** Math.max(0, attempt - 1));
  return Math.round(base * (0.7 + Math.random() * 0.6));
}
