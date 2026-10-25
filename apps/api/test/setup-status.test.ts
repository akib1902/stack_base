import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SetupStatusResponse } from '@stackbase/contracts';
import { authHeader, createTestContext, signIn, type DevSession, type TestContext } from './helpers';

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
  it('reports zero real library values for a new account', async () => {
    const status = await getStatus(bob);
    expect(status.library).toEqual({ files: 0, folders: 0, bytes: 0 });
    expect(status.storage).toMatchObject({
      provider: 'telegram',
      status: 'not_configured',
      accountIdentifier: null,
    });
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

  it('reports a configured storage connection without exposing session material', async () => {
    await ctx.db.query(
      `insert into public.storage_connections
         (user_id, connection_status, account_identifier, encrypted_session, session_key_version, last_validated_at)
       values ($1, 'connected', '+15550000000', '\\x00'::bytea, 'v1', now())`,
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

    const status = response.json() as SetupStatusResponse;
    expect(status.storage.status).toBe('connected');
    expect(status.storage.accountIdentifier).toBe('+15550000000');
    expect(status.storage.lastValidatedAt).not.toBeNull();

    const bobStatus = await getStatus(bob);
    expect(bobStatus.storage.status).toBe('not_configured');
  });
});
