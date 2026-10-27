import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, open, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Value } from '@sinclair/typebox/value';
import {
  EncryptionManifestSchema,
  FILE_ENCRYPTION_FORMAT_VERSION,
  SECRETBOX_NONCE_BYTES,
  SECRETSTREAM_HEADER_BYTES,
  UploadManifestSchema,
  WRAPPED_KEY_BYTES,
  checkManifestConsistency,
  ciphertextChunkLength,
  ciphertextChunkOffset,
  type CancelUploadResponse,
  type CreateUploadRequest,
  type CreateUploadResponse,
  type EncryptionManifest,
  type FileVersion,
  type FileVersionListResponse,
  type FinalizeUploadRequest,
  type FinalizeUploadResponse,
  type StorageProvider,
  type UploadChunkResponse,
  type UploadJob,
  type UploadManifest,
} from '@stackbase/contracts';
import type { Config } from '../../config/env';
import type { Db, Queryable } from '../../database/db';
import { toCount, toIsoString } from '../../database/values';
import { ApiError } from '../../errors';
import { getFile, assertActiveFolder } from '../library/files-repository';
import {
  extensionOf,
  normalizeName,
  parseOptionalFolderId,
  parseUuid,
} from '../library/names';
import {
  openStorageProvider,
  resolveStorageConnection,
  type OpenStorageProvider,
  type StorageDeps,
} from '../../storage/registry';
import { TelegramError } from '../../storage/telegram/gateway';
import type { ProviderReference } from '../../storage/types';

/**
 * Upload pipeline (A5, milestone subset). The server never sees plaintext; it
 * receives ciphertext chunks, checks each one, stages them positionally, verifies
 * the full stream hash and only then asks the provider to store the object and
 * commits the immutable version. Anything that fails leaves no version behind.
 */

interface UploadRow {
  id: string;
  fileId: string | null;
  storageConnectionId: string;
  idempotencyKey: string;
  sourceFingerprint: string | null;
  /** Joined from the file row; null when the insert path has not read it back. */
  fileName: string | null;
  status: UploadJob['status'];
  sourceSizeBytes: unknown;
  encryptedSizeBytes: unknown;
  chunkSizeBytes: number;
  totalChunks: unknown;
  receivedChunks: number;
  retryCount: number;
  lastErrorCode: string | null;
  manifest: unknown;
  createdAt: unknown;
  updatedAt: unknown;
  completedAt: unknown;
  cancelledAt: unknown;
}

/**
 * One column list, two spellings: inserts return unqualified columns, reads
 * qualify them with `j.` because the query joins `files` for the name (both
 * tables carry `id`, `created_at` and `updated_at`).
 */
const jobColumns = (qualifier: '' | 'j.'): string => `
  ${qualifier}id,
  ${qualifier}file_id as "fileId",
  ${qualifier}storage_connection_id as "storageConnectionId",
  ${qualifier}idempotency_key as "idempotencyKey",
  ${qualifier}source_fingerprint as "sourceFingerprint",
  ${qualifier}status,
  ${qualifier}source_size_bytes as "sourceSizeBytes",
  ${qualifier}encrypted_size_bytes as "encryptedSizeBytes",
  ${qualifier}chunk_size_bytes as "chunkSizeBytes",
  ${qualifier}total_chunks as "totalChunks",
  ${qualifier}received_chunks as "receivedChunks",
  ${qualifier}retry_count as "retryCount",
  ${qualifier}last_error_code as "lastErrorCode",
  ${qualifier}manifest,
  ${qualifier}created_at as "createdAt",
  ${qualifier}updated_at as "updatedAt",
  ${qualifier}completed_at as "completedAt",
  ${qualifier}cancelled_at as "cancelledAt"
`;

const JOB_COLUMNS = jobColumns('');

const uploadNotFound = (): ApiError =>
  new ApiError('UPLOAD_NOT_FOUND', 404, 'That upload does not exist.');

/** Canonical base64 of an exact byte length; anything else is rejected. */
function requireBase64(value: string, expectedBytes: number, field: string): Buffer {
  const buffer = Buffer.from(value, 'base64');
  if (buffer.length !== expectedBytes || buffer.toString('base64') !== value) {
    throw new ApiError(
      'VALIDATION_ERROR',
      400,
      `${field} must be canonical base64 encoding exactly ${expectedBytes} bytes.`,
    );
  }
  return buffer;
}

function parseManifest(value: unknown): EncryptionManifest {
  if (!Value.Check(EncryptionManifestSchema, value)) {
    throw new ApiError(
      'STORAGE_RECONCILIATION_REQUIRED',
      409,
      'A stored manifest is invalid; reconciliation is required before it can be used.',
    );
  }
  return value as EncryptionManifest;
}

function parseUploadManifest(value: unknown): UploadManifest {
  if (!Value.Check(UploadManifestSchema, value)) {
    throw new ApiError(
      'STORAGE_RECONCILIATION_REQUIRED',
      409,
      'This upload job carries an invalid manifest; reconciliation is required.',
    );
  }
  return value as UploadManifest;
}

