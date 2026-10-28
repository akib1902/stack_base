import { existsSync } from 'node:fs';
import path from 'node:path';
import type { LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FileListResponse, FileSummary, MutationResponse, TrashListResponse } from '@stackbase/contracts';
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
let folderId: string;
let tagId: string;
let imageId: string;
let notesId: string;
let apkId: string;
let archiveId: string;
let bobFileId: string;

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

const list = async (session: DevSession, query = ''): Promise<FileListResponse> => {
  const response = await call(session, 'GET', `/api/v1/files${query}`);
  expect(response.statusCode, response.body).toBe(200);
  return response.json() as FileListResponse;
};

beforeAll(async () => {
  ctx = await createTestContext();
  alice = await signIn(ctx.app, 'files-alice@example.com');
  bob = await signIn(ctx.app, 'files-bob@example.com');

  const folder = await call(alice, 'POST', '/api/v1/folders', { name: 'Photos' });
  expect(folder.statusCode).toBe(201);
  folderId = (folder.json() as { id: string }).id;

  const tag = await call(alice, 'POST', '/api/v1/tags', { name: 'Trip', colorToken: 'amber' });
  expect(tag.statusCode).toBe(201);
  tagId = (tag.json() as { id: string }).id;

  imageId = await insertTestFile(ctx.db, alice.id, {
    name: 'sunset.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 2048,
    folderId,
    favorite: true,
    description: 'Golden hour',
  });
  notesId = await insertTestFile(ctx.db, alice.id, {
    name: 'notes.txt',
    mimeType: 'text/plain',
    sizeBytes: 120,
  });
  apkId = await insertTestFile(ctx.db, alice.id, {
    name: 'app-release.apk',
    mimeType: 'application/vnd.android.package-archive',
    sizeBytes: 5000,
  });
  archiveId = await insertTestFile(ctx.db, alice.id, {
    name: 'backup.zip',
    mimeType: 'application/zip',
    sizeBytes: 9000,
  });
  bobFileId = await insertTestFile(ctx.db, bob.id, {
    name: 'bob-notes.txt',
    mimeType: 'text/plain',
    sizeBytes: 1,
  });

  const tagged = await call(alice, 'PUT', `/api/v1/files/${imageId}/tags`, {
    tagIds: [tagId],
  });
  expect(tagged.statusCode).toBe(200);
});

afterAll(async () => {
  await ctx.close();
});

describe('GET /api/v1/files', () => {
  it('returns only the caller’s active files with category, folder and tags', async () => {
    const body = await list(alice);

    expect(body.total).toBe(4);
    expect(body.items).toHaveLength(4);
    expect(body.items.map((file) => file.name).sort()).toEqual(
      ['app-release.apk', 'backup.zip', 'notes.txt', 'sunset.jpg'].sort(),
    );

    const image = body.items.find((file) => file.id === imageId) as FileSummary;
    expect(image).toMatchObject({
      category: 'images',
      sizeBytes: 2048,
      favorite: true,
      folderId,
      folderName: 'Photos',
      contentStatus: 'pending',
    });
    expect(image.tags).toEqual([{ id: tagId, name: 'Trip', colorToken: 'amber' }]);
    expect(image.createdAt).toMatch(/T/);

    expect(body.items.find((file) => file.id === apkId)?.category).toBe('apks');
    expect(body.items.find((file) => file.id === archiveId)?.category).toBe('archives');
    expect(body.items.find((file) => file.id === notesId)?.category).toBe('documents');
  });

  it('never includes another account’s rows', async () => {
    const body = await list(bob);
    expect(body.total).toBe(1);
    expect(body.items[0]?.name).toBe('bob-notes.txt');
  });

  it('sorts by name and size', async () => {
    const byName = await list(alice, '?sort=name_asc');
    expect(byName.items.map((file) => file.name)).toEqual([
      'app-release.apk',
      'backup.zip',
      'notes.txt',
      'sunset.jpg',
    ]);

    const bySize = await list(alice, '?sort=size_desc');
    expect(bySize.items.map((file) => file.sizeBytes)).toEqual([9000, 5000, 2048, 120]);
  });

  it('filters by category, folder, favorite and tag', async () => {
    const documents = await list(alice, '?category=documents');
    expect(documents.items.map((file) => file.name)).toEqual(['notes.txt']);

    const inFolder = await list(alice, `?folderId=${folderId}`);
    expect(inFolder.items.map((file) => file.id)).toEqual([imageId]);

    const atRoot = await list(alice, '?folderId=root');
    expect(atRoot.total).toBe(3);

    const favorites = await list(alice, '?favorite=true');
    expect(favorites.items.map((file) => file.id)).toEqual([imageId]);

    const tagged = await list(alice, `?tagId=${tagId}`);
    expect(tagged.items.map((file) => file.id)).toEqual([imageId]);
  });

  it('searches names and descriptions case-insensitively', async () => {
    const byDescription = await list(alice, '?q=GOLDEN');
    expect(byDescription.items.map((file) => file.id)).toEqual([imageId]);

    const byName = await list(alice, '?q=backup');
    expect(byName.items.map((file) => file.id)).toEqual([archiveId]);

    const none = await list(alice, '?q=does-not-exist');
    expect(none.items).toHaveLength(0);
    expect(none.total).toBe(0);
  });

  it('paginates with a total and a hasMore flag', async () => {
    const first = await list(alice, '?limit=2&offset=0');
    expect(first.items).toHaveLength(2);
    expect(first.total).toBe(4);
    expect(first.hasMore).toBe(true);

    const second = await list(alice, '?limit=2&offset=2');
    expect(second.items).toHaveLength(2);
    expect(second.hasMore).toBe(false);
  });

  it('rejects malformed identifiers with a validation error instead of a database error', async () => {
    const response = await call(alice, 'GET', '/api/v1/files?folderId=not-a-uuid');
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });

    const detail = await call(alice, 'GET', '/api/v1/files/not-a-uuid');
    expect(detail.statusCode).toBe(400);
  });

  it('requires authentication', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/v1/files' });
    expect(response.statusCode).toBe(401);
  });

  it('hides another account’s file by id', async () => {
    const response = await call(alice, 'GET', `/api/v1/files/${bobFileId}`);
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: { code: 'FILE_NOT_FOUND' } });
  });
});

