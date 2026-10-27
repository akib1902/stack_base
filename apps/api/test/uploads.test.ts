import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ciphertextChunkLength,
  ciphertextChunkOffset,
  ciphertextSizeFor,
  totalChunksFor,
  type CreateUploadResponse,
  type EncryptionManifest,
  type FileVersionListResponse,
  type FinalizeUploadResponse,
  type UploadChunkResponse,
  type UploadJob,
} from '@stackbase/contracts';
import {
  authHeader,
  createTestContext,
  signIn,
  testConfig,
  type DevSession,
  type TestContext,
} from './helpers';

const sha256 = (buffer: Buffer): string => createHash('sha256').update(buffer).digest('hex');

interface Fabricated {
  manifest: EncryptionManifest;
  ciphertext: Buffer;
}

/**
 * Real ciphertext is not needed to exercise the server: it stores and verifies
 * opaque bytes. The fabrication follows the pinned layout exactly, which is
 * what the server checks (lengths, checksums, assembled hash).
 */
function fabricate(plaintextSize: number, chunkSize = 64 * 1024): Fabricated {
  const ciphertext = Buffer.alloc(ciphertextSizeFor(plaintextSize, chunkSize));
  // Deterministic filler so failures are reproducible.
  for (let index = 0; index < ciphertext.length; index += 1) {
    ciphertext[index] = (index * 31 + 7) % 256;
  }
  const manifest: EncryptionManifest = {
    format: 'stackbase-file',
    version: 1,
    cipher: 'xchacha20poly1305-secretstream',
    chunking: {
      plaintextChunkSize: chunkSize,
      totalChunks: totalChunksFor(plaintextSize, chunkSize),
    },
    plaintextSize,
    ciphertextSize: ciphertext.length,
    ciphertextHash: sha256(ciphertext),
    plaintextFingerprint: sha256(Buffer.from(`plaintext:${plaintextSize}:${chunkSize}`)),
    streamHeader: Buffer.alloc(24, 5).toString('base64'),
    wrappedKey: {
      algorithm: 'xsalsa20poly1305',
      nonce: Buffer.alloc(24, 6).toString('base64'),
      ciphertext: Buffer.alloc(48, 7).toString('base64'),
    },
  };
  return { manifest, ciphertext };
}

const chunkOf = (fabricated: Fabricated, chunkNumber: number): Buffer => {
  const start = ciphertextChunkOffset(fabricated.manifest, chunkNumber);
  return fabricated.ciphertext.subarray(
    start,
    start + ciphertextChunkLength(fabricated.manifest, chunkNumber),
  );
};

let ctx: TestContext;
let alice: DevSession;
let bob: DevSession;

beforeAll(async () => {
  // The suite deliberately leaves some jobs unfinished to exercise state
  // conflicts, so the quota is raised above the per-test demand.
  ctx = await createTestContext(testConfig({ MAX_ACTIVE_UPLOADS: '8' }));
  alice = await signIn(ctx.app, 'uploads-alice@example.com');
  bob = await signIn(ctx.app, 'uploads-bob@example.com');
});

afterAll(async () => {
  await ctx.close();
});

const createUpload = (
  session: DevSession,
  manifest: EncryptionManifest,
  extra: Record<string, unknown> = {},
) =>
  ctx.app.inject({
    method: 'POST',
    url: '/api/v1/uploads',
    headers: authHeader(session),
    payload: {
      idempotencyKey: `key-${randomUUID()}`,
      name: 'report.pdf',
      mimeType: 'application/pdf',
      manifest,
      ...extra,
    },
  });

const putChunk = (
  session: DevSession,
  uploadId: string,
  number: number,
  payload: Buffer,
  checksum?: string,
) =>
  ctx.app.inject({
    method: 'PUT',
    url: `/api/v1/uploads/${uploadId}/chunks/${number}`,
    headers: {
      ...authHeader(session),
      'content-type': 'application/octet-stream',
      ...(checksum === undefined ? {} : { 'x-chunk-checksum': checksum }),
    },
    payload,
  });

const finalize = (session: DevSession, uploadId: string) =>
  ctx.app.inject({
    method: 'POST',
    url: `/api/v1/uploads/${uploadId}/finalize`,
    headers: authHeader(session),
  });

const cancel = (session: DevSession, uploadId: string) =>
  ctx.app.inject({
    method: 'POST',
    url: `/api/v1/uploads/${uploadId}/cancel`,
    headers: authHeader(session),
  });

const stagingPath = (session: DevSession, uploadId: string): string =>
  path.join(ctx.stagingDir, session.id, `${uploadId}.part`);

