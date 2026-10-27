import { Type, type Static } from '@sinclair/typebox';
import { FileSummarySchema, NAME_MAX_LENGTH, NAME_PATTERN } from './library';
import { WrappedKeySchema, base64Exact, sha256Hex } from './encryption';

/**
 * Upload contracts for the pinned `stackbase/1` format: the encrypted manifest,
 * upload-job lifecycle and immutable file versions. The chunk arithmetic here is
 * the single source of truth for the client encryptor, the server validator and
 * the staging writer.
 */

export const FILE_ENCRYPTION_FORMAT_VERSION = 'stackbase/1';
export const FILE_MANIFEST_FORMAT = 'stackbase-file';
export const FILE_MANIFEST_VERSION = 1;
export const FILE_CIPHER = 'xchacha20poly1305-secretstream';

export const MIN_PLAINTEXT_CHUNK_SIZE = 64 * 1024;
export const MAX_PLAINTEXT_CHUNK_SIZE = 8 * 1024 * 1024;
export const DEFAULT_PLAINTEXT_CHUNK_SIZE = 1024 * 1024;

/** secretstream header (per stream) and per-chunk authentication overhead. */
export const SECRETSTREAM_HEADER_BYTES = 24;
export const SECRETSTREAM_ABYTES = 17;

export const MANIFEST_BASE64_HEADER_BYTES = SECRETSTREAM_HEADER_BYTES;

export const EncryptionManifestSchema = Type.Object(
  {
    format: Type.Literal(FILE_MANIFEST_FORMAT),
    version: Type.Literal(FILE_MANIFEST_VERSION),
    cipher: Type.Literal(FILE_CIPHER),
    chunking: Type.Object(
      {
        plaintextChunkSize: Type.Integer({
          minimum: MIN_PLAINTEXT_CHUNK_SIZE,
          maximum: MAX_PLAINTEXT_CHUNK_SIZE,
        }),
        totalChunks: Type.Integer({ minimum: 1 }),
      },
      { additionalProperties: false },
    ),
    plaintextSize: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
    ciphertextSize: Type.Integer({ minimum: SECRETSTREAM_HEADER_BYTES }),
    ciphertextHash: sha256Hex(),
    plaintextFingerprint: sha256Hex(),
    streamHeader: base64Exact(SECRETSTREAM_HEADER_BYTES),
    wrappedKey: WrappedKeySchema,
  },
  { additionalProperties: false },
);
export type EncryptionManifest = Static<typeof EncryptionManifestSchema>;

// ---------------------------------------------------------------------------
// Chunk arithmetic (shared by client and server)
// ---------------------------------------------------------------------------

export const totalChunksFor = (plaintextSize: number, chunkSize: number): number =>
  Math.max(1, Math.ceil(plaintextSize / chunkSize));

export const ciphertextSizeFor = (plaintextSize: number, chunkSize: number): number =>
  SECRETSTREAM_HEADER_BYTES +
  plaintextSize +
  totalChunksFor(plaintextSize, chunkSize) * SECRETSTREAM_ABYTES;

/** Ciphertext byte length of one chunk; only the final chunk may be short. */
export const ciphertextChunkLength = (
  manifest: Pick<EncryptionManifest, 'plaintextSize' | 'chunking'>,
  chunkNumber: number,
): number => {
  const { plaintextChunkSize, totalChunks } = manifest.chunking;
  const plaintextBytes =
    chunkNumber === totalChunks - 1
      ? manifest.plaintextSize - (totalChunks - 1) * plaintextChunkSize
      : plaintextChunkSize;
  return plaintextBytes + SECRETSTREAM_ABYTES;
};

/** Byte offset of one chunk inside the ciphertext stream (header included). */
export const ciphertextChunkOffset = (
  manifest: Pick<EncryptionManifest, 'chunking'>,
  chunkNumber: number,
): number =>
  SECRETSTREAM_HEADER_BYTES +
  chunkNumber * (manifest.chunking.plaintextChunkSize + SECRETSTREAM_ABYTES);

/**
 * Structural consistency beyond the schema: chunking, sizes and the stream
 * layout must agree exactly. Returns a problem description, or null when valid.
 */
