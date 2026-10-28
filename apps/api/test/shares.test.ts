import { existsSync } from 'node:fs';
import path from 'node:path';
import type { LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  AuditListResponse,
  CreateShareResponse,
  PublicShare,
  RevokeShareResponse,
  ShareListResponse,
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
let bob: DevSession;

beforeAll(async () => {
  ctx = await createTestContext();
  alice = await signIn(ctx.app, 'shares-alice@example.com');
  bob = await signIn(ctx.app, 'shares-bob@example.com');
});

afterAll(async () => {
  await ctx.close();
});

const call = (
  session: DevSession,
  method: 'GET' | 'POST' | 'DELETE',
  url: string,
  payload?: object,
): Promise<LightMyRequestResponse> =>
  ctx.app.inject({
    method,
    url,
    headers: authHeader(session),
    ...(payload === undefined ? {} : { payload }),
  });

const createShare = (
  session: DevSession,
  fileId: string,
  versionId: string,
  extra: Record<string, unknown> = {},
) =>
  call(session, 'POST', '/api/v1/shares', {
    fileId,
    versionId,
    wrappedKey: testWrappedKey(),
    ...extra,
  });

const publicGet = (token: string, suffix = '') =>
  ctx.app.inject({ method: 'GET', url: `/api/v1/public/shares/${token}${suffix}` });

interface Fixture {
  fileId: string;
  version: TestVersion;
}

async function createFixture(name: string, session = alice): Promise<Fixture> {
  const fileId = await insertTestFile(ctx.db, session.id, {
    name,
    mimeType: 'application/octet-stream',
  });
  const version = await insertTestVersion(ctx.db, ctx.objectsDir, session.id, fileId);
  return { fileId, version };
}

describe('share links (FR-12)', () => {
  it('creates a share without storing the raw token and lists it for the owner only', async () => {
    const { fileId, version } = await createFixture('shared.bin');
    const expiresAt = new Date(Date.now() + 86_400_000).toISOString();

    const response = await createShare(alice, fileId, version.versionId, {
      expiresAt,
      maxDownloads: 2,
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as CreateShareResponse;
    expect(body.token).toHaveLength(43);
    expect(body.share).toMatchObject({
      fileId,
      versionId: version.versionId,
      versionNumber: 1,
      fileName: 'shared.bin',
      status: 'active',
      maxDownloads: 2,
      downloadCount: 0,
      permission: 'read',
    });

    const stored = await ctx.db.query<{ tokenHash: string }>(
      'select token_hash as "tokenHash" from public.shares where id = $1',
      [body.share.id],
    );
    expect(stored.rows[0]?.tokenHash).not.toBe(body.token);
    expect(stored.rows[0]?.tokenHash).toHaveLength(64);

    const listed = await call(alice, 'GET', '/api/v1/shares');
    expect((listed.json() as ShareListResponse).items.map((item) => item.id)).toContain(
      body.share.id,
    );
    const bobList = await call(bob, 'GET', '/api/v1/shares');
    expect((bobList.json() as ShareListResponse).items).toHaveLength(0);

    // Cleanup so later assertions about counts stay local.
    await call(alice, 'POST', `/api/v1/shares/${body.share.id}/revoke`);
  });

  it('serves metadata and ciphertext publicly, enforcing the download limit atomically', async () => {
    const { fileId, version } = await createFixture('limited.bin');
    const created = await createShare(alice, fileId, version.versionId, { maxDownloads: 2 });
    const { token, share } = created.json() as CreateShareResponse;

    const metadata = await publicGet(token);
    expect(metadata.statusCode).toBe(200);
    const view = metadata.json() as PublicShare;
    expect(view.fileName).toBe('limited.bin');
    expect(view.versionNumber).toBe(1);
    expect(view.wrappedKey).toEqual(testWrappedKey());
    expect(view.manifest.ciphertextHash).toBe(version.manifest.ciphertextHash);
    expect(view.remainingDownloads).toBe(2);

    const first = await publicGet(token, '/download');
    expect(first.statusCode).toBe(200);
    expect(Buffer.compare(first.rawPayload, version.ciphertext)).toBe(0);
    expect(first.headers['x-stackbase-ciphertext-hash']).toBe(version.manifest.ciphertextHash);

    const afterFirst = (await publicGet(token)).json() as PublicShare;
    expect(afterFirst.downloadCount).toBe(1);
    expect(afterFirst.remainingDownloads).toBe(1);

    const second = await publicGet(token, '/download');
    expect(second.statusCode).toBe(200);

    const exhausted = await publicGet(token);
    expect(exhausted.statusCode).toBe(410);
    expect(exhausted.json()).toMatchObject({
      error: { code: 'SHARE_DOWNLOAD_LIMIT_REACHED' },
    });

    const denied = await publicGet(token, '/download');
    expect(denied.statusCode).toBe(410);
    expect(denied.json()).toMatchObject({ error: { code: 'SHARE_DOWNLOAD_LIMIT_REACHED' } });

    const audit = await call(alice, 'GET', '/api/v1/audit?limit=100');
    const events = (audit.json() as AuditListResponse).items.filter(
      (event) => event.resourceId === share.id,
    );
    expect(events.some((event) => event.eventType === 'share.download' && event.result === 'success'))
      .toBe(true);
    expect(events.some((event) => event.eventType === 'share.download' && event.result === 'denied'))
      .toBe(true);
    // No raw token can ever appear in the trail.
    expect(JSON.stringify(events.map((event) => event.metadata))).not.toContain(token);
  });

  it('revokes, explains expiry and refuses unknown tokens', async () => {
    const { fileId, version } = await createFixture('revoked.bin');
    const created = await createShare(alice, fileId, version.versionId);
    const { token, share } = created.json() as CreateShareResponse;

    const foreign = await call(bob, 'POST', `/api/v1/shares/${share.id}/revoke`);
    expect(foreign.statusCode).toBe(404);

    const revoked = await call(alice, 'POST', `/api/v1/shares/${share.id}/revoke`);
    expect(revoked.statusCode).toBe(200);
    expect((revoked.json() as RevokeShareResponse).share.status).toBe('revoked');

    // Revocation is idempotent and audited once.
    const again = await call(alice, 'POST', `/api/v1/shares/${share.id}/revoke`);
    expect(again.statusCode).toBe(200);

    const blocked = await publicGet(token);
    expect(blocked.statusCode).toBe(410);
    expect(blocked.json()).toMatchObject({ error: { code: 'SHARE_REVOKED' } });

    const expiredFixture = await createFixture('expired.bin');
    const expired = await createShare(alice, expiredFixture.fileId, expiredFixture.version.versionId);
    const expiredBody = expired.json() as CreateShareResponse;
    await ctx.db.query(
      `update public.shares
          set created_at = now() - interval '2 days',
              expires_at = now() - interval '1 minute'
        where id = $1`,
      [expiredBody.share.id],
    );
    const expiredResponse = await publicGet(expiredBody.token);
    expect(expiredResponse.statusCode).toBe(410);
    expect(expiredResponse.json()).toMatchObject({ error: { code: 'SHARE_EXPIRED' } });

    const past = await createShare(alice, fileId, version.versionId, {
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(past.statusCode).toBe(400);

    const unknown = await publicGet('a'.repeat(43));
    expect(unknown.statusCode).toBe(404);
    expect(unknown.json()).toMatchObject({ error: { code: 'SHARE_NOT_FOUND' } });
  });

  it('refuses other owners’ versions, trashed files and hides deleted files', async () => {
    const bobFixture = await createFixture('foreign.bin', bob);
    const foreign = await createShare(alice, bobFixture.fileId, bobFixture.version.versionId);
    expect(foreign.statusCode).toBe(404);

    const { fileId, version } = await createFixture('deleted.bin');
    const created = await createShare(alice, fileId, version.versionId);
    const { token } = created.json() as CreateShareResponse;

    await call(alice, 'DELETE', `/api/v1/files/${fileId}`);
    const unavailable = await publicGet(token);
    expect(unavailable.statusCode).toBe(410);
    expect(unavailable.json()).toMatchObject({ error: { code: 'SHARE_FILE_UNAVAILABLE' } });

    const trashedCreate = await createShare(alice, fileId, version.versionId);
    expect(trashedCreate.statusCode).toBe(404);
  });

  it('permanent deletion removes shares, versions, rows and provider ciphertext', async () => {
    const { fileId, version } = await createFixture('purge-shared.bin');
    const created = await createShare(alice, fileId, version.versionId);
    const { token } = created.json() as CreateShareResponse;

    const objectPath = path.join(ctx.objectsDir, alice.id, `${version.storageObjectId}.bin`);
    expect(existsSync(objectPath)).toBe(true);

    await call(alice, 'DELETE', `/api/v1/files/${fileId}`);
    const purged = await call(alice, 'DELETE', `/api/v1/trash/files/${fileId}`);
    expect(purged.statusCode).toBe(200);

    expect(existsSync(objectPath)).toBe(false);
    const rows = await ctx.db.query<{ shares: unknown; versions: unknown; objects: unknown }>(
      `select
         (select count(*)::int from public.shares where user_id = $1 and file_version_id = $2) as shares,
         (select count(*)::int from public.file_versions where user_id = $1 and file_id = $3) as versions,
         (select count(*)::int from public.storage_objects where user_id = $1 and id = $4) as objects`,
      [alice.id, version.versionId, fileId, version.storageObjectId],
    );
    expect(Number(rows.rows[0]?.shares)).toBe(0);
    expect(Number(rows.rows[0]?.versions)).toBe(0);
    expect(Number(rows.rows[0]?.objects)).toBe(0);

    const gone = await publicGet(token);
    expect(gone.statusCode).toBe(404);
  });
});
