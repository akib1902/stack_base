import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { MeResponse } from '@stackbase/contracts';
import {
  TEST_SECRET,
  authHeader,
  createTestContext,
  signIn,
  testConfig,
  type TestContext,
} from './helpers';

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext();
});

afterAll(async () => {
  await ctx.close();
});

const devToken = async (
  claims: { sub: string; exp?: number; aud?: string; iss?: string; role?: string },
): Promise<string> =>
  new SignJWT({ email: 'token@example.com', role: claims.role ?? 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuer(claims.iss ?? 'stackbase-dev')
    .setAudience(claims.aud ?? 'stackbase-api')
    .setIssuedAt()
    .setExpirationTime(claims.exp ?? Math.floor(Date.now() / 1000) + 600)
    .sign(new TextEncoder().encode(TEST_SECRET));

describe('authorization boundary', () => {
  it('rejects requests without a bearer token', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/v1/me' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: 'AUTH_REQUIRED' } });
  });

  it('rejects a malformed bearer token', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: 'Bearer not-a-jwt' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects an expired token', async () => {
    const token = await devToken({
      sub: '11111111-1111-4111-8111-111111111111',
      exp: Math.floor(Date.now() / 1000) - 120,
    });
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects a token with the wrong audience', async () => {
    const token = await devToken({
      sub: '11111111-1111-4111-8111-111111111111',
      aud: 'some-other-api',
    });
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects a non-user (service) role token', async () => {
    const token = await devToken({
      sub: '11111111-1111-4111-8111-111111111111',
      role: 'service_role',
    });
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(401);
  });
});

describe('authenticated identity', () => {
  it('issues a session for a new local identity and provisions profile settings', async () => {
    const session = await signIn(ctx.app, 'first@example.com');
    expect(session.id).toMatch(/^[0-9a-f-]{36}$/);

    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: authHeader(session),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as MeResponse;
    expect(body.user.id).toBe(session.id);
    expect(body.user.email).toBe('first@example.com');
    expect(body.settings.theme).toBe('amber');
    expect(body.settings.defaultView).toBe('grid');
  });

  it('derives identity from the token, never from client input', async () => {
    const alice = await signIn(ctx.app, 'alice@example.com');
    const bob = await signIn(ctx.app, 'bob@example.com');

    const response = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/me?userId=${bob.id}&user_id=${bob.id}`,
      headers: { ...authHeader(alice), 'x-user-id': bob.id },
    });

    expect(response.statusCode).toBe(200);
    expect((response.json() as MeResponse).user.id).toBe(alice.id);
  });

  it('normalizes identity email case to a single local account', async () => {
    const lower = await signIn(ctx.app, 'case@example.com');
    const mixed = await signIn(ctx.app, 'CASE@Example.com');
    expect(mixed.id).toBe(lower.id);
  });
});

describe('development sign-in gating', () => {
  it('is absent when the API runs in production', async () => {
    const productionConfig = { ...testConfig(), isProduction: true, nodeEnv: 'production' as const };
    const context = await createTestContext(productionConfig);

    try {
      // Production without Supabase Auth is rejected at build time in server.ts;
      // this asserts the route itself never exists, even if a dev config leaks in.
      const response = await context.app.inject({
        method: 'POST',
        url: '/api/v1/dev/session',
        payload: { email: 'prod@example.com' },
      });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ error: { code: 'ROUTE_NOT_FOUND' } });
    } finally {
      await context.close();
    }
  });
});

describe('error envelope', () => {
  it('validates request bodies with a stable error code', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/dev/session',
      payload: { email: 'not-an-email' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('never leaks stack traces on unknown routes', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/v1/nope' });
    expect(response.statusCode).toBe(404);
    expect(response.body).not.toContain('at ');
    expect(response.json()).toMatchObject({ error: { code: 'ROUTE_NOT_FOUND' } });
  });

  it('marks API responses as non-cacheable', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/health' });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});
