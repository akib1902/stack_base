import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ciphertextChunkLength,
  ciphertextSizeFor,
  totalChunksFor,
  type CreateShareResponse,
  type FileSummary,
  type PublicShare,
  type UploadManifest,
  type UploadJob,
} from '@stackbase/contracts';
import {
  TEST_SECRET,
  authHeader,
  createTestContext,
  insertTestFile,
  insertTestVersion,
  signIn,
  testConfig,
  testWrappedKey,
  type DevSession,
  type TestContext,
} from './helpers';

/**
 * Security and integration sweep (SRS C12): the two questions every route must
 * answer are (1) does an anonymous caller get a 401, and (2) can one account
 * reach another account's resources. The first is driven by the real route
 * table, so a new unguarded route fails this suite instead of shipping quietly.
 * The second drives real HTTP requests for every resource type, then re-reads
 * the owner's data to prove the refused attempt changed nothing.
 */

let ctx: TestContext;
let alice: DevSession;
let bob: DevSession;

interface Fixture {
  folderId: string;
  fileId: string;
  versionId: string;
  tagId: string;
  shareId: string;
  shareToken: string;
  trashedFileId: string;
  trashedFolderId: string;
  uploadId: string;
}

let owned: Fixture;

const uuid = () => randomUUID();

const call = (session: DevSession, method: string, url: string, payload?: unknown) =>
  ctx.app.inject({
    method: method as 'GET',
    url,
    headers: authHeader(session),
    ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }),
  });

const anonymous = (method: string, url: string, payload?: unknown, headers = {}) =>
  ctx.app.inject({
    method: method as 'GET',
    url,
    headers,
    ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }),
  });

const errorCode = (response: { json: () => unknown }): string | undefined =>
  (response.json() as { error?: { code?: string } }).error?.code;

/** A structurally valid upload manifest: one 10-byte plaintext chunk. */
function manifest(): UploadManifest {
  const plaintextSize = 10;
  const chunkSize = 64 * 1024;
  return {
    format: 'stackbase-file',
    version: 1,
    cipher: 'xchacha20poly1305-secretstream',
    chunking: { plaintextChunkSize: chunkSize, totalChunks: totalChunksFor(plaintextSize, chunkSize) },
    plaintextSize,
    ciphertextSize: ciphertextSizeFor(plaintextSize, chunkSize),
    streamHeader: Buffer.alloc(24, 5).toString('base64'),
    wrappedKey: testWrappedKey(),
  };
}

beforeAll(async () => {
  ctx = await createTestContext(testConfig({ MAX_ACTIVE_UPLOADS: '8' }));
  alice = await signIn(ctx.app, 'sweep-alice@example.com');
  bob = await signIn(ctx.app, 'sweep-bob@example.com');
});

afterAll(async () => {
  await ctx.close();
});

// ---------------------------------------------------------------------------
// 1. Every authenticated route refuses an anonymous caller
// ---------------------------------------------------------------------------

interface RouteEntry {
  method: string;
  path: string;
}

/** Fastify's printed route tree is the only public view of the route table. */
function routeTable(): RouteEntry[] {
  const tree = ctx.app.printRoutes({ commonPrefix: false });
  const stack: string[] = [];
  const routes: RouteEntry[] = [];

  for (const line of tree.split('\n')) {
    const match = /^((?:[│ ]   )*)(?:├── |└── )(\S+)(?: \(([^)]*)\))?$/.exec(line.trimEnd());
    if (!match) continue;

    const depth = (match[1] ?? '').length / 4;
    const segment = match[2]!;
    const methods = (match[3] ?? '')
      .split(',')
      .map((method) => method.trim())
      .filter((method) => method.length > 0 && method !== 'HEAD' && method !== 'OPTIONS');

    stack.length = depth;
    stack[depth] = segment;
    if (methods.length === 0) continue;

    const path = stack.slice(0, depth + 1).join('');
    for (const method of methods) routes.push({ method, path });
  }

  return routes.filter((route) => route.path.startsWith('/api/v1/'));
}

/**
 * Routes that are public by design. Everything else must reject an anonymous
 * caller, and the reason for each exception is recorded here.
 */
const PUBLIC_ROUTES = new Set([
  'POST /api/v1/dev/session', // local development sign-in; never registered in production
  'GET /api/v1/public/shares/:token', // the 43-character token is the capability
  'GET /api/v1/public/shares/:token/download',
]);

