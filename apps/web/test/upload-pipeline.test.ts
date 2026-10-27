import { createHash } from 'node:crypto';
import type {
  CreateUploadRequest,
  CreateUploadResponse,
  FileSummary,
  FileVersion,
  FinalizeUploadRequest,
  FinalizeUploadResponse,
  UploadChunkResponse,
  UploadJob,
} from '@stackbase/contracts';
import { ciphertextChunkLength, totalChunksFor } from '@stackbase/contracts';
import { describe, expect, it } from 'vitest';
import { byteSourceFromBytes } from '../src/lib/crypto/file-format';
import { toHex } from '../src/lib/crypto/encoding';
import { VAULT_VECTOR } from '../src/lib/crypto/test-vectors';
import {
  UploadAbortedError,
  createIdempotencyKey,
  retryDelayMs,
  runUpload,
  type UploadProgress,
  type UploadTransport,
} from '../src/features/uploads/pipeline';

const CHUNK_SIZE = 64 * 1024;
const PLAINTEXT_SIZE = 150_000;
const TOTAL_CHUNKS = totalChunksFor(PLAINTEXT_SIZE, CHUNK_SIZE);

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

const hexBytes = (hex: string): Uint8Array => {
  const out = new Uint8Array(hex.length / 2);
  for (let index = 0; index < out.length; index += 1) {
    out[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
};

const plaintext = Uint8Array.from({ length: PLAINTEXT_SIZE }, (_, index) => (index * 5 + 11) % 256);
const VAULT_KEY = hexBytes(VAULT_VECTOR.vaultKeyHex);

const job = (overrides: Partial<UploadJob> = {}): UploadJob => ({
  id: 'upload-1',
  fileId: 'file-1',
  idempotencyKey: 'test-key-0001',
  fileName: 'report.bin',
  sourceFingerprint: null,
  status: 'transferring',
  sourceSizeBytes: PLAINTEXT_SIZE,
  encryptedSizeBytes: null,
  chunkSizeBytes: CHUNK_SIZE,
  totalChunks: TOTAL_CHUNKS,
  receivedChunks: 0,
  receivedChunkNumbers: [],
  retryCount: 0,
  lastErrorCode: null,
  createdAt: '2026-10-27T00:00:00.000Z',
  updatedAt: '2026-10-27T00:00:00.000Z',
  completedAt: null,
  cancelledAt: null,
  ...overrides,
});

const fileSummary = (): FileSummary =>
  ({
    id: 'file-1',
    folderId: null,
    folderName: null,
    name: 'report.bin',
    extension: 'bin',
    mimeType: 'application/octet-stream',
    category: 'other',
    sizeBytes: PLAINTEXT_SIZE,
    description: null,
    contentStatus: 'pending',
    versionNumber: 1,
    favorite: false,
    storageProvider: 'local',
    storageStatus: 'pending',
    tags: [],
    createdAt: '2026-10-27T00:00:00.000Z',
    updatedAt: '2026-10-27T00:00:00.000Z',
    deletedAt: null,
  }) as unknown as FileSummary;

const fileVersion = (versionNumber = 1): FileVersion =>
  ({
    id: 'version-1',
    fileId: 'file-1',
    versionNumber,
    sizeBytes: PLAINTEXT_SIZE,
    ciphertextSizeBytes: PLAINTEXT_SIZE,
    ciphertextHash: 'a'.repeat(64),
    encryptionFormatVersion: 'stackbase/1',
    manifest: {},
    storageStatus: 'available',
    createdAt: '2026-10-27T00:00:00.000Z',
  }) as unknown as FileVersion;

interface Recorded {
  create: CreateUploadRequest[];
  chunks: Array<{ chunkNumber: number; data: Uint8Array; checksum: string }>;
  finalize: FinalizeUploadRequest[];
  cancels: string[];
  listVersions: string[];
}

function fakeTransport(
  options: {
    receivedChunks?: number[];
    status?: UploadJob['status'];
    failOnChunk?: number;
    /** Runs inside putChunk, before the server sees the chunk. */
    beforeChunk?: (chunkNumber: number) => void;
  } = {},
): { transport: UploadTransport; recorded: Recorded; ciphertextBytes: () => number } {
  const recorded: Recorded = {
    create: [],
    chunks: [],
    finalize: [],
    cancels: [],
    listVersions: [],
  };

  return {
    recorded,
    ciphertextBytes: () =>
      recorded.chunks.reduce((total, chunk) => total + chunk.data.length, 0),
    transport: {
      async create(body) {
        recorded.create.push(body);
        return {
          upload: job({
            status: options.status ?? 'transferring',
            receivedChunkNumbers: options.receivedChunks ?? [],
            receivedChunks: (options.receivedChunks ?? []).length,
          }),
          file: fileSummary(),
        } satisfies CreateUploadResponse;
      },

      async putChunk(_uploadId, chunkNumber, data, checksum) {
        options.beforeChunk?.(chunkNumber);
        if (options.failOnChunk === chunkNumber) {
          throw new Error(`Chunk ${chunkNumber} rejected.`);
        }
        // The server checks the header against the body; so does this fake.
        expect(sha256(data)).toBe(checksum);
        expect(data.length).toBeGreaterThan(0);
        recorded.chunks.push({ chunkNumber, data, checksum });
        return {
          upload: job({
            receivedChunks: (options.receivedChunks ?? []).length + recorded.chunks.length,
            receivedChunkNumbers: [
              ...(options.receivedChunks ?? []),
              ...recorded.chunks.map((chunk) => chunk.chunkNumber),
            ],
          }),
        } satisfies UploadChunkResponse;
      },

      async finalize(_uploadId, body) {
        recorded.finalize.push(body);
        return {
          upload: job({ status: 'completed', receivedChunks: TOTAL_CHUNKS }),
          file: fileSummary(),
          version: fileVersion(),
        } satisfies FinalizeUploadResponse;
      },

      async cancel(uploadId) {
        recorded.cancels.push(uploadId);
        return { upload: job({ status: 'cancelled' }) };
      },

      async listVersions(fileId) {
        recorded.listVersions.push(fileId);
        return { items: [fileVersion(1), fileVersion(2)] };
      },
    },
  };
}

const run = (
  transport: UploadTransport,
  hooks: { onProgress?: (progress: UploadProgress) => void; signal?: AbortSignal } = {},
) =>
  runUpload(
    {
      source: byteSourceFromBytes(plaintext),
      vaultKey: VAULT_KEY,
      name: 'report.bin',
      mimeType: 'application/octet-stream',
      folderId: null,
      idempotencyKey: 'test-key-0001',
      chunkSize: CHUNK_SIZE,
    },
    transport,
    hooks,
  );

describe('upload pipeline', () => {
  it('creates, encrypts, streams and finalizes in order', async () => {
    const { transport, recorded } = fakeTransport();
    const outcome = await run(transport);

    expect(recorded.create).toHaveLength(1);
    const manifest = recorded.create[0]!.manifest;
    expect(manifest.chunking).toEqual({
      plaintextChunkSize: CHUNK_SIZE,
      totalChunks: TOTAL_CHUNKS,
    });
    expect(manifest.plaintextSize).toBe(PLAINTEXT_SIZE);
    // The job carries the source fingerprint so a reselected file can be
    // verified before it is allowed onto this job (A5.4).
    expect(recorded.create[0]!.sourceFingerprint).toBe(sha256(plaintext));
    expect(manifest.ciphertextSize).toBe(PLAINTEXT_SIZE + TOTAL_CHUNKS * 17 + 24);
    expect(Object.keys(manifest)).not.toContain('ciphertextHash');
    expect(Object.keys(manifest)).not.toContain('plaintextFingerprint');

    expect(recorded.chunks.map((chunk) => chunk.chunkNumber)).toEqual([0, 1, 2]);
    expect(recorded.chunks.map((chunk) => chunk.data.length)).toEqual([
      ciphertextChunkLength(manifest, 0),
      ciphertextChunkLength(manifest, 1),
      ciphertextChunkLength(manifest, 2),
    ]);

    // The declared hashes cover the whole stream, header first, in chunk order.
    const ciphertext = Buffer.concat([
      Buffer.from(manifest.streamHeader, 'base64'),
      ...recorded.chunks.map((chunk) => Buffer.from(chunk.data)),
    ]);
    expect(recorded.finalize).toHaveLength(1);
    expect(recorded.finalize[0]!.ciphertextHash).toBe(sha256(new Uint8Array(ciphertext)));
    expect(recorded.finalize[0]!.plaintextFingerprint).toBe(sha256(plaintext));

    expect(outcome.file.id).toBe('file-1');
    expect(outcome.version.versionNumber).toBe(1);
    expect(recorded.cancels).toEqual([]);
  });

  it('reports progress through every phase', async () => {
    const { transport } = fakeTransport();
    const progress: UploadProgress[] = [];
    await run(transport, { onProgress: (value) => progress.push(value) });

    expect(progress[0]?.phase).toBe('encrypting');
    expect(progress.some((value) => value.phase === 'finalizing')).toBe(true);
    const transfers = progress.filter((value) => value.phase === 'transferring');
    expect(transfers.map((value) => value.chunksSent)).toEqual([1, 2, 3]);
    expect(progress.every((value) => value.totalChunks === TOTAL_CHUNKS)).toBe(true);
    expect(transfers.at(-1)?.ciphertextBytesSent).toBeGreaterThan(PLAINTEXT_SIZE);
  });

  it('resumes a job whose earlier chunks already arrived', async () => {
    const { transport, recorded } = fakeTransport({ receivedChunks: [0] });
    const progress: UploadProgress[] = [];
    const outcome = await run(transport, { onProgress: (value) => progress.push(value) });

    expect(recorded.chunks.map((chunk) => chunk.chunkNumber)).toEqual([1, 2]);
    expect(recorded.finalize).toHaveLength(1);
    expect(outcome.file.id).toBe('file-1');
    // Confirmed bytes from the earlier attempt count towards the reported
    // progress, so the bar never jumps backwards on a retry (A5.4).
    const transfers = progress.filter((value) => value.phase === 'transferring');
    expect(transfers.map((value) => value.chunksSent)).toEqual([1, 2, 3]);
    expect(transfers[0]!.ciphertextBytesSent).toBeGreaterThan(0);
  });

  it('returns the finished version when the job already completed', async () => {
    const { transport, recorded } = fakeTransport({ status: 'completed' });
    const outcome = await run(transport);

    expect(recorded.chunks).toHaveLength(0);
    expect(recorded.finalize).toHaveLength(0);
    expect(recorded.listVersions).toEqual(['file-1']);
    expect(outcome.version.versionNumber).toBe(2);
  });

  it('cancels the job server-side when the caller aborts', async () => {
    const controller = new AbortController();
    // Abort while chunk 1 is being sent; chunk 2 must never be attempted.
    const { transport, recorded } = fakeTransport({
      beforeChunk: (chunkNumber) => {
        if (chunkNumber === 1) controller.abort();
      },
    });

    await expect(run(transport, { signal: controller.signal })).rejects.toBeInstanceOf(
      UploadAbortedError,
    );
    expect(recorded.chunks.map((chunk) => chunk.chunkNumber)).toEqual([0, 1]);
    expect(recorded.cancels).toEqual(['upload-1']);
    expect(recorded.finalize).toHaveLength(0);
  });

  it('keeps the job when the abort reason is a pause', async () => {
    const controller = new AbortController();
    const { transport, recorded } = fakeTransport({
      beforeChunk: (chunkNumber) => {
        if (chunkNumber === 1) controller.abort('pause');
      },
    });

    await expect(run(transport, { signal: controller.signal })).rejects.toBeInstanceOf(
      UploadAbortedError,
    );
    // Pausing must not cancel server-side: staged chunks stay for a resume.
    expect(recorded.cancels).toEqual([]);
    expect(recorded.finalize).toHaveLength(0);
  });

  it('surfaces a chunk failure with its own message and does not finalize', async () => {
    const { transport, recorded } = fakeTransport({ failOnChunk: 1 });
    await expect(run(transport)).rejects.toThrowError('Chunk 1 rejected.');
    expect(recorded.finalize).toHaveLength(0);
    expect(recorded.chunks.map((chunk) => chunk.chunkNumber)).toEqual([0]);
    // A failed transfer is not a cancellation: the staging data stays for a retry.
    expect(recorded.cancels).toEqual([]);
  });

  it('backs off exponentially with jitter for transient retries (A5.5)', () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const base = Math.min(8000, 500 * 2 ** (attempt - 1));
      const delay = retryDelayMs(attempt);
      expect(delay).toBeGreaterThanOrEqual(Math.round(base * 0.7));
      expect(delay).toBeLessThanOrEqual(Math.round(base * 1.3));
    }
    // The ceiling holds no matter how late the attempt is.
    expect(retryDelayMs(50)).toBeLessThanOrEqual(Math.round(8000 * 1.3));
    // Jitter: identical attempts must not produce identical delays.
    const samples = new Set([retryDelayMs(4), retryDelayMs(4), retryDelayMs(4), retryDelayMs(4)]);
    expect(samples.size).toBeGreaterThan(1);
  });

  it('builds unique idempotency keys', () => {
    const keys = new Set([createIdempotencyKey(), createIdempotencyKey(), createIdempotencyKey()]);
    expect(keys.size).toBe(3);
    for (const key of keys) {
      expect(key.length).toBeGreaterThanOrEqual(8);
      expect(key.length).toBeLessThanOrEqual(200);
    }
  });

  it('never uploads the plaintext', async () => {
    const { transport, recorded } = fakeTransport();
    await run(transport);
    const plaintextHex = toHex(plaintext);
    for (const chunk of recorded.chunks) {
      expect(toHex(chunk.data)).not.toBe(plaintextHex);
      expect(toHex(chunk.data).includes(plaintextHex.slice(0, 64))).toBe(false);
    }
  });
});
