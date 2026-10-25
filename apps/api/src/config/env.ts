import path from 'node:path';
import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

/**
 * Raw environment schema. Values arrive as strings; the typed Config below
 * performs coercion and cross-field validation with actionable messages.
 */
const RawEnvSchema = Type.Object({
  NODE_ENV: Type.Optional(Type.String()),
  HOST: Type.Optional(Type.String({ minLength: 1 })),
  PORT: Type.Optional(Type.String({ pattern: '^[0-9]{1,5}$' })),
  WEB_ORIGIN: Type.Optional(Type.String({ minLength: 1 })),
  AUTH_MODE: Type.Optional(Type.Union([Type.Literal('dev'), Type.Literal('supabase')])),
  DEV_AUTH_SECRET: Type.Optional(Type.String({ minLength: 32 })),
  DEV_SESSION_TTL_SECONDS: Type.Optional(Type.String({ pattern: '^[0-9]{1,7}$' })),
  SUPABASE_URL: Type.Optional(Type.String({ minLength: 1 })),
  SUPABASE_JWT_SECRET: Type.Optional(Type.String({ minLength: 1 })),
  SUPABASE_JWKS_URL: Type.Optional(Type.String({ minLength: 1 })),
  DATABASE_URL: Type.Optional(Type.String()),
  STACKBASE_LOCAL_AUTH_STUB: Type.Optional(Type.String()),
  LOG_LEVEL: Type.Optional(Type.String()),
});

type AuthConfig =
  | {
      mode: 'dev';
      secret: string;
      sessionTtlSeconds: number;
      issuer: string;
      audience: string;
    }
  | {
      mode: 'supabase';
      issuer: string;
      jwksUrl: string | null;
      jwtSecret: string | null;
      audience: string;
    };

export interface DatabaseConfig {
  /** When null, the local PGlite database is used. */
  url: string | null;
  localDataDir: string;
  allowLocalAuthStub: boolean;
}

export interface Config {
  nodeEnv: 'development' | 'test' | 'production';
  isProduction: boolean;
  host: string;
  port: number;
  webOrigin: string;
  logLevel: string;
  auth: AuthConfig;
  database: DatabaseConfig;
}

export class ConfigError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`Invalid configuration:\n- ${problems.join('\n- ')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

const parseBoolean = (value: string | undefined): boolean =>
  value === '1' || value === 'true';

/**
 * Parse and validate configuration. Pure: callers pass the environment source,
 * which keeps tests independent of ambient process state.
 */
export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const normalized: Record<string, string | undefined> = {};
  for (const key of Object.keys(RawEnvSchema.properties)) {
    const value = source[key];
    if (value !== undefined && value !== '') {
      normalized[key] = value;
    }
  }

  const raw = Value.Parse(RawEnvSchema, normalized) as Static<typeof RawEnvSchema>;
  const problems: string[] = [];

  const nodeEnv = raw.NODE_ENV ?? (source['NODE_ENV'] === 'test' ? 'test' : 'development');
  if (nodeEnv !== 'development' && nodeEnv !== 'test' && nodeEnv !== 'production') {
    problems.push(`NODE_ENV must be development, test, or production (received "${nodeEnv}")`);
  }

  const authMode = raw.AUTH_MODE ?? 'dev';
  const auth = buildAuthConfig(raw, authMode, nodeEnv, problems);

  // PORT=0 means "any free port" to most tooling and cannot be advertised to the
  // web app, so it is treated as unset and the documented default is used.
  const port = raw.PORT && raw.PORT !== '0' ? Number.parseInt(raw.PORT, 10) : 8787;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    problems.push('PORT must be an integer between 1 and 65535');
  }

  if (problems.length > 0) {
    throw new ConfigError(problems);
  }

  return {
    nodeEnv: nodeEnv as Config['nodeEnv'],
    isProduction: nodeEnv === 'production',
    host: raw.HOST ?? '127.0.0.1',
    port,
    webOrigin: raw.WEB_ORIGIN ?? 'http://localhost:3000',
    logLevel: raw.LOG_LEVEL ?? 'info',
    auth: auth as AuthConfig,
    database: loadDatabaseConfig(source),
  };
}

/**
 * Database-only configuration for migration and reset tooling, which must work
 * without application auth secrets.
 */
export function loadDatabaseConfig(source: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  const raw = Value.Parse(RawEnvSchema, {
    DATABASE_URL: source.DATABASE_URL || undefined,
    STACKBASE_LOCAL_AUTH_STUB: source.STACKBASE_LOCAL_AUTH_STUB || undefined,
  });

  return {
    url: raw.DATABASE_URL ?? null,
    localDataDir:
      source.STACKBASE_LOCAL_DATA_DIR ?? path.resolve(process.cwd(), '.data', 'pglite'),
    allowLocalAuthStub: parseBoolean(raw.STACKBASE_LOCAL_AUTH_STUB),
  };
}

function buildAuthConfig(
  raw: Static<typeof RawEnvSchema>,
  mode: 'dev' | 'supabase',
  nodeEnv: string,
  problems: string[],
): AuthConfig | null {
  if (mode === 'dev') {
    if (nodeEnv === 'production') {
      problems.push(
        'AUTH_MODE=dev is disabled in production; configure Supabase Auth (AUTH_MODE=supabase)',
      );
      return null;
    }
    if (!raw.DEV_AUTH_SECRET) {
      problems.push(
        'DEV_AUTH_SECRET is required when AUTH_MODE=dev (at least 32 characters)',
      );
      return null;
    }
    const ttl = raw.DEV_SESSION_TTL_SECONDS
      ? Number.parseInt(raw.DEV_SESSION_TTL_SECONDS, 10)
      : 86_400;
    if (!Number.isInteger(ttl) || ttl < 300 || ttl > 2_592_000) {
      problems.push('DEV_SESSION_TTL_SECONDS must be between 300 and 2592000');
      return null;
    }
    return {
      mode: 'dev',
      secret: raw.DEV_AUTH_SECRET,
      sessionTtlSeconds: ttl,
      issuer: 'stackbase-dev',
      audience: 'stackbase-api',
    };
  }

  if (!raw.SUPABASE_URL) {
    problems.push('SUPABASE_URL is required when AUTH_MODE=supabase');
    return null;
  }
  if (!raw.SUPABASE_JWT_SECRET && !raw.SUPABASE_JWKS_URL) {
    problems.push(
      'AUTH_MODE=supabase requires SUPABASE_JWKS_URL (asymmetric signing keys) or SUPABASE_JWT_SECRET',
    );
    return null;
  }
  return {
    mode: 'supabase',
    issuer: `${raw.SUPABASE_URL.replace(/\/$/, '')}/auth/v1`,
    jwksUrl:
      raw.SUPABASE_JWKS_URL ??
      `${raw.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`,
    jwtSecret: raw.SUPABASE_JWT_SECRET ?? null,
    audience: 'authenticated',
  };
}
