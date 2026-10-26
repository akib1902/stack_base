import type { LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  FileSummary,
  LibrarySummaryResponse,
  SearchResponse,
  TagListResponse,
  TrashListResponse,
  UserSettings,
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
let docsFolderId: string;
let imageId: string;
let zipId: string;
let workTagId: string;

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

beforeAll(async () => {
  ctx = await createTestContext();
  alice = await signIn(ctx.app, 'discovery-alice@example.com');
  bob = await signIn(ctx.app, 'discovery-bob@example.com');

  const folder = await call(alice, 'POST', '/api/v1/folders', { name: 'Docs' });
  docsFolderId = (folder.json() as { id: string }).id;

  imageId = await insertTestFile(ctx.db, alice.id, {
    name: 'cover.png',
    mimeType: 'image/png',
    sizeBytes: 1000,
  });
  await insertTestFile(ctx.db, alice.id, {
    name: 'report.txt',
    mimeType: 'text/plain',
    sizeBytes: 2000,
    folderId: docsFolderId,
  });
  zipId = await insertTestFile(ctx.db, alice.id, {
    name: 'bundle.zip',
    mimeType: 'application/zip',
    sizeBytes: 3000,
  });

  const tag = await call(alice, 'POST', '/api/v1/tags', { name: 'Work', colorToken: 'amber' });
  expect(tag.statusCode).toBe(201);
  workTagId = (tag.json() as { id: string }).id;
});

afterAll(async () => {
  await ctx.close();
});

describe('tags', () => {
  it('creates, lists and rejects case-insensitive duplicates', async () => {
    const personal = await call(alice, 'POST', '/api/v1/tags', { name: 'Personal' });
    expect(personal.statusCode).toBe(201);

    const duplicate = await call(alice, 'POST', '/api/v1/tags', { name: '  work ' });
    expect(duplicate.statusCode).toBe(400);
    expect(duplicate.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });

    const list = await call(alice, 'GET', '/api/v1/tags');
    expect(list.statusCode).toBe(200);
    expect((list.json() as TagListResponse).items.map((tag) => tag.name)).toEqual([
      'Personal',
      'Work',
    ]);
  });

  it('validates the colour token and the name', async () => {
    const badColour = await call(alice, 'POST', '/api/v1/tags', {
      name: 'Bad colour',
      colorToken: 'url(javascript:alert(1))',
    });
    expect(badColour.statusCode).toBe(400);

    const longName = await call(alice, 'POST', '/api/v1/tags', { name: 'x'.repeat(65) });
    expect(longName.statusCode).toBe(400);
  });

  it('reports real usage counts and cascades tag deletion', async () => {
    const attached = await call(alice, 'PUT', `/api/v1/files/${imageId}/tags`, {
      tagIds: [workTagId],
    });
    expect(attached.statusCode).toBe(200);

    const list = await call(alice, 'GET', '/api/v1/tags');
    const work = (list.json() as TagListResponse).items.find((tag) => tag.id === workTagId);
    expect(work?.fileCount).toBe(1);

    const renamed = await call(alice, 'PATCH', `/api/v1/tags/${workTagId}`, {
      name: 'Office',
      colorToken: 'teal',
    });
    expect(renamed.statusCode).toBe(200);

    const deleted = await call(alice, 'DELETE', `/api/v1/tags/${workTagId}`);
    expect(deleted.statusCode).toBe(200);

    const file = await call(alice, 'GET', `/api/v1/files/${imageId}`);
    expect((file.json() as FileSummary).tags).toHaveLength(0);
  });

  it('keeps tags private to their owner', async () => {
    const bobList = await call(bob, 'GET', '/api/v1/tags');
    expect((bobList.json() as TagListResponse).items).toHaveLength(0);

    const bobDelete = await call(bob, 'DELETE', `/api/v1/tags/${workTagId}`);
    expect(bobDelete.statusCode).toBe(404);
  });
});

