import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { LibrarySummaryResponse } from '@stackbase/contracts';
import { authHeader, createTestContext, signIn, type DevSession, type TestContext } from './helpers';

let ctx: TestContext;
let alice: DevSession;
let bob: DevSession;

interface SeedFile {
  name: string;
  mimeType: string;
  extension?: string | null;
  bytes: number;
  trashed?: boolean;
}

const SEED: SeedFile[] = [
  { name: 'sunset.jpg', mimeType: 'image/jpeg', extension: '.JPG', bytes: 1000 },
  { name: 'clip.mp4', mimeType: 'video/mp4', bytes: 2000 },
  { name: 'song.mp3', mimeType: 'audio/mpeg', bytes: 3000 },
  { name: 'contract.pdf', mimeType: 'application/pdf', extension: 'pdf', bytes: 4000 },
  { name: 'notes.txt', mimeType: 'text/plain', bytes: 500 },
  { name: 'release.apk', mimeType: 'application/vnd.android.package-archive', bytes: 6000 },
  { name: 'bundle.zip', mimeType: 'application/zip', bytes: 7000 },
  { name: 'setup.exe', mimeType: 'application/octet-stream', extension: 'EXE', bytes: 800 },
  { name: 'ubuntu.iso', mimeType: 'application/octet-stream', extension: 'iso', bytes: 900 },
  { name: 'mystery.dat', mimeType: 'application/octet-stream', extension: 'dat', bytes: 100 },
  { name: 'deleted.png', mimeType: 'image/png', bytes: 99999, trashed: true },
];

const seedLibrary = async () => {
  for (const file of SEED) {
    await ctx.db.query(
      `insert into public.files
         (user_id, name, mime_type, extension, logical_size_bytes, deleted_at)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        alice.id,
        file.name,
        file.mimeType,
        file.extension ?? null,
        file.bytes,
        file.trashed ? new Date().toISOString() : null,
      ],
    );
  }
};

const getSummary = async (session: DevSession): Promise<LibrarySummaryResponse> => {
  const response = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/library/summary',
    headers: authHeader(session),
  });
  expect(response.statusCode).toBe(200);
  return response.json() as LibrarySummaryResponse;
};

beforeAll(async () => {
  ctx = await createTestContext();
  alice = await signIn(ctx.app, 'library-alice@example.com');
  bob = await signIn(ctx.app, 'library-bob@example.com');
});

afterAll(async () => {
  await ctx.close();
});

describe('library summary', () => {
  it('requires a verified token', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/v1/library/summary' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: 'AUTH_REQUIRED' } });
  });

  it('returns every category in canonical order with zero counts for a new account', async () => {
    const summary = await getSummary(bob);

    expect(summary.totals).toEqual({ files: 0, bytes: 0 });
    expect(summary.categories.map((entry) => entry.category)).toEqual([
      'images',
      'videos',
      'audio',
      'documents',
      'apks',
      'archives',
      'apps',
      'downloads',
      'other',
    ]);
    expect(summary.categories.every((entry) => entry.files === 0 && entry.bytes === 0)).toBe(true);
  });

  it('aggregates real rows by mime type and extension and excludes trashed files', async () => {
    await seedLibrary();
    const summary = await getSummary(alice);

    const byCategory = Object.fromEntries(
      summary.categories.map((entry) => [entry.category, { files: entry.files, bytes: entry.bytes }]),
    );

    expect(byCategory).toEqual({
      images: { files: 1, bytes: 1000 },
      videos: { files: 1, bytes: 2000 },
      audio: { files: 1, bytes: 3000 },
      documents: { files: 2, bytes: 4500 },
      apks: { files: 1, bytes: 6000 },
      archives: { files: 1, bytes: 7000 },
      apps: { files: 1, bytes: 800 },
      downloads: { files: 1, bytes: 900 },
      other: { files: 1, bytes: 100 },
    });

    // Trashed rows never reach the totals.
    expect(summary.totals).toEqual({ files: 10, bytes: 25300 });
  });

  it('never mixes another owner’s files into the totals', async () => {
    const bobSummary = await getSummary(bob);
    expect(bobSummary.totals).toEqual({ files: 0, bytes: 0 });
  });
});
