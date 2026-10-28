import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  AuditListResponse,
  FileSummary,
  FileVersionListResponse,
  RestoreVersionResponse,
} from '@stackbase/contracts';
import {
  authHeader,
  createTestContext,
  insertTestFile,
  insertTestVersion,
  signIn,
  type DevSession,
  type TestContext,
} from './helpers';

let ctx: TestContext;
let alice: DevSession;
let bob: DevSession;

beforeAll(async () => {
  ctx = await createTestContext();
  alice = await signIn(ctx.app, 'versions-alice@example.com');
  bob = await signIn(ctx.app, 'versions-bob@example.com');
});

afterAll(async () => {
  await ctx.close();
});

const call = (
  session: DevSession,
  method: 'GET' | 'POST' | 'DELETE',
  url: string,
) => ctx.app.inject({ method, url, headers: authHeader(session) });

describe('version history restore (FR-11)', () => {
  it('appends a new immutable version and moves the current pointer', async () => {
    const firstContent = Buffer.from('the original version');
    const secondContent = Buffer.from('a later revision, longer');
    const fileId = await insertTestFile(ctx.db, alice.id, {
      name: 'versions.txt',
      mimeType: 'text/plain',
    });
    const first = await insertTestVersion(ctx.db, ctx.objectsDir, alice.id, fileId, {
      plaintext: firstContent,
    });
    const second = await insertTestVersion(ctx.db, ctx.objectsDir, alice.id, fileId, {
      plaintext: secondContent,
    });

    const restored = await call(
      alice,
      'POST',
      `/api/v1/files/${fileId}/versions/${first.versionId}/restore`,
    );
    expect(restored.statusCode).toBe(200);
    const body = restored.json() as RestoreVersionResponse;
    expect(body.version.versionNumber).toBe(3);
    expect(body.version.sizeBytes).toBe(firstContent.length);
    expect(body.version.manifest.plaintextFingerprint).toBe(
      first.manifest.plaintextFingerprint,
    );
    expect(body.file.sizeBytes).toBe(firstContent.length);
    expect(body.file.contentStatus).toBe('ready');

    const list = await call(alice, 'GET', `/api/v1/files/${fileId}/versions`);
    expect(list.statusCode).toBe(200);
    const versions = (list.json() as FileVersionListResponse).items;
    expect(versions.map((version) => version.versionNumber)).toEqual([3, 2, 1]);
    // The prior versions still exist untouched (immutability is trigger-enforced).
    expect(versions.find((version) => version.id === second.versionId)?.versionNumber).toBe(2);
    expect(versions.find((version) => version.id === first.versionId)?.versionNumber).toBe(1);

    const pointer = await ctx.db.query<{ currentVersionId: string; restoredFrom: string }>(
      `select f.current_version_id as "currentVersionId",
              v.restored_from_version_id as "restoredFrom"
         from public.files f
         join public.file_versions v on v.user_id = f.user_id and v.id = f.current_version_id
        where f.user_id = $1 and f.id = $2`,
      [alice.id, fileId],
    );
    expect(pointer.rows[0]?.currentVersionId).toBe(body.version.id);
    expect(pointer.rows[0]?.restoredFrom).toBe(first.versionId);

    const file = await call(alice, 'GET', `/api/v1/files/${fileId}`);
    expect((file.json() as FileSummary).sizeBytes).toBe(firstContent.length);
  });

  it('refuses another owner’s version and a trashed file', async () => {
    const bobFile = await insertTestFile(ctx.db, bob.id, {
      name: 'bobs.txt',
      mimeType: 'text/plain',
    });
    const bobVersion = await insertTestVersion(ctx.db, ctx.objectsDir, bob.id, bobFile);

    const foreign = await call(
      alice,
      'POST',
      `/api/v1/files/${bobFile}/versions/${bobVersion.versionId}/restore`,
    );
    expect(foreign.statusCode).toBe(404);
    expect(foreign.json()).toMatchObject({ error: { code: 'VERSION_NOT_FOUND' } });

    const aliceFile = await insertTestFile(ctx.db, alice.id, {
      name: 'trashed.txt',
      mimeType: 'text/plain',
    });
    const aliceVersion = await insertTestVersion(ctx.db, ctx.objectsDir, alice.id, aliceFile);
    await call(alice, 'DELETE', `/api/v1/files/${aliceFile}`);

    const trashed = await call(
      alice,
      'POST',
      `/api/v1/files/${aliceFile}/versions/${aliceVersion.versionId}/restore`,
    );
    expect(trashed.statusCode).toBe(404);
    expect(trashed.json()).toMatchObject({ error: { code: 'VERSION_NOT_FOUND' } });
  });

  it('records a version.restore audit event for the owner only', async () => {
    const fileId = await insertTestFile(ctx.db, alice.id, {
      name: 'audited.txt',
      mimeType: 'text/plain',
    });
    const version = await insertTestVersion(ctx.db, ctx.objectsDir, alice.id, fileId);
    await call(alice, 'POST', `/api/v1/files/${fileId}/versions/${version.versionId}/restore`);

    const audit = await call(alice, 'GET', '/api/v1/audit?limit=100');
    expect(audit.statusCode).toBe(200);
    const events = (audit.json() as AuditListResponse).items;
    const restore = events.find(
      (event) => event.eventType === 'version.restore' && event.resourceId !== null,
    );
    expect(restore).toBeDefined();
    expect(restore?.result).toBe('success');
    expect(restore?.metadata.fileId).toBe(fileId);

    const bobAudit = await call(bob, 'GET', '/api/v1/audit');
    expect((bobAudit.json() as AuditListResponse).items).toHaveLength(0);
  });
});
