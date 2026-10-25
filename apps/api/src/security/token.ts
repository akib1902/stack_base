import {
  SignJWT,
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';
import type { Config } from '../config/env';
import { authRequired } from '../errors';

export interface AuthenticatedUser {
  /** Derived from the verified token subject, never from client input. */
  id: string;
  email: string | null;
  role: 'authenticated';
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const readStringClaim = (payload: JWTPayload, key: string): string | null => {
  const value = payload[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
};

function toAuthenticatedUser(payload: JWTPayload): AuthenticatedUser {
  const subject = payload.sub;
  if (typeof subject !== 'string' || !UUID_PATTERN.test(subject)) {
    throw authRequired('The access token does not identify a valid user.');
  }

  const role = readStringClaim(payload, 'role');
  // Supabase service-role tokens must never be usable as end-user credentials.
  if (role !== null && role !== 'authenticated') {
    throw authRequired('The access token is not an end-user session.');
  }

  return {
    id: subject,
    email: readStringClaim(payload, 'email'),
    role: 'authenticated',
  };
}

export type TokenVerifier = (token: string) => Promise<AuthenticatedUser>;

export function createTokenVerifier(config: Config['auth']): TokenVerifier {
  const sharedSecret = new TextEncoder().encode(
    config.mode === 'dev' ? config.secret : (config.jwtSecret ?? ''),
  );

  let remoteKeys: JWTVerifyGetKey | null = null;
  if (config.mode === 'supabase' && !config.jwtSecret && config.jwksUrl) {
    remoteKeys = createRemoteJWKSet(new URL(config.jwksUrl));
  }

  return async (token: string) => {
    const key = remoteKeys ?? sharedSecret;
    const algorithms =
      config.mode === 'dev'
        ? (['HS256'] as const)
        : config.jwtSecret
          ? (['HS256'] as const)
          : (['RS256', 'ES256', 'EdDSA'] as const);

    try {
      const { payload } = await jwtVerify(token, key, {
        issuer: config.issuer,
        audience: config.audience,
        algorithms: [...algorithms],
        clockTolerance: 5,
      });
      return toAuthenticatedUser(payload);
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        throw error;
      }
      throw authRequired('The access token is invalid or has expired.');
    }
  };
}

export interface IssuedToken {
  accessToken: string;
  expiresAt: string;
}

/** Issue a local development session token (AUTH_MODE=dev only). */
export async function issueDevSessionToken(
  config: Extract<Config['auth'], { mode: 'dev' }>,
  input: { userId: string; email: string },
): Promise<IssuedToken> {
  const expiresAt = new Date(Date.now() + config.sessionTtlSeconds * 1000);
  const accessToken = await new SignJWT({
    email: input.email,
    role: 'authenticated',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(input.userId)
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(new TextEncoder().encode(config.secret));

  return { accessToken, expiresAt: expiresAt.toISOString() };
}

/** Extract a bearer token from an Authorization header. */
export function readBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, ...rest] = header.trim().split(/\s+/);
  if (!scheme || scheme.toLowerCase() !== 'bearer') return null;
  const token = rest.join('');
  return token.length > 0 ? token : null;
}
