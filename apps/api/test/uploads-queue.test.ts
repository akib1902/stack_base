import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ciphertextSizeFor,
  totalChunksFor,
  type UploadJob,
  type UploadManifest,
} from '@stackbase/contracts';
import {
  authHeader,
  createTestContext,
  signIn,
  testConfig,
  type DevSession,
  type TestContext,
} from './helpers';

/**
 * Milestone 4 queue semantics (A5.4/A5.5): the durable job list that restores
 * a refreshed browser, the pause/resume/retry state machine, and the stale-job
 * sweep that turns an interrupted transfer into an explicit, actionable state.
 */

const CHUNK_SIZE = 64 * 1024;
const PLAINTEXT_SIZE = 150_000;

const manifest = (): UploadManifest => ({
  format: 'stackbase-file',
  version: 1,
  cipher: 'xchacha20poly1305-secretstream',
  chunking: {
    plaintextChunkSize: CHUNK_SIZE,
    totalChunks: totalChunksFor(PLAINTEXT_SIZE, CHUNK_SIZE),
  },
  plaintextSize: PLAINTEXT_SIZE,
  ciphertextSize: ciphertextSizeFor(PLAINTEXT_SIZE, CHUNK_SIZE),
  streamHeader: Buffer.alloc(24, 5).toString('base64'),
  wrappedKey: {
    algorithm: 'xsalsa20poly1305',
    nonce: Buffer.alloc(24, 6).toString('base64'),
    ciphertext: Buffer.alloc(48, 7).toString('base64'),
  },
});

let ctx: TestContext;
let alice: DevSession;
let bob: DevSession;

beforeAll(async () => {
  ctx = await createTestContext(testConfig({ MAX_ACTIVE_UPLOADS: '30' }));
  alice = await signIn(ctx.app, 'queue-alice@example.com');
  bob = await signIn(ctx.app, 'queue-bob@example.com');
});

afterAll(async () => {
  await ctx.close();
});

const createUpload = (session: DevSession, extra: Record<string, unknown> = {}) =>
  ctx.app.inject({
    method: 'POST',
    url: '/api/v1/uploads',
    headers: authHeader(session),
    payload: {
      idempotencyKey: `key-${randomUUID()}`,
      name: 'report.pdf',
      mimeType: 'application/pdf',
      manifest: manifest(),
      ...extra,
    },
  });

const pause = (session: DevSession, uploadId: string) =>
  ctx.app.inject({
    method: 'POST',
    url: `/api/v1/uploads/${uploadId}/pause`,
    headers: authHeader(session),
  });

const resume = (session: DevSession, uploadId: string) =>
  ctx.app.inject({
    method: 'POST',
    url: `/api/v1/uploads/${uploadId}/resume`,
    headers: authHeader(session),
  });

const retry = (session: DevSession, uploadId: string) =>
  ctx.app.inject({
    method: 'POST',
    url: `/api/v1/uploads/${uploadId}/retry`,
    headers: authHeader(session),
  });

const list = (session: DevSession) =>
  ctx.app.inject({ method: 'GET', url: '/api/v1/uploads', headers: authHeader(session) });

const putFirstChunk = (session: DevSession, uploadId: string) => {
  const body = Buffer.alloc(CHUNK_SIZE + 17, 3);
  return ctx.app.inject({
    method: 'PUT',
    url: `/api/v1/uploads/${uploadId}/chunks/0`,
    headers: {
      ...authHeader(session),
      'content-type': 'application/octet-stream',
      'x-chunk-checksum': createHash('sha256').update(body).digest('hex'),
    },
    payload: body,
  });
};

describe('GET /api/v1/uploads (queue restore)', () => {
  it('lists unfinished jobs with everything a refreshed queue needs', async () => {
    const created = await createUpload(alice);
    expect(created.statusCode).toBe(200);
    const uploadId = created.json().upload.id;
    await putFirstChunk(alice, uploadId);

    const response = await list(alice);
    expect(response.statusCode).toBe(200);
    const { items } = response.json() as { items: UploadJob[] };
    const job = items.find((entry) => entry.id === uploadId);
    expect(job).toBeDefined();
    // The restore hands back the replay key, the file name and the fingerprint
    // so the client can relabel the row and verify a reselected file.
    expect(job!.idempotencyKey).toMatch(/^key-/);
    expect(job!.fileName).toBe('report.pdf');
    expect(job!.receivedChunkNumbers).toEqual([0]);
    expect(job!.receivedChunks).toBe(1);
    expect(job!.sourceFingerprint).toBeNull();
  });

  it('never exposes another account’s jobs', async () => {
    const created = await createUpload(alice);
    const uploadId = created.json().upload.id;

    const response = await list(bob);
    expect(response.statusCode).toBe(200);
    const { items } = response.json() as { items: UploadJob[] };
    expect(items.some((entry) => entry.id === uploadId)).toBe(false);
  });

  it('excludes cancelled jobs', async () => {
    const created = await createUpload(alice);
    const uploadId = created.json().upload.id;
    await ctx.app.inject({
      method: 'POST',
      url: `/api/v1/uploads/${uploadId}/cancel`,
      headers: authHeader(alice),
    });

    const { items } = (await list(alice)).json() as { items: UploadJob[] };
    expect(items.some((entry) => entry.id === uploadId)).toBe(false);
  });
});

