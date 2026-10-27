import type {
  CreateVaultRequest,
  VaultKdf,
  VaultRecord,
  WrappedKey,
} from '@stackbase/contracts';
import {
  ARGON2ID_MEM_LIMIT_BYTES,
  ARGON2ID_OPS_LIMIT,
  ARGON2ID_SALT_BYTES,
  RECOVERY_VERIFIER_PLAINTEXT,
  SECRETBOX_KEY_BYTES,
  SECRETBOX_NONCE_BYTES,
  VAULT_FORMAT,
} from '@stackbase/contracts';
import { equalBytes, fromBase64, toBase64, utf8ToBytes } from './encoding';
import { CRYPTO_ERROR_COPY, CryptoError } from './errors';
import { getSodium, type Sodium } from './sodium';

/**
 * Vault key hierarchy of `stackbase/1` (docs/architecture/encryption-format.md):
 * the passphrase derives a KEK with Argon2id13, the KEK wraps a random 32-byte
 * vault key, and every file version gets its own data key wrapped by the vault
 * key. Nothing in this module ever leaves the device.
 */

/** Minimum accepted passphrase length; below this Argon2id cannot help. */
export const MIN_PASSPHRASE_LENGTH = 12;

export const DEFAULT_VAULT_KDF_PROFILE = {
  opsLimit: ARGON2ID_OPS_LIMIT,
  memLimitBytes: ARGON2ID_MEM_LIMIT_BYTES,
} as const;

export interface CreatedVault {
  /** Exactly what the API accepts; contains no key material. */
  request: CreateVaultRequest;
  /** The 32-byte vault key, held in memory by the caller. */
  vaultKey: Uint8Array;
}

function deriveKek(
  sodium: Sodium,
  passphrase: string,
  kdf: Pick<VaultKdf, 'opsLimit' | 'memLimitBytes' | 'salt'>,
): Uint8Array {
  return sodium.crypto_pwhash(
    SECRETBOX_KEY_BYTES,
    passphrase,
    fromBase64(kdf.salt),
    kdf.opsLimit,
    kdf.memLimitBytes,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  );
}

function secretboxSeal(sodium: Sodium, message: Uint8Array, key: Uint8Array): WrappedKey {
  const nonce = sodium.randombytes_buf(SECRETBOX_NONCE_BYTES);
  return {
    algorithm: 'xsalsa20poly1305',
    nonce: toBase64(nonce),
    ciphertext: toBase64(sodium.crypto_secretbox_easy(message, nonce, key)),
  };
}

/** Opens a secretbox, returning an empty array when the MAC check fails. */
function secretboxOpen(
  sodium: Sodium,
  sealed: { nonce: string; ciphertext: string },
  key: Uint8Array,
): Uint8Array {
  try {
    return sodium.crypto_secretbox_open_easy(
      fromBase64(sealed.ciphertext),
      fromBase64(sealed.nonce),
      key,
    );
  } catch {
    return new Uint8Array(0);
  }
}

export function assertPassphraseUsable(passphrase: string): void {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    throw new CryptoError(
      'INVALID_PASSPHRASE',
      `Use a passphrase with at least ${MIN_PASSPHRASE_LENGTH} characters.`,
    );
  }
}

/**
 * Creates a brand-new vault: random salt, random vault key, Argon2id KEK, the
 * wrapped vault key and the recovery verifier. The caller posts `request` to the
 * API and keeps `vaultKey` in memory only.
 */
export async function createVault(
  passphrase: string,
  profile: { opsLimit: number; memLimitBytes: number } = DEFAULT_VAULT_KDF_PROFILE,
): Promise<CreatedVault> {
  assertPassphraseUsable(passphrase);
  const sodium = await getSodium();

  const kdf = {
    algorithm: 'argon2id13' as const,
    opsLimit: profile.opsLimit,
    memLimitBytes: profile.memLimitBytes,
    salt: toBase64(sodium.randombytes_buf(ARGON2ID_SALT_BYTES)),
  };

  const kek = deriveKek(sodium, passphrase, kdf);
  const vaultKey = sodium.crypto_secretbox_keygen();

  try {
    const request: CreateVaultRequest = {
      kdf,
      wrappedVaultKey: secretboxSeal(sodium, vaultKey, kek),
      recoveryVerifier: secretboxSeal(
        sodium,
        utf8ToBytes(RECOVERY_VERIFIER_PLAINTEXT),
        vaultKey,
      ),
    };
    return { request, vaultKey };
  } finally {
    sodium.memzero(kek);
  }
}

/**
 * Rebuilds the KEK from the stored parameters, opens the wrapped vault key and
 * checks the recovery verifier. A wrong passphrase fails the secretbox MAC
 * inside `crypto_secretbox_open_easy`, so no key comparison is possible (the
 * KEK is never stored) — the verifier is what proves the recovered key is the
 * one the vault was created with.
 */
export async function unlockVault(record: VaultRecord, passphrase: string): Promise<Uint8Array> {
  const sodium = await getSodium();
  const kek = deriveKek(sodium, passphrase, record.kdf);

  let vaultKey: Uint8Array;
  try {
    vaultKey = secretboxOpen(sodium, record.wrappedVaultKey, kek);
  } finally {
    sodium.memzero(kek);
  }

  if (vaultKey.length !== SECRETBOX_KEY_BYTES) {
    throw new CryptoError('WRONG_PASSPHRASE', CRYPTO_ERROR_COPY.WRONG_PASSPHRASE);
  }

  const verifier = secretboxOpen(sodium, record.recoveryVerifier, vaultKey);
  if (!equalBytes(verifier, utf8ToBytes(RECOVERY_VERIFIER_PLAINTEXT))) {
    sodium.memzero(vaultKey);
    throw new CryptoError('WRONG_VAULT_KEY', CRYPTO_ERROR_COPY.WRONG_VAULT_KEY);
  }

  return vaultKey;
}

/** A fresh 32-byte data key for one file version. */
export async function createDataKey(): Promise<Uint8Array> {
  const sodium = await getSodium();
  return sodium.crypto_secretbox_keygen();
}

export async function wrapDataKey(
  vaultKey: Uint8Array,
  dataKey?: Uint8Array,
): Promise<{ dataKey: Uint8Array; wrappedKey: WrappedKey }> {
  const sodium = await getSodium();
  const key = dataKey ?? (await createDataKey());
  if (key.length !== SECRETBOX_KEY_BYTES) {
    throw new CryptoError('WRONG_VAULT_KEY', 'A data key must be 32 bytes long.');
  }
  return { dataKey: key, wrappedKey: secretboxSeal(sodium, key, vaultKey) };
}

export async function unwrapDataKey(
  vaultKey: Uint8Array,
  wrappedKey: WrappedKey,
): Promise<Uint8Array> {
  const sodium = await getSodium();
  const dataKey = secretboxOpen(sodium, wrappedKey, vaultKey);
  if (dataKey.length !== SECRETBOX_KEY_BYTES) {
    throw new CryptoError('WRONG_VAULT_KEY', CRYPTO_ERROR_COPY.WRONG_VAULT_KEY);
  }
  return dataKey;
}

/** One-line description of the KDF profile shown in settings. */
export function describeVaultRecord(record: VaultRecord): string {
  const { kdf } = record;
  const memoryMiB = Math.round(kdf.memLimitBytes / (1024 * 1024));
  return `${VAULT_FORMAT} · Argon2id13 ops=${kdf.opsLimit} mem=${memoryMiB} MiB`;
}
