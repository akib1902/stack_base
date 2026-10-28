import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { loadConfig, type Config } from '../src/config/env';
import { createPGliteDb, type Db } from '../src/database/db';
import { runMigrations } from '../src/database/migrations';

export const TEST_SECRET = 'test-only-secret-value-with-enough-characters';

/** Every test context gets its own temp storage root; nothing touches the repo. */
export function testConfig(overrides: Record<string, string> = {}): Config {
  const root = mkdtempSync(path.join(tmpdir(), 'stackbase-test-'));
  return loadConfig({
    NODE_ENV: 'test',
    AUTH_MODE: 'dev',
    DEV_AUTH_SECRET: TEST_SECRET,
    WEB_ORIGIN: 'http://localhost:3000',
    STAGING_DIR: path.join(root, 'staging'),
    LOCAL_STORAGE_DIR: path.join(root, 'objects'),
    ...overrides,
  });
}

export interface TestContext {
  db: Db;
  app: FastifyInstance;
  config: Config;
  stagingDir: string;
  objectsDir: string;
  close: () => Promise<void>;
}

/** Fresh in-memory PostgreSQL with every migration applied. */
export async function createTestContext(config = testConfig()): Promise<TestContext> {
  const db = createPGliteDb();
  await runMigrations(db, { localAuthStub: true });
  const app = await buildApp({ config, db, logger: false });

  return {
    db,
    app,
    config,
    stagingDir: config.storage.stagingDir,
    objectsDir: config.storage.localObjectsDir,
    async close() {
      await app.close();
      await db.close();
      rmSync(path.dirname(config.storage.stagingDir), { recursive: true, force: true });
    },
  };
}

export interface DevSession {
  id: string;
  email: string;
  accessToken: string;
}

/** Create a development identity and return its bearer token. */
export async function signIn(
  app: FastifyInstance,
  email: string,
): Promise<DevSession> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/dev/session',
    payload: { email },
  });

  if (response.statusCode !== 200) {
    throw new Error(`dev sign-in failed: ${response.statusCode} ${response.body}`);
  }

  const body = response.json() as {
    accessToken: string;
    user: { id: string; email: string };
  };
  return { id: body.user.id, email: body.user.email, accessToken: body.accessToken };
}

export const authHeader = (session: DevSession): Record<string, string> => ({
  authorization: `Bearer ${session.accessToken}`,
});

export interface TestFileInput {
  name: string;
  folderId?: string | null;
  mimeType?: string;
  sizeBytes?: number;
  favorite?: boolean;
  description?: string | null;
  deleted?: boolean;
}

/**
 * Logical file rows without content are created by the upload pipeline, so
 * metadata tests insert them directly and then exercise the routes.
 */
export async function insertTestFile(
  db: Db,
  userId: string,
  input: TestFileInput,
): Promise<string> {
  const dot = input.name.lastIndexOf('.');
  const extension = dot > 0 ? input.name.slice(dot + 1).toLowerCase() : null;

  const { rows } = await db.query<{ id: string }>(
    `insert into public.files
       (user_id, folder_id, name, extension, mime_type, logical_size_bytes, favorite, description, deleted_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, case when $9 then now() else null end)
     returning id`,
    [
      userId,
      input.folderId ?? null,
      input.name,
      extension,
      input.mimeType ?? 'application/octet-stream',
      input.sizeBytes ?? 1024,
      input.favorite ?? false,
      input.description ?? null,
      input.deleted ?? false,
    ],
  );

  const id = rows[0]?.id;
  if (!id) {
    throw new Error('insertTestFile returned no id');
  }
  return id;
}

const sha256 = (buffer: Buffer): string => createHash('sha256').update(buffer).digest('hex');

export interface TestVersion {
  versionId: string;
  storageObjectId: string;
  ciphertext: Buffer;
  manifest: Record<string, unknown>;
}

/**
 * Writes a real local-provider object and inserts the immutable version that
 * references it. Ciphertext is fabricated but layout-accurate: the API stores
 * and streams opaque bytes, so share/download and purge tests need a real file
 * on disk, not a real encryption.
 */