/**
 * A schema-valid request per authenticated route. Validation runs before the
 * auth pre-handler, so an invalid body would return 400 and prove nothing.
 */
function validRequest(
  method: string,
  path: string,
): { url: string; payload?: unknown; headers?: Record<string, string> } {
  const id = '11111111-1111-4111-8111-111111111111';
  const filled = path
    .replace(':chunkNumber', '0')
    .replace(/:[A-Za-z]+/g, id);
  const url = path === '/api/v1/search' ? `${filled}?q=anything` : filled;

  const key = `${method} ${path}`;

  if (method === 'PUT' && path.endsWith('/chunks/:chunkNumber')) {
    // Ciphertext chunk 0 for the manifest above: final chunk with a short body.
    const length = ciphertextChunkLength(
      { plaintextSize: 10, chunking: { plaintextChunkSize: 64 * 1024, totalChunks: 1 } },
      0,
    );
    return {
      url,
      payload: Buffer.alloc(length, 7),
      headers: { 'content-type': 'application/octet-stream' },
    };
  }

  const bodies: Record<string, unknown> = {    'PATCH /api/v1/me/settings': { theme: 'amber' },
    'POST /api/v1/encryption/vault': {
      kdf: {
        algorithm: 'argon2id13',
        opsLimit: 3,
        memLimitBytes: 64 * 1024 * 1024,
        salt: Buffer.alloc(16, 1).toString('base64'),
      },
      wrappedVaultKey: {
        algorithm: 'xsalsa20poly1305',
        nonce: Buffer.alloc(24, 2).toString('base64'),
        ciphertext: Buffer.alloc(48, 3).toString('base64'),
      },
      recoveryVerifier: {
        algorithm: 'xsalsa20poly1305',
        nonce: Buffer.alloc(24, 4).toString('base64'),
        ciphertext: Buffer.alloc(35 + 16, 5).toString('base64'),
      },
    },
    'POST /api/v1/files/bulk': { action: 'favorite', fileIds: [id] },
    'PUT /api/v1/files/:fileId/tags': { tagIds: [] },
    'PATCH /api/v1/files/:fileId': { favorite: true },
    'POST /api/v1/folders': { name: 'Sweep folder' },
    'PATCH /api/v1/folders/:folderId': { name: 'Renamed' },
    'POST /api/v1/tags': { name: 'Sweep tag' },
    'PATCH /api/v1/tags/:tagId': { name: 'Renamed' },
    'POST /api/v1/shares': {
      fileId: id,
      versionId: id,
      wrappedKey: testWrappedKey(),
    },
    'POST /api/v1/uploads': {
      idempotencyKey: `sweep-${uuid()}`,
      name: 'sweep.txt',
      mimeType: 'text/plain',
      manifest: manifest(),
    },
    'POST /api/v1/uploads/:uploadId/finalize': {
      ciphertextHash: 'a'.repeat(64),
      plaintextFingerprint: 'b'.repeat(64),
    },
    'POST /api/v1/storage/telegram/authorize': { phoneNumber: '+15551234567' },
    'POST /api/v1/storage/telegram/verify': {},
  };

  if (key in bodies) return { url, payload: bodies[key] };

  // Reads, deletes and the POST actions that take no body at all.
  const bodyless = new Set([
    'POST /api/v1/trash/purge',
    'POST /api/v1/trash/files/:fileId/restore',
    'POST /api/v1/trash/folders/:folderId/restore',
    'POST /api/v1/shares/:shareId/revoke',
    'POST /api/v1/uploads/:uploadId/cancel',
    'POST /api/v1/uploads/:uploadId/pause',
    'POST /api/v1/uploads/:uploadId/resume',
    'POST /api/v1/uploads/:uploadId/retry',
    'POST /api/v1/storage/telegram/disconnect',
    'POST /api/v1/files/:fileId/versions/:versionId/restore',
  ]);
  if (bodyless.has(key) || method === 'GET' || method === 'DELETE') return { url };

  throw new Error(
    `The route ${key} has no entry in this sweep. Add a schema-valid request for it.`,
  );
}

