import { randomUUID } from 'node:crypto';
import { ApiError } from '../../errors';
import type { TelegramAccount, TelegramGateway } from './gateway';

/**
 * Phone login orchestration for Telegram. Pending logins live in memory only
 * (A4.4): the code hash and the unauthenticated client never touch the database,
 * one login may be pending per user, and everything expires after 10 minutes.
 * The resulting session string is persisted by the caller, sealed with the
 * deployment key (ADR-016).
 */

const DEFAULT_PENDING_TTL_MS = 10 * 60 * 1000;

interface PendingLogin {
  loginId: string;
  userId: string;
  phoneNumber: string;
  gateway: TelegramGateway;
  phoneCodeHash: string;
  createdAt: number;
}

export type TelegramSignInCompletion =
  | { kind: 'signed_in'; session: string; account: TelegramAccount }
  | { kind: 'password_required'; hint: string | null };

export interface TelegramLoginManager {
  start(userId: string, phoneNumber: string): Promise<{ loginId: string; viaApp: boolean }>;
  completeCode(userId: string, loginId: string, code: string): Promise<TelegramSignInCompletion>;
  completePassword(
    userId: string,
    loginId: string,
    password: string,
  ): Promise<TelegramSignInCompletion>;
  cancel(userId: string): Promise<void>;
}

export function createTelegramLoginManager(options: {
  createGateway: () => TelegramGateway;
  pendingTtlMs?: number;
  now?: () => number;
}): TelegramLoginManager {
  const pending = new Map<string, PendingLogin>();
  const ttlMs = options.pendingTtlMs ?? DEFAULT_PENDING_TTL_MS;
  const now = options.now ?? Date.now;

  const discard = async (entry: PendingLogin): Promise<void> => {
    pending.delete(entry.userId);
    await entry.gateway.disconnect().catch(() => undefined);
  };

  const requirePending = async (userId: string, loginId: string): Promise<PendingLogin> => {
    const entry = pending.get(userId);
    const expired = entry ? now() - entry.createdAt > ttlMs : false;
    if (!entry || entry.loginId !== loginId || expired) {
      if (entry) {
        await discard(entry);
      }
      throw new ApiError(
        'VALIDATION_ERROR',
        400,
        'That phone login is no longer active. Start the sign-in again.',
      );
    }
    return entry;
  };

  return {
    async start(userId, phoneNumber) {
      const existing = pending.get(userId);
      if (existing) {
        await discard(existing);
      }

      const gateway = options.createGateway();
      await gateway.connect(null);
      try {
        const delivery = await gateway.sendCode(phoneNumber);
        const loginId = randomUUID();
        pending.set(userId, {
          loginId,
          userId,
          phoneNumber,
          gateway,
          phoneCodeHash: delivery.phoneCodeHash,
          createdAt: now(),
        });
        return { loginId, viaApp: delivery.viaApp };
      } catch (error) {
        await gateway.disconnect().catch(() => undefined);
        throw error;
      }
    },

    async completeCode(userId, loginId, code) {
      const entry = await requirePending(userId, loginId);
      const result = await entry.gateway.signIn(entry.phoneNumber, entry.phoneCodeHash, code);
      if (result.kind === 'password_required') {
        return result;
      }
      const session = entry.gateway.saveSession();
      await discard(entry);
      return { kind: 'signed_in', session, account: result.account };
    },

    async completePassword(userId, loginId, password) {
      const entry = await requirePending(userId, loginId);
      const account = await entry.gateway.checkPassword(password);
      const session = entry.gateway.saveSession();
      await discard(entry);
      return { kind: 'signed_in', session, account };
    },

    async cancel(userId) {
      const entry = pending.get(userId);
      if (entry) {
        await discard(entry);
      }
    },
  };
}
