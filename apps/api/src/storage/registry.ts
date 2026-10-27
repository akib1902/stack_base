import type { StorageProvider as StorageProviderName } from '@stackbase/contracts';
import type { Config } from '../config/env';
import type { Db } from '../database/db';
import { ApiError } from '../errors';
import { createLocalStorageProvider } from './local';
import { openSession } from './session-crypto';
import { TelegramError, createTelegramGateway, mapTelegramError } from './telegram/gateway';
import { createTelegramStorageProvider } from './telegram/provider';
import type { StorageProvider } from './types';

/**
 * Opens a provider bound to one user. Local development gets its connection
 * row provisioned lazily; Telegram requires a stored, sealed session (ADR-015,
 * ADR-016). Callers must `close()` the handle to release provider resources.
 */

export interface StorageDeps {
  config: Config;
  db: Db;
}

export interface OpenStorageProvider {
  provider: StorageProvider;
  connectionId: string;
  close(): Promise<void>;
}

interface ConnectionRow {
  id: string;
  connectionStatus: string;
  encryptedSession: Uint8Array | null;
  sessionKeyVersion: string | null;
}

export function mapProviderErrorToApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  const mapped = error instanceof TelegramError ? error : mapTelegramError(error);
  switch (mapped.code) {
    case 'RATE_LIMITED':
      return new ApiError(
        'TELEGRAM_RATE_LIMIT',
        429,
        mapped.retryAfterSeconds
          ? `Telegram asked to wait ${mapped.retryAfterSeconds} seconds before retrying.`
          : 'Telegram is rate limiting this account. Try again shortly.',
      );
    case 'SESSION_EXPIRED':
    case 'NOT_AUTHENTICATED':
      return new ApiError(
        'TELEGRAM_SESSION_EXPIRED',
        409,
        'The Telegram session is no longer valid. Reconnect it from settings.',
      );
    case 'MISSING':
      return new ApiError(
        'STORAGE_RECONCILIATION_REQUIRED',
        409,
        'The stored object could not be found on the provider.',
      );
    default:
      return new ApiError(
        'STORAGE_DISCONNECTED',
        502,
        'The storage provider rejected the operation.',
      );
  }
}

/** Idempotently provision the development connection so jobs have a real id. */
export async function ensureLocalConnection(db: Db, userId: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.storage_connections
       (user_id, provider, connection_status, account_identifier, last_validated_at)
     values ($1, 'local', 'connected', 'Local development storage', now())
     on conflict (user_id, provider) do update
       set connection_status = 'connected', last_validated_at = now()
     returning id`,
    [userId],
  );
  const id = rows[0]?.id;
  if (!id) {
    throw new ApiError('INTERNAL_ERROR', 500, 'The local storage connection could not be created.');
  }
  return id;
}

export async function loadConnection(
  db: Db,
  userId: string,
  provider: StorageProviderName,
): Promise<ConnectionRow | null> {
  const { rows } = await db.query<ConnectionRow>(
    `select
       id,
       connection_status as "connectionStatus",
       encrypted_session as "encryptedSession",
       session_key_version as "sessionKeyVersion"
     from public.storage_connections
     where user_id = $1 and provider = $2`,
    [userId, provider],
  );
  return rows[0] ?? null;
}

/**
 * Resolve the connection an upload will use without opening the provider: the
 * local connection is provisioned idempotently, a Telegram session must exist.
 */
export async function resolveStorageConnection(
  deps: StorageDeps,
  userId: string,
): Promise<string> {
  if (deps.config.storage.provider === 'local') {
    return ensureLocalConnection(deps.db, userId);
  }

  const credentials = deps.config.storage.telegram;
  const sessionKey = deps.config.storage.sessionKey;
  if (!credentials || !sessionKey) {
    throw new ApiError(
      'TELEGRAM_NOT_CONFIGURED',
      503,
      'This deployment is not configured for Telegram storage.',
    );
  }
  const connection = await loadConnection(deps.db, userId, 'telegram');
  if (!connection || !connection.encryptedSession) {
    throw new ApiError(
      'STORAGE_DISCONNECTED',
      409,
      'Connect a Telegram account before uploading.',
    );
  }
  return connection.id;
}

export async function openStorageProvider(
  deps: StorageDeps,
  userId: string,
  provider: StorageProviderName,
): Promise<OpenStorageProvider> {
  if (provider === 'local') {
    const connectionId = await ensureLocalConnection(deps.db, userId);
    return {
      connectionId,
      provider: createLocalStorageProvider({ rootDir: deps.config.storage.localObjectsDir }),
      close: async () => undefined,
    };
  }

  const credentials = deps.config.storage.telegram;
  if (!credentials) {
    throw new ApiError(
      'TELEGRAM_NOT_CONFIGURED',
      503,
      'This deployment is not configured for Telegram storage (TELEGRAM_API_ID / TELEGRAM_API_HASH are missing).',
    );
  }
  const sessionKey = deps.config.storage.sessionKey;
  if (!sessionKey) {
    throw new ApiError(
      'TELEGRAM_NOT_CONFIGURED',
      503,
      'SESSION_ENCRYPTION_KEY is not configured, so the stored Telegram session cannot be opened.',
    );
  }

  const connection = await loadConnection(deps.db, userId, 'telegram');
  if (!connection || !connection.encryptedSession) {
    throw new ApiError(
      'STORAGE_DISCONNECTED',
      409,
      'Connect a Telegram account before transferring content.',
    );
  }

  let sessionString: string;
  try {
    sessionString = openSession(connection.encryptedSession, sessionKey);
  } catch {
    throw new ApiError(
      'TELEGRAM_SESSION_EXPIRED',
      409,
      'The stored Telegram session cannot be opened with the configured key. Reconnect from settings.',
    );
  }

  const gateway = createTelegramGateway(credentials);
  try {
    await gateway.connect(sessionString);
  } catch (error) {
    throw mapProviderErrorToApiError(error);
  }

  return {
    connectionId: connection.id,
    provider: createTelegramStorageProvider(gateway),
    close: async () => {
      await gateway.disconnect().catch(() => undefined);
    },
  };
}