function mapJob(row: UploadRow, receivedChunkNumbers: number[]): UploadJob {
  return {
    id: row.id,
    fileId: row.fileId,
    idempotencyKey: row.idempotencyKey,
    fileName: row.fileName,
    sourceFingerprint: row.sourceFingerprint,
    status: row.status,
    sourceSizeBytes: toCount(row.sourceSizeBytes),
    encryptedSizeBytes:
      row.encryptedSizeBytes === null || row.encryptedSizeBytes === undefined
        ? null
        : toCount(row.encryptedSizeBytes),
    chunkSizeBytes: row.chunkSizeBytes,
    totalChunks: Math.max(1, toCount(row.totalChunks)),
    receivedChunks: toCount(row.receivedChunks),
    receivedChunkNumbers,
    retryCount: toCount(row.retryCount),
    lastErrorCode: row.lastErrorCode,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
    completedAt: row.completedAt ? toIsoString(row.completedAt) : null,
    cancelledAt: row.cancelledAt ? toIsoString(row.cancelledAt) : null,
  };
}

/** Reads join the file name so a restored queue can label its rows itself. */
const JOB_READ = `
  select ${jobColumns('j.')}, f.name as "fileName"
    from public.upload_jobs j
    left join public.files f on f.id = j.file_id and f.user_id = j.user_id
   where j.user_id = $1
`;

async function loadJob(db: Db | Queryable, userId: string, uploadId: string): Promise<UploadRow | null> {
  const { rows } = await db.query<UploadRow>(`${JOB_READ} and j.id = $2`, [userId, uploadId]);
  return rows[0] ?? null;
}

async function loadJobByKey(
  db: Db | Queryable,
  userId: string,
  idempotencyKey: string,
): Promise<UploadRow | null> {
  const { rows } = await db.query<UploadRow>(`${JOB_READ} and j.idempotency_key = $2`, [
    userId,
    idempotencyKey,
  ]);
  return rows[0] ?? null;
}

async function stagedChunkNumbers(db: Db | Queryable, uploadId: string): Promise<number[]> {
  const { rows } = await db.query<{ chunkNumber: number }>(
    `select chunk_number as "chunkNumber" from public.upload_chunks
      where upload_job_id = $1 and chunk_state in ('staged', 'received')
      order by chunk_number`,
    [uploadId],
  );
  return rows.map((row) => toCount(row.chunkNumber));
}

// ---------------------------------------------------------------------------
// Staging (ADR-017): one positional file per job, ciphertext only
// ---------------------------------------------------------------------------

const stagingFilePath = (config: Config, userId: string, jobId: string): string =>
  path.join(config.storage.stagingDir, userId, `${jobId}.part`);

async function writeStagingChunk(
  filePath: string,
  offset: number,
  body: Buffer,
): Promise<void> {
  const handle = await open(filePath, 'r+');
  try {
    await handle.write(body, 0, body.length, offset);
  } finally {
    await handle.close();
  }
}

async function hashFile(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath, { highWaterMark: 1024 * 1024 });
  for await (const chunk of stream) {
    hash.update(chunk as Buffer);
  }
  return hash.digest('hex');
}

