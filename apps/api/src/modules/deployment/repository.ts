import type {
  DeploymentSettingsResponse,
  DeploymentSettingsUpdate,
  DeploymentSource,
  StorageProvider,
} from '@stackbase/contracts';
import type { Config } from '../../config/env';
import type { Db } from '../../database/db';
import { toIsoString } from '../../database/values';
import { ApiError } from '../../errors';
import { openSecret, sealSecret, type SettingsKey } from '../../security/secret-box';
import { recordAuditEvent } from '../audit/repository';

/**
 * Owner-managed integration settings.
 *
 * Only an owner reaches these functions (the route applies requireAdmin). Secret
 * material is sealed with SETTINGS_ENCRYPTION_KEY before it is written, and the
 * public view below exposes presence flags rather than values. The database URL
 * and a Supabase service_role key are intentionally outside this surface.
 */

interface DeploymentRow {
  supabaseUrl: string | null;
  supabasePublishableKeySealed: string | null;
  supabaseJwtSecretSealed: string | null;
  supabaseJwksUrl: string | null;
  storageProvider: StorageProvider | null;
  telegramApiId: number | null;
  telegramApiHashSealed: string | null;
  updatedAt: unknown;
  updatedByEmail: string | null;
}

const SELECT_DEPLOYMENT = `
  select
    d.supabase_url as "supabaseUrl",
    d.supabase_publishable_key_sealed as "supabasePublishableKeySealed",
    d.supabase_jwt_secret_sealed as "supabaseJwtSecretSealed",
    d.supabase_jwks_url as "supabaseJwksUrl",
    d.storage_provider as "storageProvider",
    d.telegram_api_id as "telegramApiId",
    d.telegram_api_hash_sealed as "telegramApiHashSealed",
    d.updated_at as "updatedAt",
    u.email as "updatedByEmail"
  from public.deployment_settings d
  left join auth.users u on u.id = d.updated_by
  where d.id = true
`;

export async function readDeploymentRow(db: Db): Promise<DeploymentRow | null> {
  const { rows } = await db.query<DeploymentRow>(SELECT_DEPLOYMENT);
  return rows[0] ?? null;
}

const isLocalHostname = (hostname: string): boolean =>
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '::1' ||
  hostname === '[::1]';

function normaliseUrl(
  raw: string,
  field: string,
  options: { production: boolean; stripAuthV1?: boolean },
): string {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new ApiError('VALIDATION_ERROR', 400, `${field} must be a complete http(s) URL.`);
  }

  if (parsed.username || parsed.password) {
    throw new ApiError('VALIDATION_ERROR', 400, `${field} must not contain credentials.`);
  }
  if (parsed.search || parsed.hash) {
    throw new ApiError('VALIDATION_ERROR', 400, `${field} must not contain a query or fragment.`);
  }
  if (
    parsed.protocol !== 'https:' &&
    !(parsed.protocol === 'http:' && !options.production && isLocalHostname(parsed.hostname))
  ) {
    throw new ApiError(
      'VALIDATION_ERROR',
      400,
      `${field} must use HTTPS (plain HTTP is accepted only for localhost in development).`,
    );
  }

  let pathname = parsed.pathname.replace(/\/+$/, '');
  if (options.stripAuthV1 && pathname.endsWith('/auth/v1')) {
    pathname = pathname.slice(0, -'/auth/v1'.length).replace(/\/+$/, '');
  }
  parsed.pathname = pathname || '/';
  return parsed.toString().replace(/\/$/, '');
}

function supabaseBaseFromAuth(auth: Config['auth']): string | null {
  if (auth.mode !== 'supabase') return null;
  return auth.issuer.replace(/\/auth\/v1$/, '');
}

function requireKey(config: Config): SettingsKey {
  if (!config.settingsKey) {
    throw new ApiError(
      'SETTINGS_KEY_MISSING',
      503,
      'SETTINGS_ENCRYPTION_KEY is not configured. Add a 32-byte base64 key to the API environment before saving secrets.',
    );
  }
  return config.settingsKey;
}