export function checkManifestConsistency(
  manifest: EncryptionManifest,
  options: { maxPlaintextBytes: number },
): string | null {
  const { plaintextSize, chunking } = manifest;

  if (plaintextSize > options.maxPlaintextBytes) {
    return `plaintextSize exceeds the configured upload limit of ${options.maxPlaintextBytes} bytes`;
  }
  if (
    chunking.totalChunks !== totalChunksFor(plaintextSize, chunking.plaintextChunkSize)
  ) {
    return 'chunking.totalChunks does not match plaintextSize and plaintextChunkSize';
  }
  if (manifest.ciphertextSize !== ciphertextSizeFor(plaintextSize, chunking.plaintextChunkSize)) {
    return 'ciphertextSize does not match the pinned stream layout';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Upload jobs
// ---------------------------------------------------------------------------

export const UPLOAD_JOB_STATUSES = [
  'queued',
  'preparing',
  'encrypting',
  'transferring',
  'finalizing',
  'paused',
  'retrying',
  'failed',
  'needs_source_file',
  'reconciliation_required',
  'completed',
  'cancelled',
] as const;

export const UploadJobStatusSchema = Type.Union([
  Type.Literal('queued'),
  Type.Literal('preparing'),
  Type.Literal('encrypting'),
  Type.Literal('transferring'),
  Type.Literal('finalizing'),
  Type.Literal('paused'),
  Type.Literal('retrying'),
  Type.Literal('failed'),
  Type.Literal('needs_source_file'),
  Type.Literal('reconciliation_required'),
  Type.Literal('completed'),
  Type.Literal('cancelled'),
]);
export type UploadJobStatus = Static<typeof UploadJobStatusSchema>;

export const UploadJobSchema = Type.Object({
  id: Type.String(),
  fileId: Type.Union([Type.String(), Type.Null()]),
  status: UploadJobStatusSchema,
  sourceSizeBytes: Type.Integer({ minimum: 0 }),
  encryptedSizeBytes: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  chunkSizeBytes: Type.Integer({ minimum: 1 }),
  totalChunks: Type.Integer({ minimum: 1 }),
  receivedChunks: Type.Integer({ minimum: 0 }),
  /** Received chunk numbers so a client can resume without guessing. */
  receivedChunkNumbers: Type.Array(Type.Integer({ minimum: 0 })),
  retryCount: Type.Integer({ minimum: 0 }),
  lastErrorCode: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  completedAt: Type.Union([Type.String(), Type.Null()]),
  cancelledAt: Type.Union([Type.String(), Type.Null()]),
});
export type UploadJob = Static<typeof UploadJobSchema>;

/** Header carrying the base64-free lowercase hex SHA-256 of the chunk body. */
export const UPLOAD_CHUNK_CHECKSUM_HEADER = 'x-chunk-checksum';
export const UPLOAD_CHUNK_CONTENT_TYPE = 'application/octet-stream';

export const FileVersionSchema = Type.Object({
  id: Type.String(),
  fileId: Type.String(),
  versionNumber: Type.Integer({ minimum: 1 }),
  /** Plaintext size of this version. */
  sizeBytes: Type.Integer({ minimum: 0 }),
  ciphertextSizeBytes: Type.Integer({ minimum: SECRETSTREAM_HEADER_BYTES }),
  ciphertextHash: sha256Hex(),
  encryptionFormatVersion: Type.String(),
  manifest: EncryptionManifestSchema,
  storageStatus: Type.Union([
    Type.Literal('pending'),
    Type.Literal('available'),
    Type.Literal('missing'),
    Type.Literal('deleted'),
    Type.Literal('reconciliation_required'),
  ]),
  createdAt: Type.String(),
});
export type FileVersion = Static<typeof FileVersionSchema>;

export const FileVersionListResponseSchema = Type.Object({
  items: Type.Array(FileVersionSchema),
});
export type FileVersionListResponse = Static<typeof FileVersionListResponseSchema>;

export const CreateUploadRequestSchema = Type.Object(
  {
    /** Unique per owner; replaying the same upload returns the same job (A5.3). */
    idempotencyKey: Type.String({ minLength: 8, maxLength: 200 }),
    name: Type.String({ minLength: 1, maxLength: NAME_MAX_LENGTH, pattern: NAME_PATTERN }),
    mimeType: Type.String({ minLength: 1, maxLength: 255 }),
    folderId: Type.Optional(Type.Union([Type.String({ maxLength: 36 }), Type.Null()])),
    manifest: EncryptionManifestSchema,
  },
  { additionalProperties: false },
);
export type CreateUploadRequest = Static<typeof CreateUploadRequestSchema>;

export const CreateUploadResponseSchema = Type.Object({
  upload: UploadJobSchema,
  file: FileSummarySchema,
});
export type CreateUploadResponse = Static<typeof CreateUploadResponseSchema>;

export const UploadChunkResponseSchema = Type.Object({
  upload: UploadJobSchema,
});
export type UploadChunkResponse = Static<typeof UploadChunkResponseSchema>;

export const FinalizeUploadResponseSchema = Type.Object({
  upload: UploadJobSchema,
  file: FileSummarySchema,
  version: FileVersionSchema,
});
export type FinalizeUploadResponse = Static<typeof FinalizeUploadResponseSchema>;

export const CancelUploadResponseSchema = Type.Object({
  upload: UploadJobSchema,
});
export type CancelUploadResponse = Static<typeof CancelUploadResponseSchema>;
