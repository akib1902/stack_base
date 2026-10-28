import type { EncryptionManifest, PublicShare, WrappedKey } from '@stackbase/contracts';
import { fromBase64, toBase64 } from './encoding';
import { CryptoError } from './errors';
import { decryptFile } from './file-format';
import { getSodium } from './sodium';
import { unwrapDataKey, wrapDataKey } from './vault';

/**
 * Share capability (SRS A7.2 / ADR-019). A share stores the version's data key
 * wrapped under a fresh 32-byte secret that only ever appears in the URL
 * fragment. The API therefore holds no key that can open shared content; a
 * recipient browser unwraps the data key locally and decrypts the same
 * `stackbase/1` ciphertext.
 */

export const SHARE_SECRET_BYTES = 32;

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const toBase64Url = (bytes: Uint8Array): string =>
  toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromBase64Url = (value: string): Uint8Array => {
  if (!BASE64URL_PATTERN.test(value)) {
    throw new CryptoError('INVALID_SHARE_KEY', 'This link does not contain a valid share key.');
  }
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return fromBase64(base64.padEnd(44, '='));
};

export interface ShareCapability {
  /** The fragment secret; never sent to the API. */
  secret: string;
  /** The version's data key, wrapped under the fragment secret. */
  wrappedKey: WrappedKey;
}

/**
 * Re-wraps one version's data key under a brand-new share secret. The vault key
 * itself is never part of the capability, so a leaked link cannot unlock the
 * rest of the drive.
 */
export async function createShareCapability(
  vaultKey: Uint8Array,
  manifest: EncryptionManifest,
): Promise<ShareCapability> {
  const sodium = await getSodium();
  const dataKey = await unwrapDataKey(vaultKey, manifest.wrappedKey);
  const shareKey = sodium.crypto_secretbox_keygen();

  try {
    const { wrappedKey } = await wrapDataKey(shareKey, dataKey);
    return { secret: toBase64Url(shareKey), wrappedKey };
  } finally {
    sodium.memzero(dataKey);
    sodium.memzero(shareKey);
  }
}

/** Decodes the fragment secret; throws `INVALID_SHARE_KEY` when malformed. */
export async function shareKeyFromSecret(secret: string): Promise<Uint8Array> {
  const key = fromBase64Url(secret);
  if (key.length !== SHARE_SECRET_BYTES) {
    throw new CryptoError('INVALID_SHARE_KEY', 'This link does not contain a valid share key.');
  }
  return key;
}

/**
 * Reads the capability out of a `location.hash`. A fragment is never sent to
 * the server, which is exactly why it is the only place this secret lives.
 */
export function readShareSecret(hash: string): string | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    return BASE64URL_PATTERN.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

/** Builds the copyable link; the token is in the path and the key in the fragment. */
export function buildShareUrl(origin: string, token: string, secret: string): string {
  return `${origin.replace(/\/+$/, '')}/s/${encodeURIComponent(token)}#${secret}`;
}

/**
 * Decrypts a public share with the fragment secret. The share's own wrapped key
 * replaces the manifest's vault-wrapped key, so the rest of the pinned format
 * checks (chunk layout, stream header, ciphertext SHA-256) still apply.
 */
export async function* decryptSharedFile({
  view,
  secret,
  body,
}: {
  view: PublicShare;
  secret: string;
  body: ReadableStream<Uint8Array>;
}): AsyncGenerator<Uint8Array, void, void> {
  const sodium = await getSodium();
  const shareKey = await shareKeyFromSecret(secret);

  try {
    yield* decryptFile({
      manifest: { ...view.manifest, wrappedKey: view.wrappedKey },
      vaultKey: shareKey,
      body,
    });
  } finally {
    sodium.memzero(shareKey);
  }
}