describe('PATCH /api/v1/files/:fileId', () => {
  it('renames a file and recomputes its extension', async () => {
    const response = await call(alice, 'PATCH', `/api/v1/files/${imageId}`, {
      name: 'sunset-beach.png',
    });

    expect(response.statusCode).toBe(200);
    const file = response.json() as FileSummary;
    expect(file.name).toBe('sunset-beach.png');
    expect(file.extension).toBe('png');
    expect(file.mimeType).toBe('image/jpeg');
  });

  it('moves, favorites and describes a file', async () => {
    const moved = await call(alice, 'PATCH', `/api/v1/files/${imageId}`, {
      folderId: null,
      favorite: false,
      description: '  Edited description  ',
    });

    expect(moved.statusCode, moved.body).toBe(200);
    expect(moved.json()).toMatchObject({
      folderId: null,
      folderName: null,
      favorite: false,
      description: 'Edited description',
    });

    const restored = await call(alice, 'PATCH', `/api/v1/files/${imageId}`, {
      folderId,
      favorite: true,
      description: null,
    });
    expect(restored.statusCode).toBe(200);
    expect(restored.json()).toMatchObject({ folderId, folderName: 'Photos', description: null });
  });

  it('refuses an empty update and malformed names', async () => {
    const empty = await call(alice, 'PATCH', `/api/v1/files/${notesId}`, {});
    expect(empty.statusCode).toBe(400);

    const slash = await call(alice, 'PATCH', `/api/v1/files/${notesId}`, {
      name: '../escape.txt',
    });
    expect(slash.statusCode).toBe(400);
  });

  it('cannot modify another account’s file', async () => {
    const response = await call(alice, 'PATCH', `/api/v1/files/${bobFileId}`, {
      favorite: true,
    });
    expect(response.statusCode).toBe(404);

    const stored = await ctx.db.query<{ favorite: boolean }>(
      'select favorite from public.files where id = $1',
      [bobFileId],
    );
    expect(stored.rows[0]?.favorite).toBe(false);
  });

  it('rejects a folder that belongs to someone else', async () => {
    const bobFolder = await call(bob, 'POST', '/api/v1/folders', { name: 'Bob photos' });
    const bobFolderId = (bobFolder.json() as { id: string }).id;

    const response = await call(alice, 'PATCH', `/api/v1/files/${notesId}`, {
      folderId: bobFolderId,
    });
    expect(response.statusCode).toBe(404);
  });
});

describe('file tags', () => {
  it('replaces the tag set atomically', async () => {
    const second = await call(alice, 'POST', '/api/v1/tags', { name: 'Archive', colorToken: 'slate' });
    const secondTagId = (second.json() as { id: string }).id;

    const replaced = await call(alice, 'PUT', `/api/v1/files/${imageId}/tags`, {
      tagIds: [secondTagId],
    });
    expect(replaced.statusCode).toBe(200);
    expect((replaced.json() as FileSummary).tags.map((tag) => tag.name)).toEqual(['Archive']);

    const restored = await call(alice, 'PUT', `/api/v1/files/${imageId}/tags`, {
      tagIds: [tagId, secondTagId],
    });
    expect((restored.json() as FileSummary).tags.map((tag) => tag.name)).toEqual([
      'Archive',
      'Trip',
    ]);
  });

  it('rejects tags from another account without changing the current set', async () => {
    const bobTag = await call(bob, 'POST', '/api/v1/tags', { name: 'Bob tag' });
    const bobTagId = (bobTag.json() as { id: string }).id;

    const response = await call(alice, 'PUT', `/api/v1/files/${imageId}/tags`, {
      tagIds: [bobTagId],
    });
    expect(response.statusCode).toBe(400);

    const current = await call(alice, 'GET', `/api/v1/files/${imageId}`);
    expect((current.json() as FileSummary).tags.map((tag) => tag.name).sort()).toEqual([
      'Archive',
      'Trip',
    ]);
  });
});

