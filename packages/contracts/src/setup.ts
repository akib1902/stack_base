import { Type, type Static } from '@sinclair/typebox';

export const StorageConnectionStatusSchema = Type.Union([
  Type.Literal('not_configured'),
  Type.Literal('connected'),
  Type.Literal('error'),
  Type.Literal('expired'),
  Type.Literal('disconnected'),
]);
export type StorageConnectionStatus = Static<typeof StorageConnectionStatusSchema>;

export const SetupStatusResponseSchema = Type.Object({
  storage: Type.Object({
    provider: Type.Literal('telegram'),
    status: StorageConnectionStatusSchema,
    accountIdentifier: Type.Union([Type.String(), Type.Null()]),
    lastValidatedAt: Type.Union([Type.String(), Type.Null()]),
    lastErrorCode: Type.Union([Type.String(), Type.Null()]),
  }),
  library: Type.Object({
    files: Type.Integer({ minimum: 0 }),
    folders: Type.Integer({ minimum: 0 }),
    bytes: Type.Integer({ minimum: 0 }),
  }),
});
export type SetupStatusResponse = Static<typeof SetupStatusResponseSchema>;
