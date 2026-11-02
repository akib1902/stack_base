import { Type, type Static } from '@sinclair/typebox';
import { DefaultViewSchema, ThemeSchema } from './common';
import { FileSortSchema } from './library';

export const AuthUserSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  email: Type.Union([Type.String(), Type.Null()]),
  displayName: Type.Union([Type.String(), Type.Null()]),
  avatarUrl: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
});
export type AuthUser = Static<typeof AuthUserSchema>;

export const UserSettingsSchema = Type.Object({
  theme: ThemeSchema,
  defaultView: DefaultViewSchema,
  defaultSort: FileSortSchema,
  trashRetentionDays: Type.Integer({ minimum: 0 }),
  offlineEnabled: Type.Boolean(),
});
export type UserSettings = Static<typeof UserSettingsSchema>;

/** Partial update for the caller's own settings; server defaults fill the rest. */
export const UserSettingsUpdateSchema = Type.Object({
  theme: Type.Optional(ThemeSchema),
  defaultView: Type.Optional(DefaultViewSchema),
  defaultSort: Type.Optional(FileSortSchema),
  trashRetentionDays: Type.Optional(Type.Integer({ minimum: 0, maximum: 3650 })),
  offlineEnabled: Type.Optional(Type.Boolean()),
});
export type UserSettingsUpdate = Static<typeof UserSettingsUpdateSchema>;

export const MeResponseSchema = Type.Object({
  user: AuthUserSchema,
  settings: UserSettingsSchema,
  /** True only for the instance owner; authorizes deployment configuration. */
  isAdmin: Type.Boolean(),
});
export type MeResponse = Static<typeof MeResponseSchema>;

/** Development-only local session issuance (never registered in production). */
export const DevSessionRequestSchema = Type.Object({
  email: Type.String({ format: 'email', minLength: 3, maxLength: 320 }),
});
export type DevSessionRequest = Static<typeof DevSessionRequestSchema>;

export const DevSessionResponseSchema = Type.Object({
  accessToken: Type.String(),
  tokenType: Type.Literal('Bearer'),
  expiresAt: Type.String(),
  user: Type.Object({ id: Type.String(), email: Type.String() }),
});
export type DevSessionResponse = Static<typeof DevSessionResponseSchema>;

export const AuthModeSchema = Type.Union([Type.Literal('dev'), Type.Literal('supabase')]);
export type AuthMode = Static<typeof AuthModeSchema>;

/** Public web sign-in discovery. No Supabase URL or key is exposed here. */
export const AuthConfigResponseSchema = Type.Object({
  mode: AuthModeSchema,
  supabaseReady: Type.Boolean(),
});
export type AuthConfigResponse = Static<typeof AuthConfigResponseSchema>;

/** Server-to-server Supabase password sign-in; never sent to the browser. */
export const SupabaseSignInRequestSchema = Type.Object({
  email: Type.String({ format: 'email', minLength: 3, maxLength: 320 }),
  password: Type.String({ minLength: 1, maxLength: 1024 }),
});
export type SupabaseSignInRequest = Static<typeof SupabaseSignInRequestSchema>;

export const SupabaseRefreshRequestSchema = Type.Object({
  refreshToken: Type.String({ minLength: 1, maxLength: 4096 }),
});
export type SupabaseRefreshRequest = Static<typeof SupabaseRefreshRequestSchema>;

export const SupabaseSessionResponseSchema = Type.Object({
  accessToken: Type.String(),
  refreshToken: Type.String(),
  expiresAt: Type.String(),
});
export type SupabaseSessionResponse = Static<typeof SupabaseSessionResponseSchema>;
