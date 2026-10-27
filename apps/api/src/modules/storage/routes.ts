import type { FastifyInstance } from 'fastify';
import type { Static } from '@sinclair/typebox';
import {
  TelegramAuthorizeRequestSchema,
  TelegramAuthorizeResponseSchema,
  TelegramDisconnectResponseSchema,
  TelegramVerifyRequestSchema,
  TelegramVerifyResponseSchema,
  type TelegramVerifyResponse,
} from '@stackbase/contracts';
import type { Config } from '../../config/env';
import type { Db } from '../../database/db';
import { ApiError, authRequired } from '../../errors';
import { loadConnection, mapProviderErrorToApiError } from '../../storage/registry';
import { openSession, sealSession, type SessionKey } from '../../storage/session-crypto';
import {
  TelegramError,
  createTelegramGateway,
  mapTelegramError,
} from '../../storage/telegram/gateway';
import type { TelegramAccount } from '../../storage/telegram/gateway';
import type { TelegramLoginManager } from '../../storage/telegram/login';

/**
 * Telegram connection endpoints (A10). Session strings are sealed with the
 * deployment key before they touch the database and are never returned or
 * logged; pending logins live in memory only (A4.4, ADR-016).
 */

interface StorageRouteDeps {
  db: Db;
  config: Config;
  logins: TelegramLoginManager;
}

function requireTelegramConfig(config: Config): { apiId: number; apiHash: string } {
  if (!config.storage.telegram) {
    throw new ApiError(
      'TELEGRAM_NOT_CONFIGURED',
      503,
      'This deployment is not configured for Telegram storage (TELEGRAM_API_ID / TELEGRAM_API_HASH are missing).',
    );
  }
  return config.storage.telegram;
}

function requireSessionKey(config: Config): SessionKey {
  if (!config.storage.sessionKey) {
    throw new ApiError(
      'TELEGRAM_NOT_CONFIGURED',
      503,
      'SESSION_ENCRYPTION_KEY is not configured, so a Telegram session cannot be stored.',
    );
  }
  return config.storage.sessionKey;
}

async function persistSession(
  deps: StorageRouteDeps,
  userId: string,
  session: string,
  account: TelegramAccount,
): Promise<string> {
  const sessionKey = requireSessionKey(deps.config);
  const sealed = sealSession(session, sessionKey);
  const { rows } = await deps.db.query<{ lastValidatedAt: unknown }>(
    `insert into public.storage_connections
       (user_id, provider, connection_status, account_identifier, encrypted_session,
        session_key_version, last_validated_at, last_error_code)
     values ($1, 'telegram', 'connected', $2, $3, $4, now(), null)
     on conflict (user_id, provider) do update set
       connection_status = 'connected',
       account_identifier = excluded.account_identifier,
       encrypted_session = excluded.encrypted_session,
       session_key_version = excluded.session_key_version,
       last_validated_at = now(),
       last_error_code = null
     returning last_validated_at as "lastValidatedAt"`,
    [userId, account.accountIdentifier, sealed, sessionKey.version],
  );
  return String(rows[0]?.lastValidatedAt ?? new Date().toISOString());
}