describe('authentication boundary', () => {
  it('exposes a route table that this sweep understands', () => {
    const routes = routeTable();
    expect(routes.length).toBeGreaterThan(40);
    // A route parsed with a mangled path would silently drop out of the sweep.
    expect(routes.filter((route) => route.path.includes('undefined'))).toEqual([]);
  });

  it('rejects every authenticated route when there is no session', async () => {
    const anonymousFailures: string[] = [];

    for (const route of routeTable()) {
      const key = `${route.method} ${route.path}`;
      if (PUBLIC_ROUTES.has(key)) continue;

      const request = validRequest(route.method, route.path);
      const response = await anonymous(
        route.method,
        request.url,
        request.payload,
        request.headers ?? {},
      );
      if (response.statusCode !== 401 || errorCode(response) !== 'AUTH_REQUIRED') {
        anonymousFailures.push(`${key} -> ${response.statusCode} ${response.body.slice(0, 120)}`);
      }
    }

    expect(anonymousFailures).toEqual([]);
  });

  it('serves only the three public routes without a session', async () => {
    const publicPaths = new Set([...PUBLIC_ROUTES].map((route) => route.split(' ')[1]));
    for (const route of routeTable()) {
      if (PUBLIC_ROUTES.has(`${route.method} ${route.path}`)) continue;
      expect(publicPaths.has(route.path)).toBe(false);
    }

    // A wrong-length public token is a validation error, not a route leak.
    const badToken = await anonymous('GET', `/api/v1/public/shares/${'x'.repeat(20)}`);
    expect(badToken.statusCode).toBe(400);
    expect(errorCode(badToken)).toBe('VALIDATION_ERROR');

    // A well-formed but unknown token never reveals whether a file exists.
    const unknown = await anonymous('GET', `/api/v1/public/shares/${'A'.repeat(43)}`);
    expect(unknown.statusCode).toBe(404);
    expect(errorCode(unknown)).toBe('SHARE_NOT_FOUND');
  });

  it('never reads identity from client input', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/files?userId=${alice.id}&user_id=${alice.id}`,
      headers: { ...authHeader(bob), 'x-user-id': alice.id, 'x-forwarded-user': alice.id },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { items: FileSummary[] };
    expect(body.items).toEqual([]);
  });

  it('rejects a validly signed token for an identity this deployment does not have', async () => {
    const token = await new SignJWT({ email: 'ghost@example.com', role: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(randomUUID())
      .setIssuer('stackbase-dev')
      .setAudience('stackbase-api')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(TEST_SECRET));

    for (const url of ['/api/v1/me', '/api/v1/files', '/api/v1/folders']) {
      const response = await anonymous('GET', url, undefined, {
        authorization: `Bearer ${token}`,
      });
      expect(response.statusCode).toBe(401);
      expect(errorCode(response)).toBe('AUTH_REQUIRED');
    }
  });

  it('rejects a token signed with the wrong secret', async () => {
    const response = await anonymous('GET', '/api/v1/files', undefined, {
      authorization: `Bearer ${Buffer.from('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.invalid').toString('utf8')}`,
    });
    expect(response.statusCode).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 2. Two accounts cannot reach each other's resources
// ---------------------------------------------------------------------------

beforeAll(async () => {
  const folder = await call(alice, 'POST', '/api/v1/folders', { name: 'Alice folder' });
  expect(folder.statusCode).toBe(201);
  const folderId = (folder.json() as { id: string }).id;

  const fileId = await insertTestFile(ctx.db, alice.id, {
    name: 'alice-secret.txt',
    folderId,
    description: 'alice private note',
    sizeBytes: 2048,
  });
  const version = await insertTestVersion(ctx.db, ctx.objectsDir, alice.id, fileId);

  const tag = await call(alice, 'POST', '/api/v1/tags', { name: 'alice-tag' });
  const tagId = (tag.json() as { id: string }).id;
  const tagged = await call(alice, 'PUT', `/api/v1/files/${fileId}/tags`, { tagIds: [tagId] });
  expect(tagged.statusCode).toBe(200);

  const share = await call(alice, 'POST', '/api/v1/shares', {
    fileId,
    versionId: version.versionId,
    wrappedKey: testWrappedKey(),
  });
  expect(share.statusCode).toBe(200);
  const created = share.json() as CreateShareResponse;

  const trashedFileId = await insertTestFile(ctx.db, alice.id, {
    name: 'alice-trashed.txt',
    deleted: true,
  });

  const binFolder = await call(alice, 'POST', '/api/v1/folders', { name: 'Alice bin' });
  const binFolderId = (binFolder.json() as { id: string }).id;
  expect((await call(alice, 'DELETE', `/api/v1/folders/${binFolderId}`)).statusCode).toBe(200);

  const upload = await call(alice, 'POST', '/api/v1/uploads', {
    idempotencyKey: `sweep-alice-${uuid()}`,
    name: 'alice-upload.txt',
    mimeType: 'text/plain',
    manifest: manifest(),
  });
  expect(upload.statusCode).toBe(200);
  const uploadId = (upload.json() as { upload: UploadJob }).upload.id;

  owned = {
    folderId,
    fileId,
    versionId: version.versionId,
    tagId,
    shareId: created.share.id,
    shareToken: created.token,
    trashedFileId,
    trashedFolderId: binFolderId,
    uploadId,
  };
});

const aliceFile = async (): Promise<FileSummary> => {
  const response = await call(alice, 'GET', `/api/v1/files/${owned.fileId}`);
  expect(response.statusCode).toBe(200);
  return response.json() as FileSummary;
};

describe('two-account isolation', () => {
  it('lists only the caller’s files, folders, tags and trash', async () => {
    const files = (await call(bob, 'GET', '/api/v1/files')).json() as { items: FileSummary[] };
    expect(files.items).toEqual([]);

    const folders = (await call(bob, 'GET', '/api/v1/folders')).json() as { items: unknown[] };
    expect(folders.items).toEqual([]);

    const tags = (await call(bob, 'GET', '/api/v1/tags')).json() as { items: unknown[] };
    expect(tags.items).toEqual([]);

    const trash = (await call(bob, 'GET', '/api/v1/trash')).json() as { items: unknown[] };
    expect(trash.items).toEqual([]);

    const shares = (await call(bob, 'GET', `/api/v1/shares?fileId=${owned.fileId}`)).json() as {
      items: unknown[];
    };
    expect(shares.items).toEqual([]);

    const versions = await call(bob, 'GET', `/api/v1/files/${owned.fileId}/versions`);
    expect(versions.statusCode).toBe(404);

    const audit = (await call(bob, 'GET', '/api/v1/audit')).json() as { items: unknown[] };
    expect(audit.items).toEqual([]);
  });

  it('hides another account’s file, and refuses every mutation', async () => {
    const before = await aliceFile();

    expect((await call(bob, 'GET', `/api/v1/files/${owned.fileId}`)).statusCode).toBe(404);
    expect(
      (await call(bob, 'PATCH', `/api/v1/files/${owned.fileId}`, { name: 'hijacked.txt' }))
        .statusCode,
    ).toBe(404);
    expect((await call(bob, 'DELETE', `/api/v1/files/${owned.fileId}`)).statusCode).toBe(404);
    expect(
      (await call(bob, 'PUT', `/api/v1/files/${owned.fileId}/tags`, { tagIds: [] })).statusCode,
    ).toBe(404);
    expect(
      (
        await call(bob, 'POST', '/api/v1/files/bulk', {
          action: 'trash',
          fileIds: [owned.fileId],
        })
      ).statusCode,
    ).toBe(404);

    const after = await aliceFile();
    expect(after.name).toBe(before.name);
    expect(after.favorite).toBe(before.favorite);
    expect(after.folderId).toBe(before.folderId);
    expect(after.tags.map((tag) => tag.id)).toEqual([owned.tagId]);
  });

  it('refuses another account’s folder, tag and share', async () => {
    expect(
      (await call(bob, 'PATCH', `/api/v1/folders/${owned.folderId}`, { name: 'Hijacked' })).statusCode,
    ).toBe(404);
    expect((await call(bob, 'DELETE', `/api/v1/folders/${owned.folderId}`)).statusCode).toBe(404);
    expect(
      (await call(bob, 'PATCH', `/api/v1/tags/${owned.tagId}`, { name: 'hijacked-tag' })).statusCode,
    ).toBe(404);
    expect((await call(bob, 'DELETE', `/api/v1/tags/${owned.tagId}`)).statusCode).toBe(404);
    expect(
      (await call(bob, 'POST', `/api/v1/shares/${owned.shareId}/revoke`)).statusCode,
    ).toBe(404);

    const folders = (await call(alice, 'GET', '/api/v1/folders')).json() as {
      items: Array<{ id: string; name: string }>;
    };
    expect(folders.items).toContainEqual(
      expect.objectContaining({ id: owned.folderId, name: 'Alice folder' }),
    );

    const tags = (await call(alice, 'GET', '/api/v1/tags')).json() as {
      items: Array<{ id: string; name: string }>;
    };
    expect(tags.items).toContainEqual(expect.objectContaining({ id: owned.tagId, name: 'alice-tag' }));

    // The refused revoke did not touch the capability: the link still works.
    const publicShare = await anonymous('GET', `/api/v1/public/shares/${owned.shareToken}`);
    expect(publicShare.statusCode).toBe(200);
  });

  it('refuses another account’s versions, ciphertext and restore', async () => {
    const list = await call(bob, 'GET', `/api/v1/files/${owned.fileId}/versions`);
    expect(list.statusCode).toBe(404);

    const download = await call(
      bob,
      'GET',
      `/api/v1/files/${owned.fileId}/versions/${owned.versionId}/download`,
    );
    expect(download.statusCode).toBe(404);
    expect(download.headers['content-type']).toContain('application/json');

    const restore = await call(
      bob,
      'POST',
      `/api/v1/files/${owned.fileId}/versions/${owned.versionId}/restore`,
    );
    expect(restore.statusCode).toBe(404);

    // The owner can still read their own ciphertext.
    const own = await call(
      alice,
      'GET',
      `/api/v1/files/${owned.fileId}/versions/${owned.versionId}/download`,
    );
    expect(own.statusCode).toBe(200);
  });

  it('refuses another account’s trash operations and leaves the trash intact', async () => {
    expect(
      (await call(bob, 'POST', `/api/v1/trash/files/${owned.trashedFileId}/restore`)).statusCode,
    ).toBe(404);
    expect(
      (await call(bob, 'DELETE', `/api/v1/trash/files/${owned.trashedFileId}`)).statusCode,
    ).toBe(404);
    expect(
      (await call(bob, 'POST', `/api/v1/trash/folders/${owned.trashedFolderId}/restore`)).statusCode,
    ).toBe(404);
    expect(
      (await call(bob, 'DELETE', `/api/v1/trash/folders/${owned.trashedFolderId}`)).statusCode,
    ).toBe(404);

    const purge = await call(bob, 'POST', '/api/v1/trash/purge');
    expect(purge.statusCode).toBe(200);
    expect((purge.json() as { purged: number }).purged).toBe(0);

    const trash = (await call(alice, 'GET', '/api/v1/trash')).json() as {
      items: Array<{ id: string }>;
    };
    expect(trash.items.map((item) => item.id)).toContain(owned.trashedFileId);
    expect(trash.items.map((item) => item.id)).toContain(owned.trashedFolderId);
  });

  it('refuses another account’s upload job and chunks', async () => {
    expect((await call(bob, 'GET', `/api/v1/uploads/${owned.uploadId}`)).statusCode).toBe(404);

    const chunk = await ctx.app.inject({
      method: 'PUT',
      url: `/api/v1/uploads/${owned.uploadId}/chunks/0`,
      headers: { ...authHeader(bob), 'content-type': 'application/octet-stream' },
      payload: Buffer.alloc(27, 9),
    });
    expect(chunk.statusCode).toBe(404);

    expect(
      (
        await call(bob, 'POST', `/api/v1/uploads/${owned.uploadId}/finalize`, {
          ciphertextHash: 'a'.repeat(64),
          plaintextFingerprint: 'b'.repeat(64),
        })
      ).statusCode,
    ).toBe(404);
    expect((await call(bob, 'POST', `/api/v1/uploads/${owned.uploadId}/cancel`)).statusCode).toBe(404);

    // Cancelling from another account must not have stopped the owner's job.
    const job = await call(alice, 'GET', `/api/v1/uploads/${owned.uploadId}`);
    expect(job.statusCode).toBe(200);
    expect((job.json() as UploadJob).status).not.toBe('cancelled');
  });

  it('keeps search, summary, insights and the vault per account', async () => {
    const bobSearch = (await call(bob, 'GET', '/api/v1/search?q=alice-secret')).json() as {
      files: unknown[];
      folders: unknown[];
    };
    expect(bobSearch.files).toEqual([]);
    expect(bobSearch.folders).toEqual([]);

    const aliceSearch = (await call(alice, 'GET', '/api/v1/search?q=alice-secret')).json() as {
      files: Array<{ id: string }>;
    };
    expect(aliceSearch.files.map((file) => file.id)).toContain(owned.fileId);

    const summary = (await call(bob, 'GET', '/api/v1/library/summary')).json() as {
      totals: { files: number; folders: number; tags: number };
      categories: Array<{ files: number }>;
    };
    expect(summary.totals).toMatchObject({ files: 0, folders: 0, tags: 0 });
    expect(summary.categories.every((category) => category.files === 0)).toBe(true);

    const insights = (await call(bob, 'GET', '/api/v1/insights')).json() as {
      totals: { files: number };
    };
    expect(insights.totals.files).toBe(0);

    const vault = await call(alice, 'POST', '/api/v1/encryption/vault', {
      kdf: {
        algorithm: 'argon2id13',
        opsLimit: 3,
        memLimitBytes: 64 * 1024 * 1024,
        salt: Buffer.alloc(16, 1).toString('base64'),
      },
      wrappedVaultKey: {
        algorithm: 'xsalsa20poly1305',
        nonce: Buffer.alloc(24, 2).toString('base64'),
        ciphertext: Buffer.alloc(48, 3).toString('base64'),
      },
      recoveryVerifier: {
        algorithm: 'xsalsa20poly1305',
        nonce: Buffer.alloc(24, 4).toString('base64'),
        ciphertext: Buffer.alloc(35 + 16, 5).toString('base64'),
      },
    });
    expect(vault.statusCode).toBe(200);

    const bobVault = (await call(bob, 'GET', '/api/v1/encryption/vault')).json() as {
      vault: unknown;
    };
    expect(bobVault.vault).toBeNull();

    const aliceVault = (await call(alice, 'GET', '/api/v1/encryption/vault')).json() as {
      vault: unknown;
    };
    expect(aliceVault.vault).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Public share capability
// ---------------------------------------------------------------------------

describe('public share capability', () => {
  it('serves ciphertext to anyone holding the token, and nothing about the owner', async () => {
    const view = await anonymous('GET', `/api/v1/public/shares/${owned.shareToken}`);
    expect(view.statusCode).toBe(200);
    const body = view.json() as PublicShare;
    expect(body.fileName).toBe('alice-secret.txt');
    expect(Object.keys(body).sort()).toEqual(
      [
        'createdAt',
        'ciphertextSizeBytes',
        'downloadCount',
        'encryptionFormatVersion',
        'expiresAt',
        'fileName',
        'manifest',
        'maxDownloads',
        'mimeType',
        'permission',
        'remainingDownloads',
        'shareId',
        'sizeBytes',
        'versionNumber',
        'wrappedKey',
      ].sort(),
    );
    expect(view.body).not.toContain(alice.id);
    expect(view.body).not.toContain('sweep-alice@example.com');

    const download = await anonymous(
      'GET',
      `/api/v1/public/shares/${owned.shareToken}/download`,
    );
    expect(download.statusCode).toBe(200);
    expect(download.headers['content-type']).toBe('application/octet-stream');
    expect(download.headers['x-stackbase-format']).toBe('stackbase/1');
    expect(download.headers['cache-control']).toBe('no-store');
  });

  it('stops serving the moment the owner revokes the link', async () => {
    expect((await call(alice, 'POST', `/api/v1/shares/${owned.shareId}/revoke`)).statusCode).toBe(
      200,
    );

    const view = await anonymous('GET', `/api/v1/public/shares/${owned.shareToken}`);
    expect(view.statusCode).toBe(410);
    expect(errorCode(view)).toBe('SHARE_REVOKED');

    const download = await anonymous(
      'GET',
      `/api/v1/public/shares/${owned.shareToken}/download`,
    );
    expect(download.statusCode).toBe(410);
  });

  it('records the refusal for the owner only', async () => {
    const audit = (await call(alice, 'GET', '/api/v1/audit')).json() as {
      items: Array<{ eventType: string; result: string }>;
    };
    expect(
      audit.items.some((event) => event.eventType === 'share.download' && event.result === 'denied'),
    ).toBe(true);

    const bobAudit = (await call(bob, 'GET', '/api/v1/audit')).json() as { items: unknown[] };
    expect(bobAudit.items).toEqual([]);
  });
});
