import {
  ARGON2ID_SALT_BYTES,
  RECOVERY_VERIFIER_PLAINTEXT_BYTES,
  SECRETBOX_MAC_BYTES,
  SECRETBOX_NONCE_BYTES,
  VAULT_FORMAT,
  VAULT_FORMAT_VERSION,
  WRAPPED_KEY_BYTES,
  type CreateVaultRequest,
  type VaultRecord,
  type VaultResponse,
} from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { toCount, toIsoString } from '../../database/values';
import { ApiError } from '../../errors';

/**
 * The vault is created once and never replaced silently (A6.4): losing the
 * passphrase must not be papered over by a server-side reset. Every value that
 * crosses this boundary is a non-secret parameter or ciphertext.
 */

interface VaultRow {
  kdfOpsLimit: number;
  kdfMemLimitBytes: unknown;
  kdfSalt: string;
  wrappedKeyNonce: string;
  wrappedKeyCiphertext: string;
  verifierNonce: string;
  verifierCiphertext: string;
  createdAt: unknown;
  updatedAt: unknown;
}

const SELECT_VAULT = `
  select
    kdf_ops_limit as "kdfOpsLimit",
    kdf_mem_limit_bytes as "kdfMemLimitBytes",
    kdf_salt as "kdfSalt",
    wrapped_key_nonce as "wrappedKeyNonce",
    wrapped_key_ciphertext as "wrappedKeyCiphertext",
    verifier_nonce as "verifierNonce",
    verifier_ciphertext as "verifierCiphertext",
    created_at as "createdAt",
    updated_at as "updatedAt"
  from public.encryption_vaults
  where user_id = $1
`;

/** Canonical base64 of an exact byte length; anything else is rejected. */
function requireBase64(value: string, expectedBytes: number, field: string): void {
  const buffer = Buffer.from(value, 'base64');
  if (buffer.length !== expectedBytes || buffer.toString('base64') !== value) {
    throw new ApiError(
      'VALIDATION_ERROR',
      400,
      `${field} must be canonical base64 encoding exactly ${expectedBytes} bytes.`,
    );
  }
}

const vaultExists = (): ApiError =>
  new ApiError(
    'VAULT_ALREADY_EXISTS',
    409,
    'A vault already exists for this account. It is never replaced silently — losing the passphrase means the existing vault stays locked.',
  );

function toVaultRecord(row: VaultRow): VaultRecord {
  return {
    format: VAULT_FORMAT,
    version: 1,
    kdf: {
      algorithm: 'argon2id13',
      opsLimit: row.kdfOpsLimit,
      memLimitBytes: toCount(row.kdfMemLimitBytes),
      salt: row.kdfSalt,
    },
    wrappedVaultKey: {
      algorithm: 'xsalsa20poly1305',
      nonce: row.wrappedKeyNonce,
      ciphertext: row.wrappedKeyCiphertext,
    },
    recoveryVerifier: {
      algorithm: 'xsalsa20poly1305',
      nonce: row.verifierNonce,
      ciphertext: row.verifierCiphertext,
    },
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

export async function getVault(db: Db, userId: string): Promise<VaultResponse> {
  const { rows } = await db.query<VaultRow>(SELECT_VAULT, [userId]);
  return { vault: rows[0] ? toVaultRecord(rows[0]) : null };
}

export async function createVault(
  db: Db,
  userId: string,
  input: CreateVaultRequest,
): Promise<VaultResponse> {
  requireBase64(input.kdf.salt, ARGON2ID_SALT_BYTES, 'kdf.salt');
  requireBase64(input.wrappedVaultKey.nonce, SECRETBOX_NONCE_BYTES, 'wrappedVaultKey.nonce');
  requireBase64(input.wrappedVaultKey.ciphertext, WRAPPED_KEY_BYTES, 'wrappedVaultKey.ciphertext');
  requireBase64(input.recoveryVerifier.nonce, SECRETBOX_NONCE_BYTES, 'recoveryVerifier.nonce');
  requireBase64(
    input.recoveryVerifier.ciphertext,
    RECOVERY_VERIFIER_PLAINTEXT_BYTES + SECRETBOX_MAC_BYTES,
    'recoveryVerifier.ciphertext',
  );

  let created = false;
  await db.transaction(async (tx) => {
    const result = await tx.query(
      `insert into public.encryption_vaults
         (user_id, format_version, kdf_algorithm, kdf_ops_limit, kdf_mem_limit_bytes, kdf_salt,
          wrap_algorithm, wrapped_key_nonce, wrapped_key_ciphertext, verifier_nonce, verifier_ciphertext)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       on conflict (user_id) do nothing`,
      [
        userId,
        VAULT_FORMAT_VERSION,
        input.kdf.algorithm,
        input.kdf.opsLimit,
        input.kdf.memLimitBytes,
        input.kdf.salt,
        input.wrappedVaultKey.algorithm,
        input.wrappedVaultKey.nonce,
        input.wrappedVaultKey.ciphertext,
        input.recoveryVerifier.nonce,
        input.recoveryVerifier.ciphertext,
      ],
    );
    created = result.rowCount > 0;
  });

  if (!created) {
    throw vaultExists();
  }
  return getVault(db, userId);
}
