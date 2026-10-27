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
import { startEncryption, type ByteSource } from '@/lib/crypto/file-format';

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
  const created = await transport.create({
    idempotencyKey: input.idempotencyKey,
    name: input.name,
    mimeType: input.mimeType,
    folderId: input.folderId,
    manifest: session.manifest,
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

  try {
    const iterator = session.encrypt();
    let step = await iterator.next();
    let chunksSent = alreadyReceived.size;
    let bytesSent = 0;

    while (!step.done) {
      abortIfNeeded();
      const chunk = step.value;
      if (!alreadyReceived.has(chunk.chunkNumber)) {
        const response = await transport.putChunk(
          uploadId,
          chunk.chunkNumber,
          chunk.data,
          chunk.checksum,
        );
        chunksSent = response.upload.receivedChunks;
        bytesSent += chunk.data.length;
        hooks.onProgress?.({
          phase: 'transferring',
          chunksSent,
          totalChunks: session.totalChunks,
          ciphertextBytesSent: bytesSent,
          ciphertextSizeBytes: session.manifest.ciphertextSize,
          sourceBytes: session.manifest.plaintextSize,
        });
      }
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
      // Best effort: a cancelled job must not keep staging bytes around.
      await transport.cancel(uploadId).catch(() => undefined);
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
