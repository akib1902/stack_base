import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { loadConfig, type Config } from '../src/config/env';
import { createPGliteDb, type Db } from '../src/database/db';
import { runMigrations } from '../src/database/migrations';

export const TEST_SECRET = 'test-only-secret-value-with-enough-characters';

export function testConfig(overrides: Record<string, string> = {}): Config {
  return loadConfig({
    NODE_ENV: 'test',
    AUTH_MODE: 'dev',
    DEV_AUTH_SECRET: TEST_SECRET,
    WEB_ORIGIN: 'http://localhost:3000',
    ...overrides,
  });
}

export interface TestContext {
  db: Db;
  app: FastifyInstance;
  config: Config;
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
    async close() {
      await app.close();
      await db.close();
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
 * Logical file rows are created by the upload pipeline, which ships in the
 * storage milestone, so metadata tests insert them directly and then exercise
 * every route through the HTTP layer.
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
