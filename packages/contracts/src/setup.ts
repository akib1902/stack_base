import { Type, type Static } from '@sinclair/typebox';
import { StorageProviderSchema } from './storage';

export const StorageConnectionStatusSchema = Type.Union([
  Type.Literal('not_configured'),
  Type.Literal('connected'),
  Type.Literal('error'),
  Type.Literal('expired'),
  Type.Literal('disconnected'),
]);
export type StorageConnectionStatus = Static<typeof StorageConnectionStatusSchema>;

export const EncryptionVaultStatusSchema = Type.Union([
  Type.Literal('not_configured'),
  Type.Literal('configured'),
]);
export type EncryptionVaultStatus = Static<typeof EncryptionVaultStatusSchema>;

export const SetupStatusResponseSchema = Type.Object({
  storage: Type.Object({
    provider: StorageProviderSchema,
    status: StorageConnectionStatusSchema,
    accountIdentifier: Type.Union([Type.String(), Type.Null()]),
    lastValidatedAt: Type.Union([Type.String(), Type.Null()]),
    lastErrorCode: Type.Union([Type.String(), Type.Null()]),
  }),
  encryption: Type.Object({
    /** The vault record is stored server-side; unlocking happens in the browser. */
    vault: EncryptionVaultStatusSchema,
  }),
  library: Type.Object({
    files: Type.Integer({ minimum: 0 }),
    folders: Type.Integer({ minimum: 0 }),
    bytes: Type.Integer({ minimum: 0 }),
  }),
});
export type SetupStatusResponse = Static<typeof SetupStatusResponseSchema>;
