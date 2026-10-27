import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { StorageInsightsResponse } from '@stackbase/contracts';
import {
  authHeader,
  createTestContext,
  insertTestFile,
  signIn,
  type DevSession,
  type TestContext,
} from './helpers';

/**
 * Storage insights (FR-10): real aggregates over the caller's own rows —
 * category distribution, largest files and folders, duplicate candidates from
 * the client-declared plaintext fingerprint, and what trash is holding.
 */

let ctx: TestContext;
let alice: DevSession;
let bob: DevSession;
let folderId: string;

const seed = async (
  userId: string,
): Promise<{ trashSize: number; duplicateSize: number }> => {
  const { rows } = await ctx.db.query<{ id: string }>(
    `insert into public.folders (user_id, name) values ($1, 'Media') returning id`,
    [userId],
  );
  folderId = rows[0]!.id;

  await insertTestFile(ctx.db, userId, {
    name: 'photo.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1_000_000,
  });
  await insertTestFile(ctx.db, userId, {
    name: 'clip.mp4',
    mimeType: 'video/mp4',
    sizeBytes: 4_000_000,
    folderId,
  });
  await insertTestFile(ctx.db, userId, {
    name: 'notes.txt',
    mimeType: 'text/plain',
    sizeBytes: 2_000,
  });
  await insertTestFile(ctx.db, userId, {
    name: 'trash-me.bin',
    mimeType: 'application/octet-stream',
    sizeBytes: 700_000,
    deleted: true,
  });
  await insertTestFile(ctx.db, userId, {
    name: 'copy-a.bin',
    mimeType: 'application/octet-stream',
    sizeBytes: 500_000,
  });
  await insertTestFile(ctx.db, userId, {
    name: 'copy-b.bin',
    mimeType: 'application/octet-stream',
    sizeBytes: 500_000,
  });
  await insertTestFile(ctx.db, userId, {
    name: 'copy-c.bin',
    mimeType: 'application/octet-stream',
    sizeBytes: 500_000,
  });

  // Two identical copies share a fingerprint; the third is genuinely distinct.
  await ctx.db.query(
    `update public.files set content_fingerprint = $2
      where user_id = $1 and name in ('copy-a.bin', 'copy-b.bin')`,
    [userId, 'f'.repeat(64)],
  );
  await ctx.db.query(
    `update public.files set content_fingerprint = $2
      where user_id = $1 and name = 'copy-c.bin'`,
    [userId, 'a'.repeat(64)],
  );
  // The duplicate sits in a folder too, so folder totals cover two files.
  await ctx.db.query(
    `update public.files set folder_id = $2 where user_id = $1 and name = 'copy-a.bin'`,
    [userId, folderId],
  );

  return { trashSize: 700_000, duplicateSize: 500_000 };
};

let aliceSeed: { trashSize: number; duplicateSize: number };

const insightsOf = async (session: DevSession): Promise<StorageInsightsResponse> => {
  const response = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/insights',
    headers: authHeader(session),
  });
  expect(response.statusCode).toBe(200);
  return response.json() as StorageInsightsResponse;
};

beforeAll(async () => {
  ctx = await createTestContext();
  alice = await signIn(ctx.app, 'insights-alice@example.com');
  bob = await signIn(ctx.app, 'insights-bob@example.com');
  aliceSeed = await seed(alice.id);
});

afterAll(async () => {
  await ctx.close();
});

describe('GET /api/v1/insights', () => {
  it('totals separate live files from trash and never double count', async () => {
    const insights = await insightsOf(alice);
    // Six live files (photo, clip, notes, copy-a/b/c) plus one trashed.
    expect(insights.totals.files).toBe(6);
    expect(insights.totals.folders).toBe(1);
    expect(insights.totals.trashedFiles).toBe(1);
    expect(insights.totals.trashedBytes).toBe(aliceSeed.trashSize);
    expect(insights.totals.bytes).toBe(1_000_000 + 4_000_000 + 2_000 + 1_500_000);
  });

  it('classifies categories with real byte totals', async () => {
    const insights = await insightsOf(alice);
    const byCategory = new Map(insights.categories.map((entry) => [entry.category, entry]));

    expect(byCategory.get('images')).toEqual({ category: 'images', files: 1, bytes: 1_000_000 });
    expect(byCategory.get('videos')).toEqual({ category: 'videos', files: 1, bytes: 4_000_000 });
    expect(byCategory.get('documents')).toEqual({
      category: 'documents',
      files: 1,
      bytes: 2_000,
    });
    // Every category is present even when empty, so charts stay stable.
    expect(insights.categories).toHaveLength(9);
    expect(byCategory.get('audio')).toEqual({ category: 'audio', files: 0, bytes: 0 });
  });

  it('ranks the largest files and folders by size', async () => {
    const insights = await insightsOf(alice);
    expect(insights.largestFiles[0]?.name).toBe('clip.mp4');
    expect(insights.largestFiles[0]?.sizeBytes).toBe(4_000_000);
    expect(insights.largestFiles).toHaveLength(6);

    expect(insights.largestFolders).toHaveLength(1);
    expect(insights.largestFolders[0]?.name).toBe('Media');
    expect(insights.largestFolders[0]?.files).toBe(2);
    expect(insights.largestFolders[0]?.bytes).toBe(4_000_000 + 500_000);
  });

  it('finds duplicate candidates from the plaintext fingerprint', async () => {
    const insights = await insightsOf(alice);
    expect(insights.duplicateGroups).toHaveLength(1);
    const group = insights.duplicateGroups[0]!;
    expect(group.fingerprint).toBe('f'.repeat(64));
    expect(group.files.map((file) => file.name).sort()).toEqual(['copy-a.bin', 'copy-b.bin']);
    expect(group.sizeBytes).toBe(aliceSeed.duplicateSize);
    expect(group.wastedBytes).toBe(aliceSeed.duplicateSize);
    // The unique copy never becomes a "duplicate".
    expect(
      insights.duplicateGroups.some((entry) => entry.fingerprint === 'a'.repeat(64)),
    ).toBe(false);
  });

  it('reports only the caller’s own data', async () => {
    const insights = await insightsOf(bob);
    expect(insights.totals.files).toBe(0);
    expect(insights.totals.bytes).toBe(0);
    expect(insights.largestFiles).toEqual([]);
    expect(insights.largestFolders).toEqual([]);
    expect(insights.duplicateGroups).toEqual([]);
    expect(insights.categories.every((entry) => entry.files === 0)).toBe(true);
  });

  it('requires a session', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/v1/insights' });
    expect(response.statusCode).toBe(401);
  });
});