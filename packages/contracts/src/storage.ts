import { Type, type Static } from '@sinclair/typebox';

/**
 * Storage-provider contracts: which provider backs a deployment, the Telegram
 * connection flow (A10) and provider status vocabulary.
 */

/**
 * `local` is a development/test provider (filesystem) and is rejected when
 * NODE_ENV=production, so production storage is always the user's Telegram
 * account (ADR-015).
 */
export const StorageProviderSchema = Type.Union([
  Type.Literal('telegram'),
  Type.Literal('local'),
]);
export type StorageProvider = Static<typeof StorageProviderSchema>;

export const storageObjectStatuses = [
  'pending',
  'available',
  'missing',
  'deleted',
  'reconciliation_required',
] as const;

export const StorageObjectStatusSchema = Type.Union([
  Type.Literal('pending'),
  Type.Literal('available'),
  Type.Literal('missing'),
  Type.Literal('deleted'),
  Type.Literal('reconciliation_required'),
]);
export type StorageObjectStatus = Static<typeof StorageObjectStatusSchema>;

/** Digits with an optional leading plus, spaces, parentheses or dashes. */
const PHONE_PATTERN = '^\\+?[0-9][0-9 ()\\-]{4,31}$';

export const TelegramAuthorizeRequestSchema = Type.Object(
  {
    phoneNumber: Type.String({ minLength: 5, maxLength: 32, pattern: PHONE_PATTERN }),
  },
  { additionalProperties: false },
);
export type TelegramAuthorizeRequest = Static<typeof TelegramAuthorizeRequestSchema>;

export const TelegramAuthorizeResponseSchema = Type.Object({
  loginId: Type.String(),
  /** True when Telegram delivered the code inside an existing app session. */
  viaApp: Type.Boolean(),
});
export type TelegramAuthorizeResponse = Static<typeof TelegramAuthorizeResponseSchema>;

/**
 * Three modes, all owner-scoped:
 * - `{ loginId, code }` completes a pending login.
 * - `{ loginId, password }` answers a two-factor prompt for a pending login.
 * - `{}` revalidates the stored session (connection health check).
 */
export const TelegramVerifyRequestSchema = Type.Object(
  {
    loginId: Type.Optional(Type.String({ minLength: 1, maxLength: 64 })),
    code: Type.Optional(Type.String({ minLength: 3, maxLength: 16 })),
    password: Type.Optional(Type.String({ minLength: 1, maxLength: 256 })),
  },
  { additionalProperties: false },
);
export type TelegramVerifyRequest = Static<typeof TelegramVerifyRequestSchema>;

export const TelegramVerifyResponseSchema = Type.Union([
  Type.Object({
    kind: Type.Literal('connected'),
    accountIdentifier: Type.Union([Type.String(), Type.Null()]),
    lastValidatedAt: Type.String(),
  }),
  Type.Object({
    kind: Type.Literal('password_required'),
    /** Telegram's password hint (never the password itself). */
    hint: Type.Union([Type.String(), Type.Null()]),
  }),
]);
export type TelegramVerifyResponse = Static<typeof TelegramVerifyResponseSchema>;

export const TelegramDisconnectResponseSchema = Type.Object({
  status: Type.Literal('disconnected'),
});
export type TelegramDisconnectResponse = Static<typeof TelegramDisconnectResponseSchema>;