/** Apply one row to the live config. Unreadable sealed values keep the env fallback. */
export function applyDeploymentRow(config: Config, row: DeploymentRow | null): string[] {
  if (!row) return [];
  const warnings: string[] = [];
  const key = config.settingsKey;

  config.storage.provider = row.storageProvider ?? config.storage.environmentProvider;

  const envTelegram = config.storage.environmentTelegram;
  const telegramApiId = row.telegramApiId ?? envTelegram?.apiId ?? null;
  let apiHash = envTelegram?.apiHash ?? null;
  if (row.telegramApiHashSealed) {
    try {
      if (!key) throw new Error('missing key');
      apiHash = openSecret(row.telegramApiHashSealed, key);
    } catch {
      warnings.push(
        'Saved Telegram API hash could not be opened; the environment value is in use.',
      );
    }
  }
  config.storage.telegram =
    telegramApiId !== null && apiHash ? { apiId: telegramApiId, apiHash } : null;

  const envAuth = config.authEnv;
  if (envAuth.mode !== 'supabase') {
    config.auth = envAuth;
    return warnings;
  }

  if (!row.supabaseUrl && !row.supabaseJwtSecretSealed && !row.supabaseJwksUrl) {
    config.auth = envAuth;
    return warnings;
  }

  const sealedJwt = row.supabaseJwtSecretSealed;
  let jwtSecret = envAuth.jwtSecret;
  let savedJwtApplied = false;
  if (sealedJwt) {
    try {
      if (!key) throw new Error('missing key');
      jwtSecret = openSecret(sealedJwt, key);
      savedJwtApplied = true;
    } catch {
      warnings.push(
        'Saved Supabase JWT secret could not be opened; the environment verification key is in use.',
      );
      // Never mix a saved project URL with a key from a different environment.
      if (!row.supabaseJwksUrl) {
        config.auth = envAuth;
        return warnings;
      }
      jwtSecret = null;
      savedJwtApplied = true;
    }
  }

  const baseUrl = row.supabaseUrl ?? supabaseBaseFromAuth(envAuth);
  if (!baseUrl) {
    config.auth = envAuth;
    return warnings;
  }

  config.auth = {
    mode: 'supabase',
    issuer: `${baseUrl.replace(/\/$/, '')}/auth/v1`,
    jwksUrl:
      row.supabaseJwksUrl ??
      (row.supabaseUrl
        ? `${baseUrl.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`
        : envAuth.jwksUrl),
    jwtSecret: savedJwtApplied ? jwtSecret : envAuth.jwtSecret,
    audience: 'authenticated',
  };

  return warnings;
}

/** Read + apply persisted settings at process start (and in tests). */
export async function loadDeploymentSettings(
  db: Db,
  config: Config,
): Promise<{ loaded: boolean; warnings: string[] }> {
  const row = await readDeploymentRow(db);
  return { loaded: row !== null, warnings: applyDeploymentRow(config, row) };
}

function openOptional(sealed: string | null, key: SettingsKey | null): string | null {
  if (!sealed || !key) return null;
  try {
    return openSecret(sealed, key);
  } catch {
    return null;
  }
}

/** Sanitized view for the owner UI. No secret value is ever included. */
export async function getDeploymentSettings(
  db: Db,
  config: Config,
): Promise<DeploymentSettingsResponse> {
  const row = await readDeploymentRow(db);
  const authBase = config.auth.mode === 'supabase' ? supabaseBaseFromAuth(config.auth) : null;
  const authSource: DeploymentSource =
    row &&
    (row.supabaseUrl ||
      row.supabasePublishableKeySealed ||
      row.supabaseJwtSecretSealed ||
      row.supabaseJwksUrl)
      ? 'saved'
      : config.auth.mode === 'supabase'
        ? 'environment'
        : 'none';

  const storageSource: DeploymentSource =
    row && (row.storageProvider || row.telegramApiId || row.telegramApiHashSealed)
      ? 'saved'
      : config.storage.telegram
        ? 'environment'
        : 'none';

  return {
    secretStorage: { configured: config.settingsKey !== null },
    auth: {
      mode: config.auth.mode,
      active: config.auth.mode === 'supabase',
      supabaseUrl: row?.supabaseUrl ?? authBase,
      publishableKeyConfigured: Boolean(row?.supabasePublishableKeySealed),
      jwtSecretConfigured:
        config.auth.mode === 'supabase'
          ? Boolean(config.auth.jwtSecret)
          : Boolean(row?.supabaseJwtSecretSealed),
      jwksUrl: row?.supabaseJwksUrl ?? (config.auth.mode === 'supabase' ? config.auth.jwksUrl : null),
      source: authSource,
    },
    storage: {
      provider: config.storage.provider,
      telegramApiId: config.storage.telegram?.apiId ?? row?.telegramApiId ?? null,
      apiHashConfigured: Boolean(
        row?.telegramApiHashSealed || config.storage.telegram?.apiHash,
      ),
      sessionKeyConfigured: config.storage.sessionKey !== null,
      source: storageSource,
    },
    limits: {
      maxUploadBytes: config.storage.maxUploadBytes,
      maxActiveUploads: config.storage.maxActiveUploads,
    },
    updatedAt: row ? toIsoString(row.updatedAt) : null,
    updatedByEmail: row?.updatedByEmail ?? null,
  };
}

