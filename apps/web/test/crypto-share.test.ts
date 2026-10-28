import type { EncryptionManifest, PublicShare } from '@stackbase/contracts';
import { describe, expect, it } from 'vitest';
import { fromBase64, toHex } from '../src/lib/crypto/encoding';
import {
  buildShareUrl,
  createShareCapability,
  decryptSharedFile,
  readShareSecret,
  shareKeyFromSecret,
} from '../src/lib/crypto/share';
import { FILE_VECTOR, VAULT_VECTOR } from '../src/lib/crypto/test-vectors';

const hexBytes = (hex: string): Uint8Array => {
  const out = new Uint8Array(hex.length / 2);
  for (let index = 0; index < out.length; index += 1) {
    out[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
};

const VAULT_KEY = hexBytes(VAULT_VECTOR.vaultKeyHex);
const MANIFEST = FILE_VECTOR.manifest as EncryptionManifest;
const CIPHERTEXT = fromBase64(FILE_VECTOR.ciphertextBase64);
const PLAINTEXT = fromBase64(FILE_VECTOR.plaintextBase64);

const streamOf = (bytes: Uint8Array): ReadableStream<Uint8Array> => {
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.length) {
        controller.close();
        return;
      }
      controller.enqueue(bytes.slice(offset, offset + 16));
      offset += 16;
    },
  });
};

async function decryptAll(view: PublicShare, secret: string): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  for await (const chunk of decryptSharedFile({
    view,
    secret,
    body: streamOf(CIPHERTEXT),
  })) {
    parts.push(chunk);
  }
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function shareView(wrappedKey: PublicShare['wrappedKey']): PublicShare {
  return {
    shareId: '11111111-1111-4111-8111-111111111111',
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt: null,
    maxDownloads: null,
    downloadCount: 0,
    remainingDownloads: null,
    permission: 'read',
    fileName: 'vector.bin',
    mimeType: 'application/octet-stream',
    sizeBytes: MANIFEST.plaintextSize,
    versionNumber: 1,
    ciphertextSizeBytes: MANIFEST.ciphertextSize,
    encryptionFormatVersion: 'stackbase/1',
    manifest: MANIFEST,
    wrappedKey,
  };
}

describe('share capability (stackbase/1)', () => {
  it('re-wraps the data key without exposing the vault key', async () => {
    const capability = await createShareCapability(VAULT_KEY, MANIFEST);
    expect(capability.secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(capability.wrappedKey.algorithm).toBe('xsalsa20poly1305');
    expect(capability.wrappedKey.ciphertext).not.toBe(MANIFEST.wrappedKey.ciphertext);
    expect(capability.wrappedKey.nonce).not.toBe(MANIFEST.wrappedKey.nonce);
    await expect(shareKeyFromSecret(capability.secret)).resolves.toHaveLength(32);
  });

  it('decrypts a shared version with the fragment secret', async () => {
    const capability = await createShareCapability(VAULT_KEY, MANIFEST);
    const decrypted = await decryptAll(shareView(capability.wrappedKey), capability.secret);
    expect(toHex(decrypted)).toBe(toHex(PLAINTEXT));
  });

  it('rejects a different fragment secret', async () => {
    const capability = await createShareCapability(VAULT_KEY, MANIFEST);
    await expect(
      decryptAll(shareView(capability.wrappedKey), 'A'.repeat(43)),
    ).rejects.toMatchObject({ code: 'WRONG_VAULT_KEY' });
  });

  it('rejects a malformed fragment secret', async () => {
    await expect(shareKeyFromSecret('not-a-share-key')).rejects.toMatchObject({
      code: 'INVALID_SHARE_KEY',
    });
    expect(readShareSecret('#short')).toBeNull();
    expect(readShareSecret('')).toBeNull();
  });

  it('reads the secret only from the fragment and builds the link', async () => {
    const capability = await createShareCapability(VAULT_KEY, MANIFEST);
    const token = 'A'.repeat(43);
    const url = buildShareUrl('http://localhost:3000/', token, capability.secret);

    expect(url).toBe(`http://localhost:3000/s/${token}#${capability.secret}`);
    expect(readShareSecret(new URL(url).hash)).toBe(capability.secret);
    expect(new URL(url).search).toBe('');
  });
});