async function removeStaging(config: Config, userId: string, jobId: string): Promise<void> {
  await rm(stagingFilePath(config, userId, jobId), { force: true }).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Job state helpers
// ---------------------------------------------------------------------------

async function markJobFailed(
  db: Db,
  userId: string,
  uploadId: string,
  errorCode: string,
): Promise<void> {
  const status = errorCode === 'STORAGE_RECONCILIATION_REQUIRED' ? 'reconciliation_required' : 'failed';
  await db
    .query(
      `update public.upload_jobs
         set status = $3, last_error_code = $4
       where user_id = $1 and id = $2`,
      [userId, uploadId, status, errorCode],
    )
    .catch(() => undefined);
}

interface StoredObjectInput {
  userId: string;
  connectionId: string;
  provider: StorageProvider;
  reference: ProviderReference;
  telegram?: {
    chatReference: string;
    messageReference: string;
    mediaReference: ProviderReference | null;
  };
  remoteSizeBytes: number | null;
  ciphertextHash: string;
}

async function insertStorageObject(db: Db, input: StoredObjectInput): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.storage_objects
       (user_id, storage_connection_id, provider, telegram_chat_reference,
        telegram_message_reference, telegram_media_reference, remote_size_bytes,
        ciphertext_hash, storage_status, provider_reference)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, 'pending', $9::jsonb)
     returning id`,
    [
      input.userId,
      input.connectionId,
      input.provider,
      input.telegram?.chatReference ?? null,
      input.telegram?.messageReference ?? null,
      input.telegram?.mediaReference ? JSON.stringify(input.telegram.mediaReference) : null,
      input.remoteSizeBytes,
      input.ciphertextHash,
      JSON.stringify(input.reference),
    ],
  );
  const id = rows[0]?.id;
  if (!id) {
    throw new ApiError('INTERNAL_ERROR', 500, 'The storage object could not be recorded.');
  }
  return id;
}

async function setObjectStatus(
  db: Db,
  objectId: string,
  status: 'available' | 'reconciliation_required',
): Promise<void> {
  await db.query(
    `update public.storage_objects
       set storage_status = $2,
           last_verified_at = case when $2 = 'available' then now() else last_verified_at end
     where id = $1`,
    [objectId, status],
  );
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

async function respondWithExisting(
  deps: StorageDeps,
  userId: string,
  row: UploadRow,
  input: CreateUploadRequest,
): Promise<CreateUploadResponse> {
  const job = mapJob(row, await stagedChunkNumbers(deps.db, row.id));
  const matches =
    job.sourceSizeBytes === input.manifest.plaintextSize &&
    job.chunkSizeBytes === input.manifest.chunking.plaintextChunkSize &&
    job.totalChunks === input.manifest.chunking.totalChunks &&
    // A replayed key with a different source fingerprint is a different file:
    // it must never be stitched onto the half-finished job (A5.4).
    (input.sourceFingerprint === undefined ||
      job.sourceFingerprint === null ||
      job.sourceFingerprint === input.sourceFingerprint);
  if (!matches) {
    throw new ApiError(
      'UPLOAD_STATE_CONFLICT',
      409,
      'This idempotency key belongs to a different upload. Use a new key for new content.',
    );
  }
  if (!row.fileId) {
    throw uploadNotFound();
  }
  const file = await getFile(deps.db, userId, row.fileId);
  if (!file) {
    throw uploadNotFound();
  }
  return { upload: job, file };
}

export async function createUpload(
  deps: StorageDeps,
  userId: string,
  input: CreateUploadRequest,
): Promise<CreateUploadResponse> {
  const problem = checkManifestConsistency(input.manifest, {
    maxPlaintextBytes: deps.config.storage.maxUploadBytes,
  });
  if (problem) {
    const tooLarge = problem.includes('upload limit');
    throw new ApiError(tooLarge ? 'FILE_TOO_LARGE' : 'VALIDATION_ERROR', tooLarge ? 413 : 400, problem);
  }

  // Canonical base64 of exact byte lengths, verified before anything is staged.
  const streamHeader = requireBase64(
    input.manifest.streamHeader,
    SECRETSTREAM_HEADER_BYTES,
    'manifest.streamHeader',
  );
  requireBase64(
    input.manifest.wrappedKey.nonce,
    SECRETBOX_NONCE_BYTES,
    'manifest.wrappedKey.nonce',
  );
  requireBase64(
    input.manifest.wrappedKey.ciphertext,
    WRAPPED_KEY_BYTES,
    'manifest.wrappedKey.ciphertext',
  );

  const existing = await loadJobByKey(deps.db, userId, input.idempotencyKey);
  if (existing) {
    return respondWithExisting(deps, userId, existing, input);
  }

  const folderId = parseOptionalFolderId(input.folderId ?? null, 'folderId');
  const name = normalizeName(input.name);
  const mimeType = input.mimeType.trim() || 'application/octet-stream';
  const connectionId = await resolveStorageConnection(deps, userId);

  const active = await deps.db.query<{ total: unknown }>(
    `select count(*)::int as total from public.upload_jobs
      where user_id = $1 and status not in ('completed', 'cancelled')`,
    [userId],
  );
  if (toCount(active.rows[0]?.total) >= deps.config.storage.maxActiveUploads) {
    throw new ApiError(
      'UPLOAD_STATE_CONFLICT',
      409,
      `Too many unfinished uploads (limit ${deps.config.storage.maxActiveUploads}). Finish or cancel one first.`,
    );
  }

  let created: { job: UploadRow; fileId: string };
  try {
    created = await deps.db.transaction(async (tx) => {
      if (folderId) {
        await assertActiveFolder(tx, userId, folderId);
      }

      const file = await tx.query<{ id: string }>(
        `insert into public.files
           (user_id, folder_id, name, extension, mime_type, logical_size_bytes)
         values ($1, $2, $3, $4, $5, $6)
         returning id`,
        [userId, folderId, name, extensionOf(name), mimeType, input.manifest.plaintextSize],
      );
      const fileId = file.rows[0]?.id;
      if (!fileId) {
        throw new ApiError('INTERNAL_ERROR', 500, 'The file record could not be created.');
      }

      const job = await tx.query<UploadRow>(
        `insert into public.upload_jobs
           (user_id, file_id, storage_connection_id, idempotency_key, status,
            source_size_bytes, source_fingerprint, encrypted_size_bytes,
            chunk_size_bytes, total_chunks, manifest)
         values ($1, $2, $3, $4, 'transferring', $5, $6, $7, $8, $9, $10::jsonb)
         returning ${JOB_COLUMNS}`,
        [
          userId,
          fileId,
          connectionId,
          input.idempotencyKey,
          input.manifest.plaintextSize,
          input.sourceFingerprint ?? null,
          input.manifest.ciphertextSize,
          input.manifest.chunking.plaintextChunkSize,
          input.manifest.chunking.totalChunks,
          JSON.stringify(input.manifest),
        ],
      );
      const row = job.rows[0];
      if (!row) {
        throw new ApiError('INTERNAL_ERROR', 500, 'The upload job could not be created.');
      }
      // The insert cannot join; the file row was just written with this name.
      return { job: { ...row, fileName: name }, fileId };
    });
  } catch (error) {
    // A concurrent replay of the same key wins the unique constraint; return it.
    if ((error as { code?: string }).code === '23505') {
      const winner = await loadJobByKey(deps.db, userId, input.idempotencyKey);
      if (winner) {
        return respondWithExisting(deps, userId, winner, input);
      }
    }
    throw error;
  }

  const staging = stagingFilePath(deps.config, userId, created.job.id);
  try {
    await mkdir(path.dirname(staging), { recursive: true });
    // The staged file starts as the exact ciphertext stream: the pinned 24-byte
    // secretstream header, then one chunk written at a time at fixed offsets.
    await writeFile(staging, streamHeader);
  } catch {
    await markJobFailed(deps.db, userId, created.job.id, 'INTERNAL_ERROR');
    throw new ApiError('INTERNAL_ERROR', 500, 'Upload staging could not be created.');
  }

  const file = await getFile(deps.db, userId, created.fileId);
  if (!file) {
    throw uploadNotFound();
  }
  return { upload: mapJob(created.job, []), file };
}

// ---------------------------------------------------------------------------
// Chunk receipt
// ---------------------------------------------------------------------------

export async function receiveChunk(
  deps: StorageDeps,
  userId: string,
  uploadId: string,
  chunkNumber: number,
  body: Buffer,
  checksumHeader: string | undefined,
): Promise<UploadChunkResponse> {
  const row = await loadJob(deps.db, userId, uploadId);
  if (!row) {
    throw uploadNotFound();
  }
  if (row.status !== 'transferring' && row.status !== 'retrying') {
    throw new ApiError(
      'UPLOAD_STATE_CONFLICT',
      409,
      `This upload is "${row.status}" and no longer accepts chunks.`,
    );
  }

  const manifest = parseUploadManifest(row.manifest);
  const totalChunks = Math.max(1, toCount(row.totalChunks));
  if (!Number.isInteger(chunkNumber) || chunkNumber < 0 || chunkNumber >= totalChunks) {
    throw new ApiError(
      'VALIDATION_ERROR',
      400,
      `Chunk number must be between 0 and ${totalChunks - 1}.`,
    );
  }

  const expectedLength = ciphertextChunkLength(manifest, chunkNumber);
  if (body.length !== expectedLength) {
    throw new ApiError(
      'VALIDATION_ERROR',
      400,
      `Chunk ${chunkNumber} must contain exactly ${expectedLength} bytes.`,
    );
  }

  const checksum = (checksumHeader ?? '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(checksum)) {
    throw new ApiError(
      'VALIDATION_ERROR',
      400,
      'A lowercase hex sha256 x-chunk-checksum header is required for every chunk.',
    );
  }
  const actual = createHash('sha256').update(body).digest('hex');
  if (actual !== checksum) {
    throw new ApiError(
      'UPLOAD_INTEGRITY_FAILED',
      422,
      `Chunk ${chunkNumber} failed its checksum check. Resend the encrypted chunk.`,
    );
  }

  await writeStagingChunk(
    stagingFilePath(deps.config, userId, uploadId),
    ciphertextChunkOffset(manifest, chunkNumber),
    body,
  );

  const received = await deps.db.transaction(async (tx) => {
    await tx.query(
      `insert into public.upload_chunks
         (upload_job_id, chunk_number, chunk_size_bytes, checksum, chunk_state, received_at)
       values ($1, $2, $3, $4, 'staged', now())
       on conflict (upload_job_id, chunk_number) do update set
         chunk_size_bytes = excluded.chunk_size_bytes,
         checksum = excluded.checksum,
         chunk_state = 'staged',
         received_at = now()`,
      [uploadId, chunkNumber, body.length, checksum],
    );
    const numbers = await stagedChunkNumbers(tx, uploadId);
    await tx.query(
      'update public.upload_jobs set received_chunks = $3 where user_id = $1 and id = $2',
      [userId, uploadId, numbers.length],
    );
    return numbers;
  });

  const updated = await loadJob(deps.db, userId, uploadId);
  if (!updated) {
    throw uploadNotFound();
  }
  return { upload: mapJob(updated, received) };
}

// ---------------------------------------------------------------------------
// Finalize
// ---------------------------------------------------------------------------

export async function finalizeUpload(
  deps: StorageDeps,
  userId: string,
  uploadId: string,
  declared: FinalizeUploadRequest,
): Promise<FinalizeUploadResponse> {
  const row = await loadJob(deps.db, userId, uploadId);
  if (!row) {
    throw uploadNotFound();
  }
  if (!row.fileId) {
    throw uploadNotFound();
  }

  if (row.status === 'completed') {
    const file = await getFile(deps.db, userId, row.fileId);
    const version = file
      ? await getCurrentVersion(deps.db, userId, row.fileId)
      : null;
    if (file && version) {
      return {
        upload: mapJob(row, await stagedChunkNumbers(deps.db, row.id)),
        file,
        version,
      };
    }
  }

  if (row.status !== 'transferring' && row.status !== 'retrying') {
    throw new ApiError(
      'UPLOAD_STATE_CONFLICT',
      409,
      `This upload is "${row.status}" and cannot be finalized.`,
    );
  }

  const uploadManifest = parseUploadManifest(row.manifest);
  const totalChunks = Math.max(1, toCount(row.totalChunks));
  const staged = await stagedChunkNumbers(deps.db, uploadId);
  if (staged.length !== totalChunks) {
    throw new ApiError(
      'UPLOAD_STATE_CONFLICT',
      409,
      `Only ${staged.length} of ${totalChunks} chunks have been received.`,
    );
  }

  await deps.db.query(
    `update public.upload_jobs set status = 'finalizing' where user_id = $1 and id = $2`,
    [userId, uploadId],
  );

  const staging = stagingFilePath(deps.config, userId, uploadId);
  const assembledHash = await hashFile(staging);
  if (assembledHash !== declared.ciphertextHash) {
    await markJobFailed(deps.db, userId, uploadId, 'UPLOAD_INTEGRITY_FAILED');
    await removeStaging(deps.config, userId, uploadId);
    throw new ApiError(
      'UPLOAD_INTEGRITY_FAILED',
      422,
      'The assembled ciphertext does not match the hash declared by the client. Nothing was stored; start the upload again.',
    );
  }

  // The immutable manifest: what the client sent, plus the hashes it declared
  // and the server just verified against the assembled stream.
  const manifest: EncryptionManifest = {
    ...uploadManifest,
    ciphertextHash: assembledHash,
    plaintextFingerprint: declared.plaintextFingerprint,
  };
  if (!Value.Check(EncryptionManifestSchema, manifest)) {
    throw new ApiError('INTERNAL_ERROR', 500, 'The upload manifest could not be finalized.');
  }
  const ciphertextHash = assembledHash;

  const connection = await deps.db.query<{ provider: StorageProvider }>(
    `select provider from public.storage_connections where id = $1 and user_id = $2`,
    [row.storageConnectionId, userId],
  );
  const providerName = connection.rows[0]?.provider;
  if (!providerName) {
    throw new ApiError('STORAGE_DISCONNECTED', 409, 'The storage connection for this upload no longer exists.');
  }

  let handle: OpenStorageProvider | null = null;
  let objectRecordId: string | null = null;
  let objectConfirmed = false;
  const objectId = randomUUID();
  const objectName =
    providerName === 'local' ? `${userId}/${objectId}.bin` : `${objectId}.bin`;
  let uploadSource = staging;
  let temporaryCopy: string | null = null;

  try {
    handle = await openStorageProvider(deps, userId, providerName);
    if (handle.connectionId !== row.storageConnectionId) {
      throw new ApiError(
        'UPLOAD_STATE_CONFLICT',
        409,
        'The storage connection changed since this upload started. Start the upload again.',
      );
    }

    if (providerName === 'telegram') {
      // The provider sees only the neutral object name, never the user's file name.
      temporaryCopy = path.join(deps.config.storage.stagingDir, userId, `${objectId}.bin`);
      await copyFile(staging, temporaryCopy);
      uploadSource = temporaryCopy;
    }

    const stored = await handle.provider.upload({
      objectName,
      sizeBytes: manifest.ciphertextSize,
      sourcePath: uploadSource,
    });

    objectRecordId = await insertStorageObject(deps.db, {
      userId,
      connectionId: handle.connectionId,
      provider: providerName,
      reference: stored.reference,
      ...(stored.telegram ? { telegram: stored.telegram } : {}),
      remoteSizeBytes: stored.remoteSizeBytes,
      ciphertextHash,
    });

    const inspection = await handle.provider.inspect(stored.reference);
    const sizeMatches =
      inspection.remoteSizeBytes === null ||
      stored.remoteSizeBytes === null ||
      inspection.remoteSizeBytes === stored.remoteSizeBytes;
    if (inspection.status !== 'available' || !sizeMatches) {
      throw new ApiError(
        'STORAGE_RECONCILIATION_REQUIRED',
        409,
        'The provider did not confirm the stored object. The upload is parked for reconciliation.',
      );
    }
    await setObjectStatus(deps.db, objectRecordId, 'available');
    objectConfirmed = true;

    const versionInfo = await deps.db.transaction(async (tx) => {
      const next = await tx.query<{ versionNumber: unknown }>(
        `select coalesce(max(version_number), 0) + 1 as "versionNumber"
           from public.file_versions where user_id = $1 and file_id = $2`,
        [userId, row.fileId],
      );
      const versionNumber = Math.max(1, toCount(next.rows[0]?.versionNumber));

      const inserted = await tx.query<{ id: string }>(
        `insert into public.file_versions
           (user_id, file_id, version_number, size_bytes, ciphertext_hash, plaintext_fingerprint,
            encryption_format_version, encryption_manifest, storage_object_id, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $1)
         returning id`,
        [
          userId,
          row.fileId,
          versionNumber,
          manifest.plaintextSize,
          ciphertextHash,
          declared.plaintextFingerprint,
          FILE_ENCRYPTION_FORMAT_VERSION,
          JSON.stringify(manifest),
          objectRecordId,
        ],
      );
      const versionId = inserted.rows[0]?.id;
      if (!versionId) {
        throw new ApiError('INTERNAL_ERROR', 500, 'The file version could not be recorded.');
      }

      await tx.query(
        `update public.files
           set current_version_id = $3,
               logical_size_bytes = $4,
               content_fingerprint = $5,
               updated_at = now()
         where user_id = $1 and id = $2`,
        [userId, row.fileId, versionId, manifest.plaintextSize, declared.plaintextFingerprint],
      );

      await tx.query(
        `update public.upload_jobs
           set status = 'completed',
               received_chunks = $3,
               encrypted_size_bytes = $4,
               completed_at = now(),
               last_error_code = null
         where user_id = $1 and id = $2`,
        [userId, uploadId, totalChunks, manifest.ciphertextSize],
      );

      return { versionId };
    });

    await removeStaging(deps.config, userId, uploadId);

    const file = await getFile(deps.db, userId, row.fileId);
    const version = await getVersion(deps.db, userId, versionInfo.versionId);
    const finished = await loadJob(deps.db, userId, uploadId);
    if (!file || !version || !finished) {
      throw new ApiError('INTERNAL_ERROR', 500, 'The upload completed but its records could not be read back.');
    }
    return { upload: mapJob(finished, staged), file, version };
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : error instanceof TelegramError
          ? mapStorageError(error)
          : new ApiError('INTERNAL_ERROR', 500, 'The upload could not be finalized.');

    if (objectRecordId && !objectConfirmed) {
      await setObjectStatus(deps.db, objectRecordId, 'reconciliation_required').catch(
        () => undefined,
      );
    }
    await markJobFailed(deps.db, userId, uploadId, apiError.code);
    if (apiError.code === 'TELEGRAM_SESSION_EXPIRED') {
      await deps.db
        .query(
          `update public.storage_connections
             set connection_status = 'expired', last_error_code = 'TELEGRAM_SESSION_EXPIRED'
           where id = $1 and user_id = $2`,
          [row.storageConnectionId, userId],
        )
        .catch(() => undefined);
    }
    throw apiError;
  } finally {
    if (temporaryCopy) {
      await rm(temporaryCopy, { force: true }).catch(() => undefined);
    }
    if (handle) {
      await handle.close();
    }
  }
}

function mapStorageError(error: TelegramError): ApiError {
  switch (error.code) {
    case 'RATE_LIMITED':
      return new ApiError(
        'TELEGRAM_RATE_LIMIT',
        429,
        error.retryAfterSeconds
          ? `Telegram asked to wait ${error.retryAfterSeconds} seconds before retrying.`
          : 'Telegram is rate limiting this account. Try again shortly.',
      );
    case 'SESSION_EXPIRED':
    case 'NOT_AUTHENTICATED':
      return new ApiError(
        'TELEGRAM_SESSION_EXPIRED',
        409,
        'The Telegram session is no longer valid. Reconnect it from settings.',
      );
    case 'MISSING':
      return new ApiError(
        'STORAGE_RECONCILIATION_REQUIRED',
        409,
        'The stored object could not be found on the provider.',
      );
    default:
      return new ApiError('STORAGE_DISCONNECTED', 502, 'The storage provider rejected the operation.');
  }
}

// ---------------------------------------------------------------------------
// Cancel and read
// ---------------------------------------------------------------------------

export async function cancelUpload(
  deps: StorageDeps,
  userId: string,
  uploadId: string,
): Promise<CancelUploadResponse> {
  const row = await loadJob(deps.db, userId, uploadId);
  if (!row) {
    throw uploadNotFound();
  }
  if (row.status === 'completed') {
    throw new ApiError(
      'UPLOAD_STATE_CONFLICT',
      409,
      'This upload already completed; cancel is not available.',
    );
  }
  if (row.status === 'cancelled') {
    return { upload: mapJob(row, await stagedChunkNumbers(deps.db, uploadId)) };
  }

  await deps.db.transaction(async (tx) => {
    await tx.query(
      `update public.upload_jobs
         set status = 'cancelled', cancelled_at = now()
       where user_id = $1 and id = $2`,
      [userId, uploadId],
    );
    if (row.fileId) {
      // Remove the placeholder file record only while it has no versions.
      await tx.query(
        `delete from public.files f
          where f.user_id = $1 and f.id = $2
            and not exists (
              select 1 from public.file_versions v
              where v.user_id = f.user_id and v.file_id = f.id
            )`,
        [userId, row.fileId],
      );
    }
  });

  await removeStaging(deps.config, userId, uploadId);

  const updated = await loadJob(deps.db, userId, uploadId);
  if (!updated) {
    throw uploadNotFound();
  }
  return { upload: mapJob(updated, await stagedChunkNumbers(deps.db, uploadId)) };
}

export async function getUpload(
  db: Db,
  userId: string,
  uploadId: string,
): Promise<UploadJob> {
  await sweepStaleJobs(db, userId);
  const row = await loadJob(db, userId, uploadId);
  if (!row) {
    throw uploadNotFound();
  }
  return mapJob(row, await stagedChunkNumbers(db, uploadId));
}

// ---------------------------------------------------------------------------
// Queue restore, pause, resume and retry (A5.4, A5.5)
// ---------------------------------------------------------------------------

/** Statuses in which the client, not a worker, drives the job forward. */
const CLIENT_DRIVEN: readonly UploadJob['status'][] = [
  'queued',
  'preparing',
  'encrypting',
  'transferring',
  'retrying',
];

/**
 * Only the browser moves an open job, so a row nobody has touched is genuinely
 * interrupted — a refresh, a closed tab, a sleeping laptop. The sweep runs on
 * every read and converts that into an explicit state the queue can act on
 * instead of a job that looks alive forever. `finalizing` gets a much longer
 * grace period because a provider transfer legitimately runs without chunk
 * traffic (A5.4).
 */
async function sweepStaleJobs(db: Db | Queryable, userId: string): Promise<void> {
  await db.query(
    `update public.upload_jobs
        set status = case when status = 'finalizing'
                          then 'reconciliation_required' else 'needs_source_file' end,
            last_error_code = case when status = 'finalizing'
                          then 'STORAGE_RECONCILIATION_REQUIRED' else 'UPLOAD_SOURCE_REQUIRED' end
      where user_id = $1
        and status in ('queued', 'preparing', 'encrypting', 'transferring', 'retrying', 'finalizing')
        and updated_at < now() - (case when status = 'finalizing' then 15 else 2 end)
                            * interval '1 minute'`,
    [userId],
  );
}

/** Every unfinished job, newest first, so a reloaded browser can restore its queue. */
export async function listUploads(db: Db, userId: string): Promise<UploadJob[]> {
  await sweepStaleJobs(db, userId);
  const { rows } = await db.query<UploadRow>(
    `${JOB_READ}
       and j.status not in ('completed', 'cancelled')
     order by j.created_at desc
     limit 50`,
    [userId],
  );
  const jobs: UploadJob[] = [];
  for (const row of rows) {
    jobs.push(mapJob(row, await stagedChunkNumbers(db, row.id)));
  }
  return jobs;
}

async function respondJob(db: Db, userId: string, uploadId: string): Promise<UploadJob> {
  const row = await loadJob(db, userId, uploadId);
  if (!row) throw uploadNotFound();
  return mapJob(row, await stagedChunkNumbers(db, uploadId));
}

export async function pauseUpload(db: Db, userId: string, uploadId: string): Promise<UploadJob> {
  const row = await loadJob(db, userId, uploadId);
  if (!row) throw uploadNotFound();
  if (row.status === 'paused') return respondJob(db, userId, uploadId);
  if (!CLIENT_DRIVEN.includes(row.status)) {
    throw new ApiError(
      'UPLOAD_STATE_CONFLICT',
      409,
      `This upload is "${row.status}" and cannot be paused.`,
    );
  }
  await db.query(
    `update public.upload_jobs set status = 'paused' where user_id = $1 and id = $2`,
    [userId, uploadId],
  );
  return respondJob(db, userId, uploadId);
}

export async function resumeUpload(db: Db, userId: string, uploadId: string): Promise<UploadJob> {
  const row = await loadJob(db, userId, uploadId);
  if (!row) throw uploadNotFound();
  if (row.status === 'paused') {
    // "retrying" is the state that accepts chunks again; no chunk is resent.
    await db.query(
      `update public.upload_jobs set status = 'retrying' where user_id = $1 and id = $2`,
      [userId, uploadId],
    );
    return respondJob(db, userId, uploadId);
  }
  if (CLIENT_DRIVEN.includes(row.status)) return respondJob(db, userId, uploadId);
  throw new ApiError(
    'UPLOAD_STATE_CONFLICT',
    409,
    `This upload is "${row.status}"; use retry, or start a new upload.`,
  );
}

export async function retryUpload(db: Db, userId: string, uploadId: string): Promise<UploadJob> {
  const row = await loadJob(db, userId, uploadId);
  if (!row) throw uploadNotFound();
  if (CLIENT_DRIVEN.includes(row.status)) return respondJob(db, userId, uploadId);
  if (row.status === 'failed' || row.status === 'needs_source_file' || row.status === 'paused') {
    await db.query(
      `update public.upload_jobs
          set status = 'retrying', retry_count = retry_count + 1
        where user_id = $1 and id = $2`,
      [userId, uploadId],
    );
    return respondJob(db, userId, uploadId);
  }
  if (row.status === 'reconciliation_required') {
    throw new ApiError(
      'STORAGE_RECONCILIATION_REQUIRED',
      409,
      'This upload stopped inside provider finalisation. Run storage reconciliation before retrying it.',
    );
  }
  throw new ApiError(
    'UPLOAD_STATE_CONFLICT',
    409,
    `This upload is "${row.status}" and cannot be retried.`,
  );
}

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------

interface VersionRow {
  id: string;
  fileId: string;
  versionNumber: number;
  sizeBytes: unknown;
  ciphertextHash: string;
  encryptionFormatVersion: string;
  manifest: unknown;
  storageStatus: string;
  createdAt: unknown;
}

const VERSION_COLUMNS = `
  v.id,
  v.file_id as "fileId",
  v.version_number as "versionNumber",
  v.size_bytes as "sizeBytes",
  v.ciphertext_hash as "ciphertextHash",
  v.encryption_format_version as "encryptionFormatVersion",
  v.encryption_manifest as "manifest",
  o.storage_status as "storageStatus",
  v.created_at as "createdAt"
