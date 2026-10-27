import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Seals MTProto session strings with AES-256-GCM under the deployment-managed
 * key (SRS A4.4 / ADR-016). Format: `v1.<base64 nonce>.<base64 ct+tag>`.
 * The key version is stored alongside the ciphertext so rotation can add `v2`
 * without breaking existing rows.
 */

const ALGORITHM = 'aes-256-gcm';
const NONCE_BYTES = 12;
const TAG_BYTES = 16;

export interface SessionKey {
  key: Buffer;
  version: string;
}

export class SessionCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionCryptoError';
  }
}

export function sealSession(plaintext: string, sessionKey: SessionKey): Buffer {
  if (sessionKey.key.length !== 32) {
    throw new SessionCryptoError('session key must be 32 bytes');
  }
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(ALGORITHM, sessionKey.key, nonce);
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.from(
    `${sessionKey.version}.${nonce.toString('base64')}.${Buffer.concat([body, tag]).toString('base64')}`,
    'utf8',
  );
}

/** Throws SessionCryptoError on tampering, a wrong key or an unknown version. */
export function openSession(sealed: Buffer | Uint8Array, sessionKey: SessionKey): string {
  const text = Buffer.from(sealed).toString('utf8');
  const parts = text.split('.');
  if (parts.length !== 3) {
    throw new SessionCryptoError('sealed session has an unknown format');
  }
  const [version, noncePart, bodyPart] = parts as [string, string, string];
  if (version !== sessionKey.version) {
    throw new SessionCryptoError(
      `sealed session uses key version "${version}" but "${sessionKey.version}" is configured`,
    );
  }

  const nonce = Buffer.from(noncePart, 'base64');
  const body = Buffer.from(bodyPart, 'base64');
  if (nonce.length !== NONCE_BYTES || body.length < TAG_BYTES) {
    throw new SessionCryptoError('sealed session is malformed');
  }

  const tag = body.subarray(body.length - TAG_BYTES);
  const ciphertext = body.subarray(0, body.length - TAG_BYTES);
  try {
    const decipher = createDecipheriv(ALGORITHM, sessionKey.key, nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    throw new SessionCryptoError('sealed session failed authentication');
  }
}
