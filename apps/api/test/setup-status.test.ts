import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SetupStatusResponse } from '@stackbase/contracts';
import {
  authHeader,
  createTestContext,
  signIn,
  testConfig,
  type DevSession,
  type TestContext,
} from './helpers';

const SESSION_KEY = Buffer.alloc(32, 7).toString('base64');
const SALT = Buffer.alloc(16, 1).toString('base64');
const NONCE = Buffer.alloc(24, 2).toString('base64');
const WRAPPED_KEY = Buffer.alloc(48, 3).toString('base64');
const VERIFIER = Buffer.alloc(51, 4).toString('base64');

let ctx: TestContext;
let alice: DevSession;
let bob: DevSession;

beforeAll(async () => {
  ctx = await createTestContext();
  alice = await signIn(ctx.app, 'setup-alice@example.com');
  bob = await signIn(ctx.app, 'setup-bob@example.com');
});

afterAll(async () => {
  await ctx.close();
});

const getStatus = async (session: DevSession): Promise<SetupStatusResponse> => {
  const response = await ctx.app.inject({
    method: 'GET',
    url: '/api/v1/setup/status',
    headers: authHeader(session),
  });
  expect(response.statusCode).toBe(200);
  return response.json() as SetupStatusResponse;
};

describe('setup status', () => {
  it('reports a real, provisioned local connection for a new account', async () => {
    const status = await getStatus(bob);
    expect(status.library).toEqual({ files: 0, folders: 0, bytes: 0 });
    expect(status.storage).toMatchObject({
      provider: 'local',
      status: 'connected',
      accountIdentifier: 'Local development storage',
    });
    expect(status.encryption.vault).toBe('not_configured');
  });

  it('reflects real metadata rows and never leaks another owner’s data', async () => {
    const folder = await ctx.db.query<{ id: string }>(
      'insert into public.folders (user_id, name) values ($1, $2) returning id',
      [alice.id, 'Documents'],
    );
    await ctx.db.query(
      `insert into public.files (user_id, folder_id, name, mime_type, logical_size_bytes)
       values ($1, $2, $3, $4, $5)`,
      [alice.id, folder.rows[0]?.id, 'contract.pdf', 'application/pdf', 4096],
    );

    const aliceStatus = await getStatus(alice);
    expect(aliceStatus.library).toEqual({ files: 1, folders: 1, bytes: 4096 });

    const bobStatus = await getStatus(bob);
    expect(bobStatus.library).toEqual({ files: 0, folders: 0, bytes: 0 });
  });

  it('excludes trashed files from the library summary', async () => {
    await ctx.db.query(
      'update public.files set deleted_at = now() where user_id = $1 and name = $2',
      [alice.id, 'contract.pdf'],
    );

    const status = await getStatus(alice);
    expect(status.library.files).toBe(0);
    expect(status.library.bytes).toBe(0);
    expect(status.library.folders).toBe(1);
  });

  it('reports only the active provider and never session material', async () => {
    // A stored Telegram row exists but the deployment runs the local provider,
    // so the status must not present the Telegram connection as active.
    await ctx.db.query(
      `insert into public.storage_connections
         (user_id, provider, connection_status, account_identifier, encrypted_session, session_key_version, last_validated_at)
       values ($1, 'telegram', 'connected', '+15550000000', '\\x00'::bytea, 'v1', now())`,
      [alice.id],
    );

    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/setup/status',
      headers: authHeader(alice),
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain('encrypted_session');
    expect(response.body).not.toContain('\\x00');
    expect(response.body).not.toContain('+15550000000');

    const status = response.json() as SetupStatusResponse;
    expect(status.storage.provider).toBe('local');
    expect(status.storage.accountIdentifier).toBe('Local development storage');
  });

  it('reports the vault once it exists and never for another owner', async () => {
    await ctx.db.query(
      `insert into public.encryption_vaults
         (user_id, format_version, kdf_algorithm, kdf_ops_limit, kdf_mem_limit_bytes, kdf_salt,
          wrap_algorithm, wrapped_key_nonce, wrapped_key_ciphertext, verifier_nonce, verifier_ciphertext)
       values ($1, 'stackbase/1', 'argon2id13', 3, 67108864, $2, 'xsalsa20poly1305', $3, $4, $3, $5)`,
      [alice.id, SALT, NONCE, WRAPPED_KEY, VERIFIER],
    );

    expect((await getStatus(alice)).encryption.vault).toBe('configured');
    expect((await getStatus(bob)).encryption.vault).toBe('not_configured');
  });
});

describe('setup status with the Telegram provider', () => {
  let telegramCtx: TestContext;
  let carol: DevSession;

  beforeAll(async () => {
    telegramCtx = await createTestContext(
      testConfig({
        STORAGE_PROVIDER: 'telegram',
        TELEGRAM_API_ID: '123456',
        TELEGRAM_API_HASH: '0123456789abcdef0123456789abcdef',
        SESSION_ENCRYPTION_KEY: SESSION_KEY,
      }),
    );
    carol = await signIn(telegramCtx.app, 'setup-carol@example.com');
  });

  afterAll(async () => {
    await telegramCtx.close();
  });

  it('reports not_configured until a session is stored, then the account without secrets', async () => {
    const before = await telegramCtx.app.inject({
      method: 'GET',
      url: '/api/v1/setup/status',
      headers: authHeader(carol),
    });
    expect((before.json() as SetupStatusResponse).storage).toMatchObject({
      provider: 'telegram',
      status: 'not_configured',
      accountIdentifier: null,
    });

    await telegramCtx.db.query(
      `insert into public.storage_connections
         (user_id, provider, connection_status, account_identifier, encrypted_session, session_key_version, last_validated_at)
       values ($1, 'telegram', 'connected', '@stackbase_dev', '\\x00'::bytea, 'v1', now())`,
      [carol.id],
    );

    const after = await telegramCtx.app.inject({
      method: 'GET',
      url: '/api/v1/setup/status',
      headers: authHeader(carol),
    });
    const status = after.json() as SetupStatusResponse;
    expect(status.storage).toMatchObject({
      provider: 'telegram',
      status: 'connected',
      accountIdentifier: '@stackbase_dev',
    });
    expect(after.body).not.toContain('\\x00');
  });
});
