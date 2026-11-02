import { SignJWT } from 'jose';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyDeploymentRow } from '../src/modules/deployment/repository';
import { sealSecret } from '../src/security/secret-box';
import { createTestContext, testConfig, type TestContext } from './helpers';

const SUPABASE_URL = 'https://project.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_test_key';
const JWT_SECRET = 'test-supabase-jwt-secret';
const SETTINGS_KEY = Buffer.alloc(32, 21).toString('base64');

let supabaseCtx: TestContext;
let noKeyCtx: TestContext;
let ownerToken: string;
let fetchMock: ReturnType<typeof vi.fn>;

const tokenResponse = (overrides: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 3600,
      ...overrides,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

beforeAll(async () => {
  supabaseCtx = await createTestContext(
    testConfig({
      AUTH_MODE: 'supabase',
      SUPABASE_URL,
      SUPABASE_JWT_SECRET: JWT_SECRET,
      SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
    }),
  );
  noKeyCtx = await createTestContext(
    testConfig({
      AUTH_MODE: 'supabase',
      SUPABASE_URL,
      SUPABASE_JWT_SECRET: JWT_SECRET,
    }),
  );

  const owner = await supabaseCtx.db.query<{ id: string }>(
    `insert into auth.users (email) values ('supabase-signin@example.com') returning id`,
  );
  const ownerId = owner.rows[0]?.id;
  if (!ownerId) throw new Error('Supabase sign-in test owner was not created');
  ownerToken = await new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(ownerId)
    .setIssuer(`${SUPABASE_URL}/auth/v1`)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT_SECRET));
});

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await supabaseCtx.close();
  await noKeyCtx.close();
});

describe('Supabase auth proxy', () => {
  it('reports the public auth mode and whether password sign-in is ready', async () => {
    const ready = await supabaseCtx.app.inject({ method: 'GET', url: '/api/v1/auth/config' });
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toEqual({ mode: 'supabase', supabaseReady: true });

    const notReady = await noKeyCtx.app.inject({ method: 'GET', url: '/api/v1/auth/config' });
    expect(notReady.statusCode).toBe(200);
    expect(notReady.json()).toEqual({ mode: 'supabase', supabaseReady: false });
  });

  it('exchanges a password server-to-server and returns only the session pair', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse());

    const response = await supabaseCtx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/supabase/sign-in',
      payload: { email: 'owner@example.com', password: 'correct horse battery staple' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: expect.any(String),
    });
    expect(response.body).not.toContain('correct horse battery staple');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${SUPABASE_URL}/auth/v1/token?grant_type=password`);
    expect(init.headers).toMatchObject({ apikey: PUBLISHABLE_KEY });
    expect(init.body).toBe(
      JSON.stringify({ email: 'owner@example.com', password: 'correct horse battery staple' }),
    );
  });

  it('does not leak the provider response when credentials are rejected', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error_description: 'Invalid login credentials' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const response = await supabaseCtx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/supabase/sign-in',
      payload: { email: 'owner@example.com', password: 'wrong-password' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: 'AUTH_REQUIRED' } });
    expect(response.body).not.toContain('Invalid login credentials');
    expect(response.body).not.toContain('wrong-password');
  });

  it('refreshes a session without exposing the refresh token to the response body', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse({ access_token: 'new-access' }));

    const response = await supabaseCtx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/supabase/refresh',
      payload: { refreshToken: 'old-refresh-token' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ accessToken: 'new-access' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`);
    expect(init.body).toBe(JSON.stringify({ refresh_token: 'old-refresh-token' }));
  });

  it('refuses to sign in when the owner has not saved a publishable key', async () => {
    const response = await noKeyCtx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/supabase/sign-in',
      payload: { email: 'owner@example.com', password: 'a-password' },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: { code: 'SUPABASE_NOT_CONFIGURED' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('applies a publishable key saved through Deployment settings', () => {
    const config = testConfig({
      AUTH_MODE: 'supabase',
      SUPABASE_URL,
      SUPABASE_JWT_SECRET: JWT_SECRET,
      SETTINGS_ENCRYPTION_KEY: SETTINGS_KEY,
    });
    const sealed = sealSecret('saved-publishable-key', config.settingsKey!);

    applyDeploymentRow(config, {
      supabaseUrl: null,
      supabasePublishableKeySealed: sealed,
      supabaseJwtSecretSealed: null,
      supabaseJwksUrl: null,
      storageProvider: null,
      telegramApiId: null,
      telegramApiHashSealed: null,
      updatedAt: null,
      updatedByEmail: null,
    });

    expect(config.auth).toMatchObject({
      mode: 'supabase',
      publishableKey: 'saved-publishable-key',
    });
  });

  it('revokes the upstream session on an authenticated sign-out', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const response = await supabaseCtx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/supabase/sign-out',
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(response.statusCode).toBe(204);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${SUPABASE_URL}/auth/v1/logout`);
    expect(init.headers).toMatchObject({
      apikey: PUBLISHABLE_KEY,
      authorization: `Bearer ${ownerToken}`,
    });
  });
});