describe('upload pipeline', () => {
  it('requires authentication', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/uploads',
      payload: {
        idempotencyKey: 'key-unauthorized',
        name: 'x.bin',
        mimeType: 'application/octet-stream',
        manifest: fabricate(1_000).manifest,
      },
    });
    expect(response.statusCode).toBe(401);
  });

  it('accepts an encrypted upload end to end and creates the immutable version', async () => {
    const fabricated = fabricate(150_000);
    const created = await createUpload(alice, fabricated.manifest);
    expect(created.statusCode).toBe(200);
    const body = created.json() as CreateUploadResponse;
    expect(body.upload).toMatchObject({
      status: 'transferring',
      sourceSizeBytes: 150_000,
      encryptedSizeBytes: fabricated.manifest.ciphertextSize,
      chunkSizeBytes: 65_536,
      totalChunks: 3,
      receivedChunks: 0,
    });
    expect(body.file).toMatchObject({
      name: 'report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 150_000,
      contentStatus: 'pending',
    });

    const uploadId = body.upload.id;

    const first = await putChunk(alice, uploadId, 0, chunkOf(fabricated, 0), sha256(chunkOf(fabricated, 0)));
    expect((first.json() as UploadChunkResponse).upload.receivedChunks).toBe(1);
    expect((first.json() as UploadChunkResponse).upload.receivedChunkNumbers).toEqual([0]);

    // Finalize before all chunks is a state conflict, not a partial success.
    const tooEarly = await finalize(alice, uploadId);
    expect(tooEarly.statusCode).toBe(409);
    expect(tooEarly.json()).toMatchObject({ error: { code: 'UPLOAD_STATE_CONFLICT' } });

    await putAllChunksFrom(alice, uploadId, fabricated, 1);

    const finalized = await finalize(alice, uploadId);
    expect(finalized.statusCode).toBe(200);
    const result = finalized.json() as FinalizeUploadResponse;
    expect(result.upload.status).toBe('completed');
    expect(result.file.contentStatus).toBe('ready');
    expect(result.file.sizeBytes).toBe(150_000);
    expect(result.version).toMatchObject({
      fileId: body.file.id,
      versionNumber: 1,
      sizeBytes: 150_000,
      ciphertextSizeBytes: fabricated.manifest.ciphertextSize,
      ciphertextHash: fabricated.manifest.ciphertextHash,
      encryptionFormatVersion: 'stackbase/1',
      storageStatus: 'available',
    });

    // Staging is gone; the provider holds exactly the ciphertext.
    expect(existsSync(stagingPath(alice, uploadId))).toBe(false);
    const objects = await readdir(path.join(ctx.objectsDir, alice.id));
    expect(objects).toHaveLength(1);
    const stored = await readFile(path.join(ctx.objectsDir, alice.id, objects[0] as string));
    expect(stored.equals(fabricated.ciphertext)).toBe(true);

    const objectRow = await ctx.db.query<{ provider: string; storageStatus: string; remoteSize: unknown }>(
      `select provider, storage_status as "storageStatus", remote_size_bytes as "remoteSize"
         from public.storage_objects where user_id = $1`,
      [alice.id],
    );
    expect(objectRow.rows[0]).toMatchObject({
      provider: 'local',
      storageStatus: 'available',
      remoteSize: fabricated.manifest.ciphertextSize,
    });

    // Download streams exact ciphertext and reports its hash.
    const download = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/files/${body.file.id}/versions/${result.version.id}/download`,
      headers: authHeader(alice),
    });
    expect(download.statusCode).toBe(200);
    expect(download.headers['x-stackbase-ciphertext-hash']).toBe(
      fabricated.manifest.ciphertextHash,
    );
    expect(Buffer.from(download.rawPayload).equals(fabricated.ciphertext)).toBe(true);

    const versions = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/files/${body.file.id}/versions`,
      headers: authHeader(alice),
    });
    expect((versions.json() as FileVersionListResponse).items).toHaveLength(1);

    // Finalizing twice returns the same version instead of creating another.
    const again = await finalize(alice, uploadId);
    expect(again.statusCode).toBe(200);
    expect((again.json() as FinalizeUploadResponse).version.id).toBe(result.version.id);
  });

  it('is idempotent per key and rejects a mismatched replay', async () => {
    const fabricated = fabricate(10_000);
    const key = `key-${randomUUID()}`;

    const first = await createUpload(alice, fabricated.manifest, { idempotencyKey: key });
    const second = await createUpload(alice, fabricated.manifest, { idempotencyKey: key });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    const firstBody = first.json() as CreateUploadResponse;
    const secondBody = second.json() as CreateUploadResponse;
    expect(secondBody.upload.id).toBe(firstBody.upload.id);
    expect(secondBody.file.id).toBe(firstBody.file.id);

    const different = fabricate(20_000);
    const conflict = await createUpload(alice, different.manifest, { idempotencyKey: key });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toMatchObject({ error: { code: 'UPLOAD_STATE_CONFLICT' } });
  });

  it('validates chunk size, checksum, range and job state', async () => {
    const fabricated = fabricate(90_000);
    const created = await createUpload(alice, fabricated.manifest);
    const uploadId = (created.json() as CreateUploadResponse).upload.id;
    const chunk = chunkOf(fabricated, 0);

    const badChecksum = await putChunk(alice, uploadId, 0, chunk, 'f'.repeat(64));
    expect(badChecksum.statusCode).toBe(422);
    expect(badChecksum.json()).toMatchObject({ error: { code: 'UPLOAD_INTEGRITY_FAILED' } });

    const truncated = chunk.subarray(0, chunk.length - 5);
    const shortChunk = await putChunk(alice, uploadId, 0, truncated, sha256(truncated));
    expect(shortChunk.statusCode).toBe(400);

    const noHeader = await putChunk(alice, uploadId, 0, chunk);
    expect(noHeader.statusCode).toBe(400);

    const outOfRange = await putChunk(alice, uploadId, 5, chunk, sha256(chunk));
    expect(outOfRange.statusCode).toBe(400);

    const good = await putChunk(alice, uploadId, 0, chunk, sha256(chunk));
    expect(good.statusCode).toBe(200);

    // Re-sending the same chunk is an idempotent acknowledgement.
    const duplicate = await putChunk(alice, uploadId, 0, chunk, sha256(chunk));
    expect((duplicate.json() as UploadChunkResponse).upload.receivedChunks).toBe(1);

    await putAllChunksFrom(alice, uploadId, fabricated, 1);
    expect((await finalize(alice, uploadId)).statusCode).toBe(200);

    const afterComplete = await putChunk(alice, uploadId, 0, chunk, sha256(chunk));
    expect(afterComplete.statusCode).toBe(409);
  });

  it('rejects a stream whose bytes were altered after manifest creation', async () => {
    const fabricated = fabricate(80_000);
    const created = await createUpload(alice, fabricated.manifest);
    const uploadId = (created.json() as CreateUploadResponse).upload.id;
    const fileId = (created.json() as CreateUploadResponse).file.id;

    const tampered = chunkOf(fabricated, 0);
    tampered[0] = (tampered[0] as number) ^ 0xff;
    const response = await putChunk(alice, uploadId, 0, tampered, sha256(tampered));
    expect(response.statusCode).toBe(200);
    await putAllChunksFrom(alice, uploadId, fabricated, 1);

    const finalized = await finalize(alice, uploadId);
    expect(finalized.statusCode).toBe(422);
    expect(finalized.json()).toMatchObject({ error: { code: 'UPLOAD_INTEGRITY_FAILED' } });

    const job = await ctx.db.query<{ status: string; lastErrorCode: string | null }>(
      'select status, last_error_code as "lastErrorCode" from public.upload_jobs where id = $1',
      [uploadId],
    );
    expect(job.rows[0]).toMatchObject({
      status: 'failed',
      lastErrorCode: 'UPLOAD_INTEGRITY_FAILED',
    });
    expect(existsSync(stagingPath(alice, uploadId))).toBe(false);

    const versions = await ctx.db.query(
      'select 1 as present from public.file_versions where user_id = $1 and file_id = $2',
      [alice.id, fileId],
    );
    expect(versions.rows).toHaveLength(0);

    const file = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/files/${fileId}`,
      headers: authHeader(alice),
    });
    expect(file.json()).toMatchObject({ contentStatus: 'pending' });
  });

  it('isolates uploads, versions and downloads per owner', async () => {
    const fabricated = fabricate(40_000);
    const created = await createUpload(alice, fabricated.manifest);
    const uploadId = (created.json() as CreateUploadResponse).upload.id;

    expect(
      (
        await ctx.app.inject({
          method: 'GET',
          url: `/api/v1/uploads/${uploadId}`,
          headers: authHeader(bob),
        })
      ).statusCode,
    ).toBe(404);

    const bobChunk = await putChunk(bob, uploadId, 0, chunkOf(fabricated, 0), sha256(chunkOf(fabricated, 0)));
    expect(bobChunk.statusCode).toBe(404);

    expect((await finalize(bob, uploadId)).statusCode).toBe(404);
    expect((await cancel(bob, uploadId)).statusCode).toBe(404);

    await putAllChunksFrom(alice, uploadId, fabricated, 0);
    const finalized = finalize(alice, uploadId);
    const result = (await finalized).json() as FinalizeUploadResponse;

    const bobVersions = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/files/${result.file.id}/versions`,
      headers: authHeader(bob),
    });
    expect(bobVersions.statusCode).toBe(404);

    const bobDownload = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/files/${result.file.id}/versions/${result.version.id}/download`,
      headers: authHeader(bob),
    });
    expect(bobDownload.statusCode).toBe(404);
  });

  it('cancels an in-flight upload and cleans up its placeholder', async () => {
    const fabricated = fabricate(30_000);
    const created = await createUpload(alice, fabricated.manifest);
    const { upload, file } = created.json() as CreateUploadResponse;

    const cancelled = await cancel(alice, upload.id);
    expect(cancelled.statusCode).toBe(200);
    expect((cancelled.json() as { upload: UploadJob }).upload.status).toBe('cancelled');
    expect(existsSync(stagingPath(alice, upload.id))).toBe(false);

    const fileAfter = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/files/${file.id}`,
      headers: authHeader(alice),
    });
    expect(fileAfter.statusCode).toBe(404);

    // Cancelling again is idempotent, but chunks are refused.
    expect((await cancel(alice, upload.id)).statusCode).toBe(200);
    const chunk = chunkOf(fabricated, 0);
    expect((await putChunk(alice, upload.id, 0, chunk, sha256(chunk))).statusCode).toBe(409);
  });

  it('handles a zero-byte file as one empty FINAL chunk', async () => {
    const fabricated = fabricate(0);
    expect(fabricated.manifest.chunking.totalChunks).toBe(1);
    expect(fabricated.ciphertext.length).toBe(41);

    const created = await createUpload(alice, fabricated.manifest, { name: 'empty.bin' });
    const { upload, file } = created.json() as CreateUploadResponse;
    await putAllChunksFrom(alice, upload.id, fabricated, 0);

    const finalized = await finalize(alice, upload.id);
    expect(finalized.statusCode).toBe(200);
    const result = finalized.json() as FinalizeUploadResponse;
    expect(result.version.sizeBytes).toBe(0);

    const download = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/files/${file.id}/versions/${result.version.id}/download`,
      headers: authHeader(alice),
    });
    expect(Buffer.from(download.rawPayload).equals(fabricated.ciphertext)).toBe(true);
  });

  it('rejects manifests that are internally inconsistent', async () => {
    const fabricated = fabricate(50_000);
    fabricated.manifest.chunking.totalChunks += 1;
    const response = await createUpload(alice, fabricated.manifest);
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });

    const other = fabricate(50_000);
    other.manifest.ciphertextSize += 1;
    expect((await createUpload(alice, other.manifest)).statusCode).toBe(400);
  });
});

/** Uploads chunks from `start` (0-based) to the end. */
async function putAllChunksFrom(
  session: DevSession,
  uploadId: string,
  fabricated: Fabricated,
  start: number,
): Promise<void> {
  for (let n = start; n < fabricated.manifest.chunking.totalChunks; n += 1) {
    const chunk = chunkOf(fabricated, n);
    const response = await putChunk(session, uploadId, n, chunk, sha256(chunk));
    expect(response.statusCode).toBe(200);
  }
}

describe('upload quotas', () => {
  let smallCtx: TestContext;
  let dave: DevSession;

  beforeAll(async () => {
    smallCtx = await createTestContext(
      testConfig({ MAX_ACTIVE_UPLOADS: '2', MAX_UPLOAD_BYTES: '1048576' }),
    );
    dave = await signIn(smallCtx.app, 'uploads-dave@example.com');
  });

  afterAll(async () => {
    await smallCtx.close();
  });

  it('enforces the active-upload quota and the size cap', async () => {
    const create = (manifest: EncryptionManifest) =>
      smallCtx.app.inject({
        method: 'POST',
        url: '/api/v1/uploads',
        headers: authHeader(dave),
        payload: {
          idempotencyKey: `key-${randomUUID()}`,
          name: 'quota.bin',
          mimeType: 'application/octet-stream',
          manifest,
        },
      });

    expect((await create(fabricate(1_000).manifest)).statusCode).toBe(200);
    expect((await create(fabricate(1_000).manifest)).statusCode).toBe(200);

    const overQuota = await create(fabricate(1_000).manifest);
    expect(overQuota.statusCode).toBe(409);
    expect(overQuota.json()).toMatchObject({ error: { code: 'UPLOAD_STATE_CONFLICT' } });

    const tooLarge = fabricate(2 * 1024 * 1024);
    const rejected = await create(tooLarge.manifest);
    expect(rejected.statusCode).toBe(413);
    expect(rejected.json()).toMatchObject({ error: { code: 'FILE_TOO_LARGE' } });
  });
});
