import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DeploymentSettingsResponse, MeResponse } from '@stackbase/contracts';
import {
  authHeader,
  createTestContext,
  signIn,
  testConfig,
  type DevSession,
  type TestContext,
} from './helpers';

const SETTINGS_KEY = Buffer.alloc(32, 11).toString('base64');
const SESSION_KEY = Buffer.alloc(32, 12).toString('base64');
const API_HASH = '0123456789abcdef0123456789abcdef';
const JWT_SECRET = 'test-supabase-jwt-secret-that-must-not-leak';
const PUBLISHABLE = 'sb_publishable_test_value_that_must_not_leak';

let ctx: TestContext;
let owner: DevSession;
let member: DevSession;

beforeAll(async () => {
  ctx = await createTestContext(
    testConfig({
      SETTINGS_ENCRYPTION_KEY: SETTINGS_KEY,
      SESSION_ENCRYPTION_KEY: SESSION_KEY,
    }),
  );
  owner = await signIn(ctx.app, 'deployment-owner@example.com');
  member = await signIn(ctx.app, 'deployment-member@example.com');
});

afterAll(async () => {
  await ctx.close();
});

const getSettings = async (session: DevSession) =>
  ctx.app.inject({
    method: 'GET',
    url: '/api/v1/admin/deployment',
    headers: authHeader(session),
  });

describe('deployment settings access', () => {
  it('bootstraps exactly the first account as owner', async () => {
    const ownerMe = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: authHeader(owner),
    });
    const memberMe = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: authHeader(member),
    });

    expect((ownerMe.json() as MeResponse).isAdmin).toBe(true);
    expect((memberMe.json() as MeResponse).isAdmin).toBe(false);
  });

  it('lets the owner read sanitized state without any secret', async () => {
    const response = await getSettings(owner);
    expect(response.statusCode).toBe(200);
    const body = response.json() as DeploymentSettingsResponse;
    expect(body.secretStorage.configured).toBe(true);
    expect(body.auth).toMatchObject({ mode: 'dev', publishableKeyConfigured: false });
    expect(body.storage).toMatchObject({ provider: 'local', sessionKeyConfigured: true });
  });

  it('refuses every non-owner account and anonymous caller', async () => {
    expect((await getSettings(member)).statusCode).toBe(403);
    expect((await getSettings(member)).json()).toMatchObject({
      error: { code: 'FORBIDDEN' },
    });

    const anonymous = await ctx.app.inject({ method: 'GET', url: '/api/v1/admin/deployment' });
    expect(anonymous.statusCode).toBe(401);
  });
});

describe('deployment settings updates', () => {
  it('seals secrets, applies Telegram credentials and writes a secret-free audit row', async () => {
    const response = await ctx.app.inject({
      method: 'PUT',
      url: '/api/v1/admin/deployment',
      headers: authHeader(owner),
      payload: {
        supabase: {
          url: 'https://test-project.supabase.co/auth/v1',
          jwksUrl: 'https://test-project.supabase.co/auth/v1/.well-known/jwks.json',
          publishableKey: PUBLISHABLE,
          jwtSecret: JWT_SECRET,
        },
        telegram: {
          provider: 'telegram',
          apiId: 123456,
          apiHash: API_HASH,
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain(PUBLISHABLE);
    expect(response.body).not.toContain(JWT_SECRET);
    expect(response.body).not.toContain(API_HASH);

    const view = response.json() as DeploymentSettingsResponse;
    expect(view.auth).toMatchObject({
      supabaseUrl: 'https://test-project.supabase.co',
      publishableKeyConfigured: true,
      jwtSecretConfigured: true,
      source: 'saved',
    });
    expect(view.storage).toMatchObject({
      provider: 'telegram',
      telegramApiId: 123456,
      apiHashConfigured: true,
      source: 'saved',
    });

    expect(ctx.config.storage.provider).toBe('telegram');
    expect(ctx.config.storage.telegram).toEqual({ apiId: 123456, apiHash: API_HASH });

    const row = await ctx.db.query<{
      publishable: string | null;
      jwt: string | null;
      hash: string | null;
    }>(
      `select
         supabase_publishable_key_sealed as publishable,
         supabase_jwt_secret_sealed as jwt,
         telegram_api_hash_sealed as hash
       from public.deployment_settings where id = true`,
    );
    expect(row.rows[0]?.publishable).toMatch(/^v1\./);
    expect(row.rows[0]?.jwt).toMatch(/^v1\./);
    expect(row.rows[0]?.hash).toMatch(/^v1\./);
    expect(row.rows[0]?.publishable).not.toContain(PUBLISHABLE);
    expect(row.rows[0]?.jwt).not.toContain(JWT_SECRET);
    expect(row.rows[0]?.hash).not.toContain(API_HASH);

    const audit = await ctx.db.query<{ metadata: unknown }>(
      `select event_metadata as metadata from public.audit_events
        where user_id = $1 and event_type = 'deployment.settings.update'`,
      [owner.id],
    );
    expect(audit.rows).toHaveLength(1);
    const metadata = JSON.stringify(audit.rows[0]?.metadata);
    expect(metadata).toContain('supabase.jwtSecret');
    expect(metadata).not.toContain(JWT_SECRET);
    expect(metadata).not.toContain(API_HASH);
    expect(metadata).not.toContain(PUBLISHABLE);
  });

  it('can clear saved secrets deliberately without echoing them', async () => {
    const response = await ctx.app.inject({
      method: 'PUT',
      url: '/api/v1/admin/deployment',
      headers: authHeader(owner),
      payload: {
        supabase: { publishableKey: null, jwtSecret: null },
        telegram: { provider: 'local', apiId: null, apiHash: null },
      },
    });
    expect(response.statusCode).toBe(200);
    const view = response.json() as DeploymentSettingsResponse;
    expect(view.auth.publishableKeyConfigured).toBe(false);
    expect(view.auth.jwtSecretConfigured).toBe(false);
    expect(view.storage.provider).toBe('local');
    expect(view.storage.apiHashConfigured).toBe(false);
  });

  it('rejects a malformed Telegram hash before changing the row', async () => {
    const response = await ctx.app.inject({
      method: 'PUT',
      url: '/api/v1/admin/deployment',
      headers: authHeader(owner),
      payload: { telegram: { apiHash: 'not-a-hash' } },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('rejects non-owner writes even when the body is valid', async () => {
    const response = await ctx.app.inject({
      method: 'PUT',
      url: '/api/v1/admin/deployment',
      headers: authHeader(member),
      payload: { supabase: { url: null } },
    });
    expect(response.statusCode).toBe(403);
  });
});

describe('secret storage key', () => {
  it('refuses to save a secret when SETTINGS_ENCRYPTION_KEY is absent', async () => {
    const noKey = await createTestContext(testConfig());
    try {
      const admin = await signIn(noKey.app, 'no-key-owner@example.com');
      const response = await noKey.app.inject({
        method: 'PUT',
        url: '/api/v1/admin/deployment',
        headers: authHeader(admin),
        payload: { supabase: { publishableKey: PUBLISHABLE } },
      });
      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({ error: { code: 'SETTINGS_KEY_MISSING' } });
    } finally {
      await noKey.close();
    }
  });
});