describe('pause / resume / retry', () => {
  it('pause stops chunk intake and resume opens it again', async () => {
    const created = await createUpload(alice);
    const uploadId = created.json().upload.id;

    const paused = await pause(alice, uploadId);
    expect(paused.statusCode).toBe(200);
    expect((paused.json() as { upload: UploadJob }).upload.status).toBe('paused');

    // Paused means paused: a chunk PUT must be rejected, not silently staged.
    const rejected = await putFirstChunk(alice, uploadId);
    expect(rejected.statusCode).toBe(409);

    const resumed = await resume(alice, uploadId);
    expect(resumed.statusCode).toBe(200);
    expect((resumed.json() as { upload: UploadJob }).upload.status).toBe('retrying');

    const accepted = await putFirstChunk(alice, uploadId);
    expect(accepted.statusCode).toBe(200);
  });

  it('retry flips a failed job back into an open state and counts the attempt', async () => {
    const created = await createUpload(alice);
    const uploadId = created.json().upload.id;
    await ctx.db.query(
      `update public.upload_jobs set status = 'failed', last_error_code = 'UPLOAD_INTEGRITY_FAILED'
        where user_id = $1 and id = $2`,
      [alice.id, uploadId],
    );

    const retried = await retry(alice, uploadId);
    expect(retried.statusCode).toBe(200);
    const job = (retried.json() as { upload: UploadJob }).upload;
    expect(job.status).toBe('retrying');
    expect(job.retryCount).toBe(1);

    const accepted = await putFirstChunk(alice, uploadId);
    expect(accepted.statusCode).toBe(200);
  });

  it('retry on an already-open job is a no-op', async () => {
    const created = await createUpload(alice);
    const uploadId = created.json().upload.id;
    await pause(alice, uploadId);
    await ctx.db.query(
      `update public.upload_jobs set status = 'queued' where user_id = $1 and id = $2`,
      [alice.id, uploadId],
    );

    const response = await retry(alice, uploadId);
    // "queued" is already open — retry is a no-op rather than an error.
    expect(response.statusCode).toBe(200);
    expect((response.json() as { upload: UploadJob }).upload.status).toBe('queued');
  });

  it('unknown ids 404 for every action', async () => {
    const missing = randomUUID();
    for (const call of [pause, resume, retry]) {
      const response = await call(alice, missing);
      expect(response.statusCode).toBe(404);
    }
  });
});

describe('stale-job sweep', () => {
  const backdate = async (uploadId: string, ageMinutes: number): Promise<void> => {
    await ctx.db.query(
      'alter table public.upload_jobs disable trigger upload_jobs_set_updated_at',
    );
    await ctx.db.query(
      `update public.upload_jobs
          set updated_at = now() - ($2 || ' minutes')::interval
        where user_id = $1 and id = $3`,
      [alice.id, String(ageMinutes), uploadId],
    );
    await ctx.db.query(
      'alter table public.upload_jobs enable trigger upload_jobs_set_updated_at',
    );
  };

  const jobFromList = async (uploadId: string): Promise<UploadJob | undefined> => {
    const { items } = (await list(alice)).json() as { items: UploadJob[] };
    return items.find((entry) => entry.id === uploadId);
  };

  it('an untouched transferring job becomes needs_source_file', async () => {
    const created = await createUpload(alice);
    const uploadId = created.json().upload.id;
    await putFirstChunk(alice, uploadId);
    await backdate(uploadId, 5);

    const job = await jobFromList(uploadId);
    expect(job?.status).toBe('needs_source_file');
    expect(job?.lastErrorCode).toBe('UPLOAD_SOURCE_REQUIRED');
    // The chunks that already arrived survive the sweep — resume continues.
    expect(job?.receivedChunkNumbers).toEqual([0]);
  });

  it('a paused job is never swept', async () => {
    const created = await createUpload(alice);
    const uploadId = created.json().upload.id;
    await pause(alice, uploadId);
    await backdate(uploadId, 30);

    const job = await jobFromList(uploadId);
    expect(job?.status).toBe('paused');
  });

  it('a stalled finalizing job is parked for reconciliation, not resumed', async () => {
    const created = await createUpload(alice);
    const uploadId = created.json().upload.id;
    await ctx.db.query(
      `update public.upload_jobs set status = 'finalizing' where user_id = $1 and id = $2`,
      [alice.id, uploadId],
    );
    await backdate(uploadId, 20);

    const job = await jobFromList(uploadId);
    expect(job?.status).toBe('reconciliation_required');
    expect(job?.lastErrorCode).toBe('STORAGE_RECONCILIATION_REQUIRED');
  });

  it('a recently touched job is left alone', async () => {
    const created = await createUpload(alice);
    const uploadId = created.json().upload.id;
    await putFirstChunk(alice, uploadId);

    const job = await jobFromList(uploadId);
    expect(job?.status).toBe('transferring');
  });
});

describe('idempotent replay with fingerprints', () => {
  it('accepts a replay with the same fingerprint and rejects a different one', async () => {
    const key = `key-${randomUUID()}`;
    const fingerprint = 'a'.repeat(64);
    const other = 'b'.repeat(64);

    const first = await createUpload(alice, {
      idempotencyKey: key,
      sourceFingerprint: fingerprint,
    });
    expect(first.statusCode).toBe(200);
    const uploadId = first.json().upload.id;
    expect(first.json().upload.sourceFingerprint).toBe(fingerprint);

    const same = await createUpload(alice, {
      idempotencyKey: key,
      sourceFingerprint: fingerprint,
    });
    expect(same.statusCode).toBe(200);
    expect(same.json().upload.id).toBe(uploadId);

    // A different file's fingerprint must never attach to this half-finished job.
    const different = await createUpload(alice, {
      idempotencyKey: key,
      sourceFingerprint: other,
    });
    expect(different.statusCode).toBe(409);
    expect((different.json() as { error: { code: string } }).error.code).toBe(
      'UPLOAD_STATE_CONFLICT',
    );
  });
});