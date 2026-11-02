import type { FastifyInstance } from 'fastify';
import type { Static } from '@sinclair/typebox';
import {
  AuthConfigResponseSchema,
  SupabaseRefreshRequestSchema,
  SupabaseSessionResponseSchema,
  SupabaseSignInRequestSchema,
  type AuthConfigResponse,
  type SupabaseSessionResponse,
} from '@stackbase/contracts';
import type { Config } from '../../config/env';
import { ApiError, authRequired } from '../../errors';
import { readBearerToken } from '../../security/token';

const UPSTREAM_TIMEOUT_MS = 10_000;

interface SupabaseTokenPayload {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  expires_at?: unknown;
}

function supabaseEndpoint(config: Config): { baseUrl: string; publishableKey: string } {
  const auth = config.auth;
  if (auth.mode !== 'supabase') {
    throw new ApiError(
      'SUPABASE_NOT_CONFIGURED',
      503,
      'Supabase Auth is not enabled for this deployment.',
    );
  }
  if (!auth.publishableKey) {
    throw new ApiError(
      'SUPABASE_NOT_CONFIGURED',
      503,
      'The Supabase publishable key is not configured. Add it in Deployment settings.',
    );
  }
  return {
    baseUrl: auth.issuer.replace(/\/auth\/v1$/, ''),
    publishableKey: auth.publishableKey,
  };
}

function sessionFrom(payload: SupabaseTokenPayload | null): SupabaseSessionResponse {
  if (
    !payload ||
    typeof payload.access_token !== 'string' ||
    payload.access_token.length === 0 ||
    typeof payload.refresh_token !== 'string' ||
    payload.refresh_token.length === 0
  ) {
    throw new ApiError(
      'SUPABASE_UNAVAILABLE',
      502,
      'The authentication provider returned an incomplete session.',
    );
  }

  const expiresAt =
    typeof payload.expires_at === 'number'
      ? payload.expires_at * 1000
      : Date.now() +
        (typeof payload.expires_in === 'number' && payload.expires_in > 0
          ? payload.expires_in
          : 3600) *
          1000;

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

function upstreamFailure(status: number, operation: 'password' | 'refresh'): ApiError {
  if (status === 429) {
    return new ApiError(
      'RATE_LIMITED',
      429,
      'Too many authentication attempts. Wait a minute and try again.',
    );
  }
  if (status >= 400 && status < 500) {
    return authRequired(
      operation === 'refresh'
        ? 'Your session has expired. Sign in again.'
        : 'Email or password is incorrect, or the email address has not been confirmed.',
    );
  }
  return new ApiError(
    'SUPABASE_UNAVAILABLE',
    502,
    'The authentication provider is unavailable. Try again shortly.',
  );
}

async function exchangeSession(
  config: Config,
  operation: 'password' | 'refresh',
  body: Record<string, string>,
): Promise<SupabaseSessionResponse> {
  const { baseUrl, publishableKey } = supabaseEndpoint(config);
  const grantType = operation === 'password' ? 'password' : 'refresh_token';

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/auth/v1/token?grant_type=${grantType}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: publishableKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(
      'SUPABASE_UNAVAILABLE',
      502,
      'The authentication provider is unreachable. Try again shortly.',
    );
  }

  if (!response.ok) throw upstreamFailure(response.status, operation);

  const payload = (await response.json().catch(() => null)) as SupabaseTokenPayload | null;
  return sessionFrom(payload);
}

async function revokeSession(config: Config, accessToken: string): Promise<void> {
  const auth = config.auth;
  if (auth.mode !== 'supabase' || !auth.publishableKey) return;

  try {
    await fetch(`${auth.issuer.replace(/\/auth\/v1$/, '')}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        apikey: auth.publishableKey,
        authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    // Sign-out always clears the local cookies; upstream revocation is best effort.
  }
}

/**
 * Supabase Auth is exchanged server-to-server. The browser receives only
 * httpOnly cookies, never the Supabase URL, publishable key, access token or
 * refresh token. The API applies the same owner-managed credentials used by
 * token verification.
 */
export function registerAuthRoutes(
  app: FastifyInstance,
  deps: { config: Config },
): void {
  app.get(
    '/api/v1/auth/config',
    {
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
      schema: { response: { 200: AuthConfigResponseSchema } },
    },
    async (): Promise<AuthConfigResponse> => {
      const auth = deps.config.auth;
      return {
        mode: auth.mode,
        supabaseReady: auth.mode === 'supabase' && Boolean(auth.publishableKey),
      };
    },
  );

  app.post<{ Body: Static<typeof SupabaseSignInRequestSchema> }>(
    '/api/v1/auth/supabase/sign-in',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        body: SupabaseSignInRequestSchema,
        response: { 200: SupabaseSessionResponseSchema },
      },
    },
    async (request) => {
      const { email, password } = request.body;
      return exchangeSession(deps.config, 'password', { email, password });
    },
  );

  app.post<{ Body: Static<typeof SupabaseRefreshRequestSchema> }>(
    '/api/v1/auth/supabase/refresh',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        body: SupabaseRefreshRequestSchema,
        response: { 200: SupabaseSessionResponseSchema },
      },
    },
    async (request) => {
      return exchangeSession(deps.config, 'refresh', {
        refresh_token: request.body.refreshToken,
      });
    },
  );

  app.post(
    '/api/v1/auth/supabase/sign-out',
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const accessToken = readBearerToken(request.headers.authorization);
      if (accessToken) await revokeSession(deps.config, accessToken);
      return reply.status(204).send();
    },
  );
}