/** Health check for the stored session; also used by the Settings button. */
async function revalidateStoredSession(
  deps: StorageRouteDeps,
  userId: string,
): Promise<TelegramVerifyResponse> {
  const credentials = requireTelegramConfig(deps.config);
  const sessionKey = requireSessionKey(deps.config);

  const connection = await loadConnection(deps.db, userId, 'telegram');
  if (!connection || !connection.encryptedSession) {
    throw new ApiError(
      'STORAGE_DISCONNECTED',
      409,
      'No Telegram account is connected yet.',
    );
  }

  let sessionString: string;
  try {
    sessionString = openSession(connection.encryptedSession, sessionKey);
  } catch {
    await deps.db.query(
      `update public.storage_connections
         set connection_status = 'expired', last_error_code = 'TELEGRAM_SESSION_EXPIRED'
       where id = $1 and user_id = $2`,
      [connection.id, userId],
    );
    throw new ApiError(
      'TELEGRAM_SESSION_EXPIRED',
      409,
      'The stored Telegram session cannot be opened with the configured key. Reconnect from settings.',
    );
  }

  const gateway = createTelegramGateway(credentials);
  try {
    await gateway.connect(sessionString);
    const account = await gateway.getAccount();
    const { rows } = await deps.db.query<{ lastValidatedAt: unknown }>(
      `update public.storage_connections
         set connection_status = 'connected',
             account_identifier = $3,
             last_validated_at = now(),
             last_error_code = null
       where id = $1 and user_id = $2
       returning last_validated_at as "lastValidatedAt"`,
      [connection.id, userId, account.accountIdentifier],
    );
    return {
      kind: 'connected',
      accountIdentifier: account.accountIdentifier,
      lastValidatedAt: String(rows[0]?.lastValidatedAt ?? new Date().toISOString()),
    };
  } catch (error) {
    const apiError = mapProviderErrorToApiError(error);
    const mapped = error instanceof TelegramError ? error : mapTelegramError(error);
    const status =
      mapped.code === 'SESSION_EXPIRED' || mapped.code === 'NOT_AUTHENTICATED'
        ? 'expired'
        : 'error';
    await deps.db
      .query(
        `update public.storage_connections
           set connection_status = $3, last_error_code = $4
         where id = $1 and user_id = $2`,
        [connection.id, userId, status, apiError.code],
      )
      .catch(() => undefined);
    throw apiError;
  } finally {
    await gateway.disconnect().catch(() => undefined);
  }
}

export function registerStorageRoutes(app: FastifyInstance, deps: StorageRouteDeps): void {
  app.post<{ Body: Static<typeof TelegramAuthorizeRequestSchema> }>(
    '/api/v1/storage/telegram/authorize',
    {
      preHandler: app.authenticate,
      schema: {
        body: TelegramAuthorizeRequestSchema,
        response: { 200: TelegramAuthorizeResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      try {
        return await deps.logins.start(user.id, request.body.phoneNumber);
      } catch (error) {
        throw mapProviderErrorToApiError(error);
      }
    },
  );

  app.post<{ Body: Static<typeof TelegramVerifyRequestSchema> }>(
    '/api/v1/storage/telegram/verify',
    {
      preHandler: app.authenticate,
      schema: {
        body: TelegramVerifyRequestSchema,
        response: { 200: TelegramVerifyResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      const { loginId, code, password } = request.body;

      if (loginId && code && password) {
        throw new ApiError(
          'VALIDATION_ERROR',
          400,
          'Send the login code or the two-factor password, not both.',
        );
      }
      if (loginId && !code && !password) {
        throw new ApiError(
          'VALIDATION_ERROR',
          400,
          'An active login needs either the login code or the two-factor password.',
        );
      }
      if (!loginId && (code || password)) {
        throw new ApiError(
          'VALIDATION_ERROR',
          400,
          'A login id is required when sending a code or password.',
        );
      }

      if (!loginId) {
        return revalidateStoredSession(deps, user.id);
      }

      try {
        const result = code
          ? await deps.logins.completeCode(user.id, loginId, code)
          : await deps.logins.completePassword(user.id, loginId, password as string);

        if (result.kind === 'password_required') {
          return { kind: 'password_required' as const, hint: result.hint };
        }

        const lastValidatedAt = await persistSession(
          deps,
          user.id,
          result.session,
          result.account,
        );
        return {
          kind: 'connected' as const,
          accountIdentifier: result.account.accountIdentifier,
          lastValidatedAt,
        };
      } catch (error) {
        throw mapProviderErrorToApiError(error);
      }
    },
  );

  app.post(
    '/api/v1/storage/telegram/disconnect',
    {
      preHandler: app.authenticate,
      schema: { response: { 200: TelegramDisconnectResponseSchema } },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      await deps.logins.cancel(user.id);
      // The session is discarded; stored objects stay untouched so a reconnect
      // with the same account can read them again (rule 9).
      await deps.db.query(
        `update public.storage_connections
           set connection_status = 'disconnected',
               account_identifier = null,
               encrypted_session = null,
               session_key_version = null,
               last_validated_at = null,
               last_error_code = null
         where user_id = $1 and provider = 'telegram'`,
        [user.id],
      );
      return { status: 'disconnected' as const };
    },
  );
}