describe('POST /api/v1/files/bulk', () => {
  it('moves, favorites and tags in bulk', async () => {
    const ids = [imageId, notesId, apkId];

    const favorite = await call(alice, 'POST', '/api/v1/files/bulk', {
      action: 'favorite',
      fileIds: ids,
    });
    expect(favorite.statusCode).toBe(200);
    expect((favorite.json() as MutationResponse).affected).toBe(3);

    const tagged = await call(alice, 'POST', '/api/v1/files/bulk', {
      action: 'tag',
      fileIds: ids,
      tagId,
    });
    expect(tagged.statusCode).toBe(200);

    const moved = await call(alice, 'POST', '/api/v1/files/bulk', {
      action: 'move',
      fileIds: ids,
      folderId,
    });
    expect(moved.statusCode).toBe(200);

    const body = await list(alice, `?folderId=${folderId}`);
    expect(body.total).toBe(3);
    expect(body.items.every((file) => file.tags.some((tag) => tag.id === tagId))).toBe(true);
  });

  it('is all-or-nothing when one id is not owned by the caller', async () => {
    const favorite = await call(alice, 'POST', '/api/v1/files/bulk', {
      action: 'unfavorite',
      fileIds: [notesId, bobFileId],
    });
    expect(favorite.statusCode).toBe(404);

    const check = await call(alice, 'GET', `/api/v1/files/${notesId}`);
    expect((check.json() as FileSummary).favorite).toBe(true);
  });

  it('requires a destination folder for move', async () => {
    const response = await call(alice, 'POST', '/api/v1/files/bulk', {
      action: 'move',
      fileIds: [notesId],
    });
    expect(response.statusCode).toBe(400);
  });
});

describe('trash lifecycle for files', () => {
  it('soft-deletes, lists in trash and restores', async () => {
    const trashed = await call(alice, 'DELETE', `/api/v1/files/${notesId}`);
    expect(trashed.statusCode).toBe(200);

    const active = await list(alice);
    expect(active.items.some((file) => file.id === notesId)).toBe(false);

    const trash = await call(alice, 'GET', '/api/v1/trash');
    expect(trash.statusCode).toBe(200);
    const trashBody = trash.json() as TrashListResponse;
    expect(trashBody.retentionDays).toBe(30);
    const item = trashBody.items.find((entry) => entry.id === notesId);
    expect(item).toMatchObject({ kind: 'file', name: 'notes.txt', category: 'documents' });
    expect(item?.expiresAt).toBeTruthy();

    const restored = await call(alice, 'POST', `/api/v1/trash/files/${notesId}/restore`);
    expect(restored.statusCode).toBe(200);

    const after = await list(alice);
    expect(after.items.some((file) => file.id === notesId)).toBe(true);
  });

  it('permanently deletes a trashed file', async () => {
    await call(alice, 'DELETE', `/api/v1/files/${archiveId}`);
    const purged = await call(alice, 'DELETE', `/api/v1/trash/files/${archiveId}`);
    expect(purged.statusCode).toBe(200);

    const detail = await call(alice, 'GET', `/api/v1/files/${archiveId}`);
    expect(detail.statusCode).toBe(404);

    const trash = await call(alice, 'GET', '/api/v1/trash');
    expect((trash.json() as TrashListResponse).items.some((item) => item.id === archiveId)).toBe(
      false,
    );
  });

  it('permanently deletes a trashed file with stored versions and ciphertext', async () => {
    const versionedId = await insertTestFile(ctx.db, alice.id, {
      name: 'versioned.bin',
      mimeType: 'application/octet-stream',
    });
    const version = await insertTestVersion(ctx.db, ctx.objectsDir, alice.id, versionedId);

    const objectPath = path.join(
      ctx.objectsDir,
      alice.id,
      `${version.storageObjectId}.bin`,
    );
    expect(existsSync(objectPath)).toBe(true);

    await call(alice, 'DELETE', `/api/v1/files/${versionedId}`);
    const purge = await call(alice, 'DELETE', `/api/v1/trash/files/${versionedId}`);
    expect(purge.statusCode).toBe(200);
    expect(existsSync(objectPath)).toBe(false);

    const stillThere = await ctx.db.query('select 1 from public.files where id = $1', [versionedId]);
    expect(stillThere.rows).toHaveLength(0);
  });
});
