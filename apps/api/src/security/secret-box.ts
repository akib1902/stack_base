import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Authenticated encryption for the few deployment credentials that are edited
 * through the web UI. The master key lives only in the API environment
 * (SETTINGS_ENCRYPTION_KEY); the database stores opaque sealed strings. There is
 * no endpoint that returns a plaintext value.
 *
 * Format: v1.<base64url nonce>.<base64url ciphertext+tag>
 */

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const NONCE_BYTES = 12;
const AAD = Buffer.from('stackbase:deployment-settings:v1', 'utf8');
const SEALED_PATTERN = /^v1\.[A-Za-z0-9_-]{16,32}\.[A-Za-z0-9_-]{16,}$/;

export class SecretBoxError extends Error {
  constructor(message = 'The deployment secret could not be opened.') {
    super(message);
    this.name = 'SecretBoxError';
  }
}

export interface SettingsKey {
  key: Buffer;
  version: string;
}

/** Parse a 32-byte base64 key, returning a user-safe validation problem. */
export function parseSettingsKey(value: string | undefined): {
  key: SettingsKey | null;
  problem: string | null;
} {
  if (!value) return { key: null, problem: null };

  let bytes: Buffer;
  try {
    bytes = Buffer.from(value, 'base64');
  } catch {
    return { key: null, problem: 'SETTINGS_ENCRYPTION_KEY must be valid base64' };
  }

  if (bytes.length !== 32) {
    return {
      key: null,
      problem: 'SETTINGS_ENCRYPTION_KEY must be exactly 32 bytes encoded as base64',
    };
  }

  return { key: { key: bytes, version: VERSION }, problem: null };
}

export function sealSecret(plaintext: string, key: SettingsKey): string {
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(ALGORITHM, key.key, nonce);
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}.${nonce.toString('base64url')}.${Buffer.concat([ciphertext, tag]).toString(
    'base64url',
  )}`;
}

export function openSecret(sealed: string, key: SettingsKey): string {
  const parts = sealed.split('.');
  if (parts.length !== 3 || parts[0] !== VERSION) {
    throw new SecretBoxError('The stored deployment secret has an unsupported format.');
  }
  try {
    const nonce = Buffer.from(parts[1]!, 'base64url');
    const payload = Buffer.from(parts[2]!, 'base64url');
    if (nonce.length !== NONCE_BYTES || payload.length <= 16) {
      throw new Error('bad length');
    }
    const ciphertext = payload.subarray(0, payload.length - 16);
    const tag = payload.subarray(payload.length - 16);
    const decipher = createDecipheriv(ALGORITHM, key.key, nonce);
    decipher.setAAD(AAD);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    throw new SecretBoxError();
  }
}

export function isSealedSecret(value: unknown): value is string {
  return typeof value === 'string' && SEALED_PATTERN.test(value);
}