const hasOwn = <T extends object>(value: T, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

function changedFields(input: DeploymentSettingsUpdate): string[] {
  const fields: string[] = [];
  if (input.supabase) {
    for (const key of ['url', 'publishableKey', 'jwtSecret', 'jwksUrl'] as const) {
      if (hasOwn(input.supabase, key)) fields.push(`supabase.${key}`);
    }
  }
  if (input.telegram) {
    for (const key of ['provider', 'apiId', 'apiHash'] as const) {
      if (hasOwn(input.telegram, key)) fields.push(`telegram.${key}`);
    }
  }
  return fields;
}

/**
 * Update settings, persist sealed values and apply them to the live config.
 * Validation happens before the transaction, so an invalid patch cannot leave
 * the database and the running API disagreeing.
 */
export async function updateDeploymentSettings(
  db: Db,
  config: Config,
  adminUserId: string,
  input: DeploymentSettingsUpdate,
): Promise<DeploymentSettingsResponse> {
  const fields = changedFields(input);
  if (fields.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 400, 'No deployment settings were provided.');
  }

  const row = await readDeploymentRow(db);
  const key = config.settingsKey;

  const nextUrl =
    input.supabase && hasOwn(input.supabase, 'url')
      ? input.supabase.url === null
        ? null
        : normaliseUrl(input.supabase.url!, 'Supabase project URL', {
            production: config.isProduction,
            stripAuthV1: true,
          })
      : (row?.supabaseUrl ?? null);

  const nextJwks =
    input.supabase && hasOwn(input.supabase, 'jwksUrl')
      ? input.supabase.jwksUrl === null
        ? null
        : normaliseUrl(input.supabase.jwksUrl!, 'Supabase JWKS URL', {
            production: config.isProduction,
          })
      : (row?.supabaseJwksUrl ?? null);

  const newJwt =
    input.supabase && hasOwn(input.supabase, 'jwtSecret') ? input.supabase.jwtSecret : undefined;
  const newPublishable =
    input.supabase && hasOwn(input.supabase, 'publishableKey')
      ? input.supabase.publishableKey
      : undefined;
  if ((newJwt || newPublishable) && !key) {
    requireKey(config);
  }

  const nextJwtSealed =
    newJwt === undefined
      ? (row?.supabaseJwtSecretSealed ?? null)
      : newJwt === null
        ? null
        : sealSecret(newJwt, key ?? requireKey(config));
  const nextPublishableSealed =
    newPublishable === undefined
      ? (row?.supabasePublishableKeySealed ?? null)
      : newPublishable === null
        ? null
        : sealSecret(newPublishable, key ?? requireKey(config));

  const envBase = supabaseBaseFromAuth(config.authEnv);
  const effectiveJwt =
    newJwt !== undefined
      ? newJwt
      : (openOptional(row?.supabaseJwtSecretSealed ?? null, key) ??
        (config.authEnv.mode === 'supabase' ? config.authEnv.jwtSecret : null));
  const currentBase = row?.supabaseUrl ?? envBase;
  const effectiveBase = nextUrl ?? envBase;

  if (config.authEnv.mode === 'supabase' && newJwt === null && nextJwks === null && !effectiveJwt) {
    throw new ApiError(
      'VALIDATION_ERROR',
      400,
      'Supabase Auth needs a JWT secret or a JWKS URL. Clearing both would leave every token unverifiable.',
    );
  }
  if (config.authEnv.mode === 'supabase' && !effectiveBase) {
    throw new ApiError(
      'VALIDATION_ERROR',
      400,
      'A Supabase project URL is required while AUTH_MODE=supabase.',
    );
  }
  if (
    config.authEnv.mode === 'supabase' &&
    nextUrl !== null &&
    nextUrl !== currentBase &&
    newJwt === undefined &&
    !nextJwks &&
    !row?.supabaseJwtSecretSealed
  ) {
    throw new ApiError(
      'VALIDATION_ERROR',
      400,
      'Changing the Supabase project URL also requires that project’s JWT secret or JWKS URL.',
    );
  }

  const nextProvider =
    input.telegram && hasOwn(input.telegram, 'provider')
      ? input.telegram.provider!
      : (row?.storageProvider ?? config.storage.environmentProvider);

  if (config.isProduction && nextProvider === 'local') {
    throw new ApiError(
      'VALIDATION_ERROR',
      400,
      'The local storage provider is development-only. Production storage must be Telegram.',
    );
  }

  const nextApiId =
    input.telegram && hasOwn(input.telegram, 'apiId')
      ? input.telegram.apiId
      : (row?.telegramApiId ?? config.storage.environmentTelegram?.apiId ?? null);

  const newApiHash =
    input.telegram && hasOwn(input.telegram, 'apiHash') ? input.telegram.apiHash : undefined;
  if (newApiHash && !key) requireKey(config);
  const nextApiHashSealed =
    newApiHash === undefined
      ? (row?.telegramApiHashSealed ?? null)
      : newApiHash === null
        ? null
        : sealSecret(newApiHash, key ?? requireKey(config));

  if (newApiHash && !/^[0-9a-fA-F]{32}$/.test(newApiHash)) {
    throw new ApiError(
      'VALIDATION_ERROR',
      400,
      'The Telegram API hash must be the 32-character hexadecimal value from my.telegram.org.',
    );
  }
  const effectiveApiHash =
    newApiHash !== undefined
      ? newApiHash
      : (openOptional(row?.telegramApiHashSealed ?? null, key) ??
        config.storage.environmentTelegram?.apiHash ??
        null);

  if (nextProvider === 'telegram') {
    if (nextApiId === null || !effectiveApiHash) {
      throw new ApiError(
        'VALIDATION_ERROR',
        400,
        'Telegram storage needs both TELEGRAM_API_ID (or API ID) and TELEGRAM_API_HASH (or API hash).',
      );
    }
    if (!config.storage.sessionKey) {
      throw new ApiError(
        'VALIDATION_ERROR',
        400,
        'SESSION_ENCRYPTION_KEY must be set in the server environment before Telegram storage can be enabled.',
      );
    }
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  const add = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };

  if (input.supabase && hasOwn(input.supabase, 'url')) {
    sets.push(`supabase_url = ${add(nextUrl)}`);
  }
  if (input.supabase && hasOwn(input.supabase, 'publishableKey')) {
    sets.push(`supabase_publishable_key_sealed = ${add(nextPublishableSealed)}`);
  }
  if (input.supabase && hasOwn(input.supabase, 'jwtSecret')) {
    sets.push(`supabase_jwt_secret_sealed = ${add(nextJwtSealed)}`);
  }
  if (input.supabase && hasOwn(input.supabase, 'jwksUrl')) {
    sets.push(`supabase_jwks_url = ${add(nextJwks)}`);
  }
  if (input.telegram && hasOwn(input.telegram, 'provider')) {
    sets.push(`storage_provider = ${add(nextProvider)}`);
  }
  if (input.telegram && hasOwn(input.telegram, 'apiId')) {
    sets.push(`telegram_api_id = ${add(nextApiId)}`);
  }
  if (input.telegram && hasOwn(input.telegram, 'apiHash')) {
    sets.push(`telegram_api_hash_sealed = ${add(nextApiHashSealed)}`);
  }

  const updatedBy = add(adminUserId);

  await db.transaction(async (tx) => {
    await tx.query('insert into public.deployment_settings (id) values (true) on conflict (id) do nothing');
    await tx.query(
      `update public.deployment_settings
          set ${sets.join(', ')}, updated_by = ${updatedBy}, updated_at = now()
        where id = true`,
      params,
    );
    await recordAuditEvent(tx, adminUserId, {
      eventType: 'deployment.settings.update',
      resourceType: 'deployment',
      metadata: { fields },
    });
  });

  const saved = await readDeploymentRow(db);
  applyDeploymentRow(config, saved);
  return getDeploymentSettings(db, config);
}
