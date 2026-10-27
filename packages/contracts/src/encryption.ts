import { Type, type Static } from '@sinclair/typebox';

/**
 * Vault records for the pinned `stackbase/1` format
 * (docs/architecture/encryption-format.md). Everything here is either a
 * non-secret parameter or ciphertext: no field can decrypt content without the
 * user's passphrase, which never reaches the server.
 */

export const VAULT_FORMAT_VERSION = 'stackbase/1';
export const VAULT_FORMAT = 'stackbase-vault';

/** Argon2id profile pinned for new vaults; stored per vault so old ones keep working. */
export const ARGON2ID_OPS_LIMIT = 3;
export const ARGON2ID_MEM_LIMIT_BYTES = 64 * 1024 * 1024;
export const ARGON2ID_SALT_BYTES = 16;
export const ARGON2ID_MIN_MEM_LIMIT_BYTES = 8 * 1024 * 1024;
export const ARGON2ID_MAX_MEM_LIMIT_BYTES = 1024 * 1024 * 1024;

export const SECRETBOX_NONCE_BYTES = 24;
export const SECRETBOX_KEY_BYTES = 32;
export const SECRETBOX_MAC_BYTES = 16;
/** secretbox ciphertext for a 32-byte key: key bytes plus the Poly1305 tag. */
export const WRAPPED_KEY_BYTES = SECRETBOX_KEY_BYTES + SECRETBOX_MAC_BYTES;

/**
 * Base64 string whose decoded length is exactly `bytes` long. The pattern is
 * canonical base64 (groups of four, optional padding), so both length and
 * alphabet are enforced before a handler decodes the value.
 */
export const base64Exact = (bytes: number): ReturnType<typeof Type.String> => {
  const length = Math.ceil(bytes / 3) * 4;
  return Type.String({
    minLength: length,
    maxLength: length,
    pattern: '^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$',
  });
};

/** Lowercase hex SHA-256 digest. */
export const SHA256_HEX_PATTERN = '^[0-9a-f]{64}$';
export const sha256Hex = () => Type.String({ minLength: 64, maxLength: 64, pattern: SHA256_HEX_PATTERN });

export const VaultKdfSchema = Type.Object(
  {
    algorithm: Type.Literal('argon2id13'),
    opsLimit: Type.Integer({ minimum: 1, maximum: 10 }),
    memLimitBytes: Type.Integer({
      minimum: ARGON2ID_MIN_MEM_LIMIT_BYTES,
      maximum: ARGON2ID_MAX_MEM_LIMIT_BYTES,
    }),
    salt: base64Exact(ARGON2ID_SALT_BYTES),
  },
  { additionalProperties: false },
);
export type VaultKdf = Static<typeof VaultKdfSchema>;

export const WrappedKeySchema = Type.Object(
  {
    algorithm: Type.Literal('xsalsa20poly1305'),
    nonce: base64Exact(SECRETBOX_NONCE_BYTES),
    ciphertext: base64Exact(WRAPPED_KEY_BYTES),
  },
  { additionalProperties: false },
);
export type WrappedKey = Static<typeof WrappedKeySchema>;

/** Fixed verification string encrypted under the vault key (35 bytes). */
export const RECOVERY_VERIFIER_PLAINTEXT = 'stackbase/1 vault-recovery-verifier';
export const RECOVERY_VERIFIER_PLAINTEXT_BYTES = 35;

/** secretbox over a fixed verification string, encrypted under the vault key. */
export const RecoveryVerifierSchema = Type.Object(
  {
    algorithm: Type.Literal('xsalsa20poly1305'),
    nonce: base64Exact(SECRETBOX_NONCE_BYTES),
    ciphertext: base64Exact(RECOVERY_VERIFIER_PLAINTEXT_BYTES + SECRETBOX_MAC_BYTES),
  },
  { additionalProperties: false },
);
export type RecoveryVerifier = Static<typeof RecoveryVerifierSchema>;

export const VaultRecordSchema = Type.Object({
  format: Type.Literal(VAULT_FORMAT),
  version: Type.Literal(1),
  kdf: VaultKdfSchema,
  wrappedVaultKey: WrappedKeySchema,
  recoveryVerifier: RecoveryVerifierSchema,
  createdAt: Type.String(),
  updatedAt: Type.String(),
});
export type VaultRecord = Static<typeof VaultRecordSchema>;

export const VaultResponseSchema = Type.Object({
  /** Null until the owner creates a vault. Never fabricated, never reset. */
  vault: Type.Union([VaultRecordSchema, Type.Null()]),
});
export type VaultResponse = Static<typeof VaultResponseSchema>;

export const CreateVaultRequestSchema = Type.Object(
  {
    kdf: VaultKdfSchema,
    wrappedVaultKey: WrappedKeySchema,
    recoveryVerifier: RecoveryVerifierSchema,
  },
  { additionalProperties: false },
);
export type CreateVaultRequest = Static<typeof CreateVaultRequestSchema>;
