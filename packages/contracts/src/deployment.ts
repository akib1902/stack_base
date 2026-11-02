import { Type, type Static } from '@sinclair/typebox';
import { StorageProviderSchema } from './storage';

/**
 * Owner-only deployment integration configuration.
 *
 * Responses deliberately contain presence flags only for secrets. Neither the
 * Supabase JWT secret, the Supabase publishable key, nor the Telegram API hash
 * is ever serialized back to a client.
 */

export const DeploymentSourceSchema = Type.Union([
  Type.Literal('saved'),
  Type.Literal('environment'),
  Type.Literal('none'),
]);
export type DeploymentSource = Static<typeof DeploymentSourceSchema>;

export const DeploymentSettingsResponseSchema = Type.Object({
  secretStorage: Type.Object({
    /** True when the API has a valid SETTINGS_ENCRYPTION_KEY. */
    configured: Type.Boolean(),
  }),
  auth: Type.Object({
    /** AUTH_MODE is intentionally environment-only; it is shown, not edited. */
    mode: Type.Union([Type.Literal('dev'), Type.Literal('supabase')]),
    active: Type.Boolean(),
    supabaseUrl: Type.Union([Type.String(), Type.Null()]),
    publishableKeyConfigured: Type.Boolean(),
    jwtSecretConfigured: Type.Boolean(),
    jwksUrl: Type.Union([Type.String(), Type.Null()]),
    source: DeploymentSourceSchema,
  }),
  storage: Type.Object({
    provider: StorageProviderSchema,
    telegramApiId: Type.Union([Type.Integer(), Type.Null()]),
    apiHashConfigured: Type.Boolean(),
    sessionKeyConfigured: Type.Boolean(),
    source: DeploymentSourceSchema,
  }),
  limits: Type.Object({
    maxUploadBytes: Type.Integer({ minimum: 0 }),
    maxActiveUploads: Type.Integer({ minimum: 0 }),
  }),
  updatedAt: Type.Union([Type.String(), Type.Null()]),
  updatedByEmail: Type.Union([Type.String(), Type.Null()]),
});
export type DeploymentSettingsResponse = Static<typeof DeploymentSettingsResponseSchema>;

const NullableUrl = Type.Union([Type.String({ minLength: 1, maxLength: 2048 }), Type.Null()]);
const NullableSecret = Type.Union([Type.String({ minLength: 1, maxLength: 4096 }), Type.Null()]);

/**
 * A PATCH-like update. Omitted fields are unchanged; null explicitly clears a
 * saved value. An empty string is rejected rather than silently treated as
 * "keep", so a blank form field cannot mask an accidental attempt to clear.
 */
export const DeploymentSettingsUpdateSchema = Type.Object(
  {
    supabase: Type.Optional(
      Type.Object(
        {
          url: Type.Optional(NullableUrl),
          publishableKey: Type.Optional(NullableSecret),
          jwtSecret: Type.Optional(NullableSecret),
          jwksUrl: Type.Optional(NullableUrl),
        },
        { additionalProperties: false },
      ),
    ),
    telegram: Type.Optional(
      Type.Object(
        {
          provider: Type.Optional(StorageProviderSchema),
          apiId: Type.Optional(
            Type.Union([Type.Integer({ minimum: 1, maximum: 2147483647 }), Type.Null()]),
          ),
          apiHash: Type.Optional(NullableSecret),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);
export type DeploymentSettingsUpdate = Static<typeof DeploymentSettingsUpdateSchema>;
