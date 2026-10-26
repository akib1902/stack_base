import type { LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  FileListResponse,
  FolderListResponse,
  FolderSummary,
  TrashListResponse,
} from '@stackbase/contracts';
import {
  authHeader,
  createTestContext,
  insertTestFile,
  signIn,
  type DevSession,
  type TestContext,
} from './helpers';

let ctx: TestContext;
let alice: DevSession;
let bob: DevSession;
let projectsId: string;
let designsId: string;
let fileId: string;

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

const call = (
  session: DevSession,
  method: Method,
  url: string,
  payload?: object,
): Promise<LightMyRequestResponse> =>
  ctx.app.inject({
    method,
    url,
    headers: authHeader(session),
    ...(payload === undefined ? {} : { payload }),
  });

const folders = async (session: DevSession): Promise<FolderListResponse> => {
  const response = await call(session, 'GET', '/api/v1/folders');
  expect(response.statusCode).toBe(200);
  return response.json() as FolderListResponse;
};

beforeAll(async () => {
  ctx = await createTestContext();
  alice = await signIn(ctx.app, 'folders-alice@example.com');
  bob = await signIn(ctx.app, 'folders-bob@example.com');

  const projects = await call(alice, 'POST', '/api/v1/folders', { name: 'Projects' });
  expect(projects.statusCode).toBe(201);
  projectsId = (projects.json() as FolderSummary).id;

  const designs = await call(alice, 'POST', '/api/v1/folders', {
    name: 'Designs',
    parentFolderId: projectsId,
  });
  expect(designs.statusCode).toBe(201);
  designsId = (designs.json() as FolderSummary).id;

  fileId = await insertTestFile(ctx.db, alice.id, {
    name: 'wireframe.png',
    mimeType: 'image/png',
    sizeBytes: 300,
    folderId: designsId,
  });
});

afterAll(async () => {
  await ctx.close();
});

describe('folder tree', () => {
  it('creates nested folders and reports real child counts', async () => {
    const body = await folders(alice);
    expect(body.items).toHaveLength(2);

    const projects = body.items.find((folder) => folder.id === projectsId);
    const designs = body.items.find((folder) => folder.id === designsId);

    expect(projects).toMatchObject({ name: 'Projects', parentFolderId: null, folderCount: 1 });
    expect(designs).toMatchObject({
      name: 'Designs',
      parentFolderId: projectsId,
      fileCount: 1,
      folderCount: 0,
    });
  });

  it('renames a folder and rejects path separators in names', async () => {
    const renamed = await call(alice, 'PATCH', `/api/v1/folders/${designsId}`, {
      name: 'Artwork',
    });
    expect(renamed.statusCode).toBe(200);
    expect((renamed.json() as FolderSummary).name).toBe('Artwork');

    const invalid = await call(alice, 'POST', '/api/v1/folders', { name: 'a/b' });
    expect(invalid.statusCode).toBe(400);
  });

  it('moves a folder to the root and back', async () => {
    const toRoot = await call(alice, 'PATCH', `/api/v1/folders/${designsId}`, {
      parentFolderId: null,
    });
    expect(toRoot.statusCode).toBe(200);
    expect((toRoot.json() as FolderSummary).parentFolderId).toBeNull();

    const back = await call(alice, 'PATCH', `/api/v1/folders/${designsId}`, {
      parentFolderId: projectsId,
    });
    expect(back.statusCode).toBe(200);
  });

  it('refuses to move a folder inside its own descendant', async () => {
    const response = await call(alice, 'PATCH', `/api/v1/folders/${projectsId}`, {
      parentFolderId: designsId,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });

    const body = await folders(alice);
    expect(body.items.find((folder) => folder.id === projectsId)?.parentFolderId).toBeNull();
  });

  it('cannot touch another account’s folder', async () => {
    const patch = await call(bob, 'PATCH', `/api/v1/folders/${designsId}`, {
      name: 'Stolen',
    });
    expect(patch.statusCode).toBe(404);

    const create = await call(bob, 'POST', '/api/v1/folders', {
      name: 'Nested in Alice',
      parentFolderId: projectsId,
    });
    expect(create.statusCode).toBe(404);
  });
});

describe('folder trash', () => {
  it('trashes the whole subtree and lists only the top-level folder', async () => {
    const trashed = await call(alice, 'DELETE', `/api/v1/folders/${projectsId}`);
    expect(trashed.statusCode).toBe(200);
    expect((trashed.json() as { affected: number }).affected).toBe(3);

    const files = await call(alice, 'GET', '/api/v1/files');
    expect((files.json() as FileListResponse).items).toHaveLength(0);

    const trash = await call(alice, 'GET', '/api/v1/trash');
    const body = trash.json() as TrashListResponse;
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({ kind: 'folder', id: projectsId, name: 'Projects' });
  });

  it('refuses to restore a child while its parent is still trashed', async () => {
    const response = await call(alice, 'POST', `/api/v1/trash/folders/${designsId}/restore`);
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('restores the folder, its descendants and its files together', async () => {
    const restored = await call(alice, 'POST', `/api/v1/trash/folders/${projectsId}/restore`);
    expect(restored.statusCode).toBe(200);

    const body = await folders(alice);
    expect(body.items.map((folder) => folder.name).sort()).toEqual(['Artwork', 'Projects']);

    const files = await call(alice, 'GET', '/api/v1/files');
    expect((files.json() as FileListResponse).items.map((file) => file.id)).toEqual([fileId]);

    const trash = await call(alice, 'GET', '/api/v1/trash');
    expect((trash.json() as TrashListResponse).items).toHaveLength(0);
  });

  it('permanently deletes a trashed folder and its contents', async () => {
    await call(alice, 'DELETE', `/api/v1/folders/${projectsId}`);
    const purged = await call(alice, 'DELETE', `/api/v1/trash/folders/${projectsId}`);
    expect(purged.statusCode).toBe(200);

    const body = await folders(alice);
    expect(body.items).toHaveLength(0);

    const detail = await call(alice, 'GET', `/api/v1/files/${fileId}`);
    expect(detail.statusCode).toBe(404);

    const trash = await call(alice, 'GET', '/api/v1/trash');
    expect((trash.json() as TrashListResponse).items).toHaveLength(0);
  });
});