describe('library summary', () => {
  it('aggregates real totals and every category, including empty ones', async () => {
    const response = await call(alice, 'GET', '/api/v1/library/summary');
    expect(response.statusCode).toBe(200);

    const summary = response.json() as LibrarySummaryResponse;
    expect(summary.totals).toMatchObject({
      files: 3,
      folders: 1,
      bytes: 6000,
      tags: 1,
      trashedFiles: 0,
      trashedFolders: 0,
    });
    expect(summary.categories).toHaveLength(9);

    const byCategory = new Map(summary.categories.map((entry) => [entry.category, entry]));
    expect(byCategory.get('images')).toMatchObject({ files: 1, bytes: 1000 });
    expect(byCategory.get('documents')).toMatchObject({ files: 1, bytes: 2000 });
    expect(byCategory.get('archives')).toMatchObject({ files: 1, bytes: 3000 });
    expect(byCategory.get('videos')).toMatchObject({ files: 0, bytes: 0 });

    expect(summary.largest.map((file) => file.name)).toEqual(['bundle.zip', 'report.txt', 'cover.png']);
    expect(summary.recent).toHaveLength(3);
  });

  it('counts trashed entries separately from active ones', async () => {
    await call(alice, 'DELETE', `/api/v1/files/${zipId}`);

    const response = await call(alice, 'GET', '/api/v1/library/summary');
    const summary = response.json() as LibrarySummaryResponse;
    expect(summary.totals).toMatchObject({ files: 2, bytes: 3000, trashedFiles: 1 });
    expect(summary.categories.find((entry) => entry.category === 'archives')?.files).toBe(0);

    await call(alice, 'POST', `/api/v1/trash/files/${zipId}/restore`);
  });
});

describe('GET /api/v1/search', () => {
  it('finds files and folders by a case-insensitive substring', async () => {
    const folders = await call(alice, 'GET', '/api/v1/search?q=DOC');
    expect(folders.statusCode).toBe(200);
    const folderBody = folders.json() as SearchResponse;
    expect(folderBody.query).toBe('DOC');
    expect(folderBody.folders.map((folder) => folder.name)).toContain('Docs');

    const files = await call(alice, 'GET', '/api/v1/search?q=REPORT');
    expect(files.statusCode).toBe(200);
    expect((files.json() as SearchResponse).files.map((file) => file.name)).toContain(
      'report.txt',
    );
  });

  it('returns empty results for a blank or unmatched query', async () => {
    const blank = await call(alice, 'GET', '/api/v1/search?q=');
    expect(blank.statusCode).toBe(200);
    expect((blank.json() as SearchResponse).files).toHaveLength(0);
    expect((blank.json() as SearchResponse).folders).toHaveLength(0);

    const none = await call(alice, 'GET', '/api/v1/search?q=zzzz');
    expect((none.json() as SearchResponse).files).toHaveLength(0);
  });

  it('never searches another account’s library', async () => {
    const response = await call(bob, 'GET', '/api/v1/search?q=DOC');
    const body = response.json() as SearchResponse;
    expect(body.files).toHaveLength(0);
    expect(body.folders).toHaveLength(0);
  });
});

describe('library settings', () => {
  it('persists the default view and sort', async () => {
    const updated = await call(alice, 'PATCH', '/api/v1/me/settings', {
      defaultView: 'list',
      defaultSort: 'name_asc',
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ defaultView: 'list', defaultSort: 'name_asc' });

    const me = await call(alice, 'GET', '/api/v1/me');
    expect((me.json() as { settings: UserSettings }).settings).toMatchObject({
      defaultView: 'list',
      defaultSort: 'name_asc',
    });
  });

  it('rejects unsupported values, unknown fields and empty updates', async () => {
    const badSort = await call(alice, 'PATCH', '/api/v1/me/settings', {
      defaultSort: 'random',
    });
    expect(badSort.statusCode).toBe(400);

    const badView = await call(alice, 'PATCH', '/api/v1/me/settings', { defaultView: 'masonry' });
    expect(badView.statusCode).toBe(400);

    const empty = await call(alice, 'PATCH', '/api/v1/me/settings', {});
    expect(empty.statusCode).toBe(400);
  });

  it('uses a zero retention setting to mean “no automatic expiry”', async () => {
    const updated = await call(alice, 'PATCH', '/api/v1/me/settings', {
      trashRetentionDays: 0,
    });
    expect(updated.statusCode).toBe(200);

    await call(alice, 'DELETE', `/api/v1/files/${imageId}`);
    const trash = await call(alice, 'GET', '/api/v1/trash');
    const body = trash.json() as TrashListResponse;
    expect(body.retentionDays).toBe(0);
    expect(body.items.find((item) => item.id === imageId)?.expiresAt).toBeNull();

    await call(alice, 'POST', `/api/v1/trash/files/${imageId}/restore`);
    await call(alice, 'PATCH', '/api/v1/me/settings', { trashRetentionDays: 30 });
  });
});
