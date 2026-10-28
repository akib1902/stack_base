import { existsSync } from 'node:fs';
import path from 'node:path';
import type { LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  CreateShareResponse,
  FolderSummary,
  PurgeTrashResponse,
  TrashListResponse,
} from '@stackbase/contracts';
import {
  authHeader,
  createTestContext,
  insertTestFile,
  insertTestVersion,
  signIn,
  testWrappedKey,
  type DevSession,
  type TestContext,
  type TestVersion,
} from './helpers';

let ctx: TestContext;
let alice: DevSession;

beforeAll(async () => {
  ctx = await createTestContext();
  alice = await signIn(ctx.app, 'trash-alice@example.com');
});

afterAll(async () => {
  await ctx.close();
});

const call = (
  method: 'GET' | 'POST' | 'DELETE',
  url: string,
  payload?: object,
): Promise<LightMyRequestResponse> =>
  ctx.app.inject({
    method,
    url,
    headers: authHeader(alice),
    ...(payload === undefined ? {} : { payload }),
  });

async function oldFile(name: string): Promise<{ fileId: string; version: TestVersion }> {
  const fileId = await insertTestFile(ctx.db, alice.id, { name, mimeType: 'text/plain' });
  const version = await insertTestVersion(ctx.db, ctx.objectsDir, alice.id, fileId);
  await ctx.db.query(
    `update public.files set deleted_at = now() - interval '40 days' where id = $1`,
    [fileId],
  );
  return { fileId, version };
}

const objectPath = (version: TestVersion): string =>
  path.join(ctx.objectsDir, alice.id, `${version.storageObjectId}.bin`);

describe('trash retention (FR-09)', () => {
  it('purges expired items when the owner opens Trash, keeping recent ones', async () => {
    const expired = await oldFile('expired.txt');
    expect(existsSync(objectPath(expired.version))).toBe(true);

    const freshId = await insertTestFile(ctx.db, alice.id, {
      name: 'fresh.txt',
      mimeType: 'text/plain',
    });
    await call('DELETE', `/api/v1/files/${freshId}`);

    const trash = await call('GET', '/api/v1/trash');
    expect(trash.statusCode).toBe(200);
    const body = trash.json() as TrashListResponse;
    expect(body.retentionDays).toBe(30);
    expect(body.items.some((item) => item.id === expired.fileId)).toBe(false);
    expect(body.items.some((item) => item.id === freshId)).toBe(true);

    expect(existsSync(objectPath(expired.version))).toBe(false);
    const gone = await ctx.db.query('select 1 from public.files where id = $1', [
      expired.fileId,
    ]);
    expect(gone.rows).toHaveLength(0);
  });

  it('treats a retention of 0 as keep forever until explicitly purged', async () => {
    await ctx.db.query('update public.user_settings set trash_retention_days = 0 where user_id = $1', [
      alice.id,
    ]);
    const kept = await oldFile('kept-forever.txt');

    const trash = await call('GET', '/api/v1/trash');
    expect((trash.json() as TrashListResponse).retentionDays).toBe(0);
    expect((trash.json() as TrashListResponse).items.some((item) => item.id === kept.fileId)).toBe(
      true,
    );

    const sweep = await call('POST', '/api/v1/trash/purge');
    expect(sweep.statusCode).toBe(200);
    expect(sweep.json()).toMatchObject({ purged: 0, skipped: 0 });
    expect(existsSync(objectPath(kept.version))).toBe(true);

    await ctx.db.query('update public.user_settings set trash_retention_days = 30 where user_id = $1', [
      alice.id,
    ]);
    const removed = await call('DELETE', `/api/v1/trash/files/${kept.fileId}`);
    expect(removed.statusCode).toBe(200);
    expect(existsSync(objectPath(kept.version))).toBe(false);
  });

  it('purges a trashed folder with its versions, shares and ciphertext', async () => {
    const folderResponse = await call('POST', '/api/v1/folders', { name: 'Cabinet' });
    expect(folderResponse.statusCode).toBe(201);
    const folder = folderResponse.json() as FolderSummary;

    const fileId = await insertTestFile(ctx.db, alice.id, {
      name: 'inside.bin',
      folderId: folder.id,
      mimeType: 'application/octet-stream',
    });
    const version = await insertTestVersion(ctx.db, ctx.objectsDir, alice.id, fileId);
    const share = await call('POST', '/api/v1/shares', {
      fileId,
      versionId: version.versionId,
      wrappedKey: testWrappedKey(),
    });
    expect(share.statusCode).toBe(200);
    const token = (share.json() as CreateShareResponse).token;

    const trashed = await call('DELETE', `/api/v1/folders/${folder.id}`);
    expect(trashed.statusCode).toBe(200);

    const purged = await call('DELETE', `/api/v1/trash/folders/${folder.id}`);
    expect(purged.statusCode).toBe(200);
    expect(existsSync(objectPath(version))).toBe(false);

    const rows = await ctx.db.query<{ files: unknown; shares: unknown; folders: unknown }>(
      `select
         (select count(*)::int from public.files where user_id = $1 and folder_id = $2) as files,
         (select count(*)::int from public.shares where user_id = $1 and file_version_id = $3) as shares,
         (select count(*)::int from public.folders where user_id = $1 and id = $2) as folders`,
      [alice.id, folder.id, version.versionId],
    );
    expect(Number(rows.rows[0]?.files)).toBe(0);
    expect(Number(rows.rows[0]?.shares)).toBe(0);
    expect(Number(rows.rows[0]?.folders)).toBe(0);

    const dead = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/public/shares/${token}`,
    });
    expect(dead.statusCode).toBe(404);
  });

  it('reports how many expired entries an explicit purge removed', async () => {
    const first = await oldFile('batch-a.txt');
    const second = await oldFile('batch-b.txt');

    const purge = await call('POST', '/api/v1/trash/purge');
    expect(purge.statusCode).toBe(200);
    const result = purge.json() as PurgeTrashResponse;
    expect(result.purged).toBeGreaterThanOrEqual(2);
    expect(result.skipped).toBe(0);

    for (const file of [first, second]) {
      expect(existsSync(objectPath(file.version))).toBe(false);
    }
    const trash = await call('GET', '/api/v1/trash');
    const remaining = (trash.json() as TrashListResponse).items.map((item) => item.id);
    expect(remaining).not.toContain(first.fileId);
    expect(remaining).not.toContain(second.fileId);
  });
});