`;

function mapVersion(row: VersionRow): FileVersion {
  const manifest = parseManifest(row.manifest);
  return {
    id: row.id,
    fileId: row.fileId,
    versionNumber: toCount(row.versionNumber),
    sizeBytes: toCount(row.sizeBytes),
    ciphertextSizeBytes: manifest.ciphertextSize,
    ciphertextHash: row.ciphertextHash,
    encryptionFormatVersion: row.encryptionFormatVersion,
    manifest,
    storageStatus: row.storageStatus as FileVersion['storageStatus'],
    createdAt: toIsoString(row.createdAt),
  };
}

async function requireLiveFile(db: Db, userId: string, fileId: string): Promise<string> {
  const id = parseUuid(fileId, 'fileId');
  const { rows } = await db.query(
    'select 1 as present from public.files where user_id = $1 and id = $2 and deleted_at is null',
    [userId, id],
  );
  if (rows.length === 0) {
    throw new ApiError('FILE_NOT_FOUND', 404, 'That file does not exist.');
  }
  return id;
}

export async function listVersions(
  db: Db,
  userId: string,
  fileId: string,
): Promise<FileVersionListResponse> {
  const id = await requireLiveFile(db, userId, fileId);
  const { rows } = await db.query<VersionRow>(
    `select ${VERSION_COLUMNS}
       from public.file_versions v
       join public.storage_objects o on o.user_id = v.user_id and o.id = v.storage_object_id
      where v.user_id = $1 and v.file_id = $2
      order by v.version_number desc`,
    [userId, id],
  );
  return { items: rows.map(mapVersion) };
}

export async function getVersion(
  db: Db,
  userId: string,
  versionId: string,
): Promise<FileVersion | null> {
  const id = parseUuid(versionId, 'versionId');
  const { rows } = await db.query<VersionRow>(
    `select ${VERSION_COLUMNS}
       from public.file_versions v
       join public.storage_objects o on o.user_id = v.user_id and o.id = v.storage_object_id
      where v.user_id = $1 and v.id = $2`,
    [userId, id],
  );
  return rows[0] ? mapVersion(rows[0]) : null;
}

export async function getCurrentVersion(
  db: Db,
  userId: string,
  fileId: string,
): Promise<FileVersion | null> {
  const id = parseUuid(fileId, 'fileId');
  const { rows } = await db.query<VersionRow>(
    `select ${VERSION_COLUMNS}
       from public.file_versions v
       join public.storage_objects o on o.user_id = v.user_id and o.id = v.storage_object_id
      where v.user_id = $1 and v.file_id = $2
      order by v.version_number desc
      limit 1`,
    [userId, id],
  );
  return rows[0] ? mapVersion(rows[0]) : null;
}

export interface VersionDownload {
  version: FileVersion;
  provider: StorageProvider;
  reference: ProviderReference;
}

export async function loadVersionForDownload(
  db: Db,
  userId: string,
  fileId: string,
  versionId: string,
): Promise<VersionDownload | null> {
  const file = parseUuid(fileId, 'fileId');
  const version = parseUuid(versionId, 'versionId');
  const { rows } = await db.query<VersionRow & { provider: StorageProvider; providerReference: unknown }>(
    `select ${VERSION_COLUMNS}, o.provider, o.provider_reference as "providerReference"
       from public.file_versions v
       join public.storage_objects o on o.user_id = v.user_id and o.id = v.storage_object_id
      where v.user_id = $1 and v.file_id = $2 and v.id = $3`,
    [userId, file, version],
  );
  const row = rows[0];
  if (!row) {
    return null;
  }
  const mapped = mapVersion(row);
  if (mapped.storageStatus !== 'available') {
    throw new ApiError(
      'STORAGE_RECONCILIATION_REQUIRED',
      409,
      'The stored ciphertext is not currently available on the provider.',
    );
  }
  if (typeof row.providerReference !== 'object' || row.providerReference === null) {
    throw new ApiError(
      'STORAGE_RECONCILIATION_REQUIRED',
      409,
      'The stored object reference is invalid.',
    );
  }
  return {
    version: mapped,
    provider: row.provider,
    reference: row.providerReference as ProviderReference,
  };
}