export async function insertTestVersion(
  db: Db,
  objectsDir: string,
  userId: string,
  fileId: string,
  options: { plaintext?: Buffer; versionNumber?: number } = {},
): Promise<TestVersion> {
  const plaintext = options.plaintext ?? Buffer.from('stackbase test plaintext');
  const ciphertext = Buffer.concat([
    Buffer.alloc(24, 5),
    plaintext,
    Buffer.alloc(17, 9),
  ]);

  const connection = await db.query<{ id: string }>(
    `insert into public.storage_connections
       (user_id, provider, connection_status, account_identifier, last_validated_at)
     values ($1, 'local', 'connected', 'Local development storage', now())
     on conflict (user_id, provider) do update
       set connection_status = 'connected', last_validated_at = now()
     returning id`,
    [userId],
  );
  const connectionId = connection.rows[0]?.id;
  if (!connectionId) throw new Error('test storage connection was not created');

  const objectId = randomUUID();
  const key = `${userId}/${objectId}.bin`;
  mkdirSync(path.join(objectsDir, userId), { recursive: true });
  writeFileSync(path.join(objectsDir, key), ciphertext);

  const manifest = {
    format: 'stackbase-file',
    version: 1,
    cipher: 'xchacha20poly1305-secretstream',
    chunking: { plaintextChunkSize: 65_536, totalChunks: 1 },
    plaintextSize: plaintext.length,
    ciphertextSize: ciphertext.length,
    ciphertextHash: sha256(ciphertext),
    plaintextFingerprint: sha256(plaintext),
    streamHeader: Buffer.alloc(24, 5).toString('base64'),
    wrappedKey: {
      algorithm: 'xsalsa20poly1305',
      nonce: Buffer.alloc(24, 6).toString('base64'),
      ciphertext: Buffer.alloc(48, 7).toString('base64'),
    },
  };

  const object = await db.query<{ id: string }>(
    `insert into public.storage_objects
       (id, user_id, storage_connection_id, provider, provider_reference,
        remote_size_bytes, ciphertext_hash, storage_status)
     values ($1, $2, $3, 'local', $4::jsonb, $5, $6, 'available')
     returning id`,
    [
      objectId,
      userId,
      connectionId,
      JSON.stringify({ key, size: ciphertext.length }),
      ciphertext.length,
      sha256(ciphertext),
    ],
  );
  const storageObjectId = object.rows[0]?.id;
  if (!storageObjectId) throw new Error('test storage object was not created');

  const versionNumber =
    options.versionNumber ??
    (await db.query<{ next: unknown }>(
      `select coalesce(max(version_number), 0) + 1 as next
         from public.file_versions where user_id = $1 and file_id = $2`,
      [userId, fileId],
    )).rows[0]?.next;

  const version = await db.query<{ id: string }>(
    `insert into public.file_versions
       (user_id, file_id, version_number, size_bytes, ciphertext_hash,
        plaintext_fingerprint, encryption_format_version, encryption_manifest,
        storage_object_id, created_by)
     values ($1, $2, $3, $4, $5, $6, 'stackbase/1', $7::jsonb, $8, $1)
     returning id`,
    [
      userId,
      fileId,
      Number(versionNumber),
      plaintext.length,
      sha256(ciphertext),
      sha256(plaintext),
      JSON.stringify(manifest),
      storageObjectId,
    ],
  );
  const versionId = version.rows[0]?.id;
  if (!versionId) throw new Error('test file version was not created');

  await db.query(
    `update public.files
        set current_version_id = $3,
            logical_size_bytes = $4,
            content_fingerprint = $5
      where user_id = $1 and id = $2`,
    [userId, fileId, versionId, plaintext.length, sha256(plaintext)],
  );

  return { versionId, storageObjectId, ciphertext, manifest };
}

/** A structurally valid share-wrapped data key; the API never decrypts it. */
export const testWrappedKey = () => ({
  algorithm: 'xsalsa20poly1305' as const,
  nonce: Buffer.alloc(24, 3).toString('base64'),
  ciphertext: Buffer.alloc(48, 4).toString('base64'),
});
