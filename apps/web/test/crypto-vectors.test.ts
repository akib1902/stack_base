import { createHash } from 'node:crypto';
import type { EncryptionManifest, VaultRecord } from '@stackbase/contracts';
import { describe, expect, it } from 'vitest';
import { fromBase64, toBase64, toHex, utf8ToBytes } from '../src/lib/crypto/encoding';
import { CryptoError } from '../src/lib/crypto/errors';
import { assertManifestUsable, decryptFile } from '../src/lib/crypto/file-format';
import { getSodium } from '../src/lib/crypto/sodium';
import { FILE_VECTOR, VAULT_VECTOR } from '../src/lib/crypto/test-vectors';
import { createVault, unlockVault } from '../src/lib/crypto/vault';

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

const hexBytes = (hex: string): Uint8Array => {
  const out = new Uint8Array(hex.length / 2);
  for (let index = 0; index < out.length; index += 1) {
    out[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
};

const concat = (parts: readonly Uint8Array[]): Uint8Array => {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

/**
 * A stream that delivers the bytes in small pieces on purpose: the decryptor
 * must reassemble exact chunk boundaries from arbitrary read sizes.
 */
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

const VECTOR_VAULT_KEY = hexBytes(VAULT_VECTOR.vaultKeyHex);

async function decryptAll(
  manifest: EncryptionManifest,
  ciphertext: Uint8Array,
  vaultKey: Uint8Array = VECTOR_VAULT_KEY,
): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  for await (const chunk of decryptFile({ manifest, vaultKey, body: streamOf(ciphertext) })) {
    parts.push(chunk);
  }
  return concat(parts);
}

describe('vault vector (stackbase/1)', () => {
  it('unlocks to the pinned vault key', async () => {
    const vaultKey = await unlockVault(VAULT_VECTOR.record as VaultRecord, VAULT_VECTOR.passphrase);
    expect(toHex(vaultKey)).toBe(VAULT_VECTOR.vaultKeyHex);
  });

  it('pins the KEK through the wrapped vault key', async () => {
    const sodium = await getSodium();
    const kek = sodium.crypto_pwhash(
      32,
      VAULT_VECTOR.passphrase,
      fromBase64(VAULT_VECTOR.kdf.salt),
      VAULT_VECTOR.kdf.opsLimit,
      VAULT_VECTOR.kdf.memLimitBytes,
      sodium.crypto_pwhash_ALG_ARGON2ID13,
    );
    expect(toHex(kek)).toBe(VAULT_VECTOR.kekHex);
    expect(
      toHex(
        sodium.crypto_secretbox_open_easy(
          fromBase64(VAULT_VECTOR.wrappedVaultKey.ciphertext),
          fromBase64(VAULT_VECTOR.wrappedVaultKey.nonce),
          kek,
        ),
      ),
    ).toBe(VAULT_VECTOR.vaultKeyHex);
  });

  it('rejects the wrong passphrase', async () => {
    await expect(
      unlockVault(VAULT_VECTOR.record as VaultRecord, 'this is not the passphrase'),
    ).rejects.toMatchObject({ code: 'WRONG_PASSPHRASE' });
  });

  it('rejects a record whose verifier was replaced', async () => {
    const tampered: VaultRecord = {
      ...(VAULT_VECTOR.record as VaultRecord),
      recoveryVerifier: {
        ...VAULT_VECTOR.recoveryVerifier,
        ciphertext: `${VAULT_VECTOR.recoveryVerifier.ciphertext.slice(0, -4)}AAAA`,
      },
    };
    await expect(unlockVault(tampered, VAULT_VECTOR.passphrase)).rejects.toMatchObject({
      code: 'WRONG_VAULT_KEY',
    });
  });

  it('creates a vault the schema accepts and unlocks it again', async () => {
    const { request, vaultKey } = await createVault(VAULT_VECTOR.passphrase);
    expect(request.kdf.algorithm).toBe('argon2id13');
    expect(fromBase64(request.kdf.salt)).toHaveLength(16);
    expect(fromBase64(request.wrappedVaultKey.ciphertext)).toHaveLength(48);
    expect(fromBase64(request.recoveryVerifier.ciphertext)).toHaveLength(51);

    const reopened = await unlockVault(
      {
        ...request,
        format: 'stackbase-vault',
        version: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      VAULT_VECTOR.passphrase,
    );
    expect(toHex(reopened)).toBe(toHex(vaultKey));
  }, 120_000);

  it('refuses a passphrase that is too short', async () => {
    await expect(createVault('too short')).rejects.toMatchObject({ code: 'INVALID_PASSPHRASE' });
  });
});

describe('file vector (stackbase/1)', () => {
  const manifest = FILE_VECTOR.manifest as EncryptionManifest;
  const ciphertext = fromBase64(FILE_VECTOR.ciphertextBase64);
  const plaintext = fromBase64(FILE_VECTOR.plaintextBase64);

  it('pins the committed bytes', () => {
    expect(sha256(ciphertext)).toBe(FILE_VECTOR.ciphertextSha256);
    expect(sha256(plaintext)).toBe(FILE_VECTOR.plaintextSha256);
    expect(toBase64(ciphertext.slice(0, 24))).toBe(FILE_VECTOR.streamHeaderBase64);
  });

  it('decrypts the committed ciphertext to the pinned plaintext', async () => {
    expect(toHex(await decryptAll(manifest, ciphertext))).toBe(toHex(plaintext));
  });

  it('rejects a flipped ciphertext byte', async () => {
    const tampered = ciphertext.slice();
    tampered[tampered.length - 5] = (tampered[tampered.length - 5] ?? 0) ^ 0x01;
    await expect(decryptAll(manifest, tampered)).rejects.toMatchObject({
      code: 'DECRYPTION_FAILED',
    });
  });

  it('rejects a truncated or extended stream', async () => {
    await expect(
      decryptAll(manifest, ciphertext.slice(0, ciphertext.length - 1)),
    ).rejects.toMatchObject({ code: 'DECRYPTION_FAILED' });
    await expect(
      decryptAll(manifest, concat([ciphertext, new Uint8Array([1])])),
    ).rejects.toMatchObject({ code: 'DECRYPTION_FAILED' });
  });

  it('rejects a header that does not match the committed stream', async () => {
    await expect(
      decryptAll(
        { ...manifest, streamHeader: toBase64(new Uint8Array(24).fill(9)) },
        ciphertext,
      ),
    ).rejects.toMatchObject({ code: 'DECRYPTION_FAILED' });
  });

  it('rejects a ciphertext that does not match the recorded hash', async () => {
    const decrypted = await decryptAll(manifest, ciphertext);
    expect(decrypted.length).toBe(100);
    await expect(
      decryptAll(
        { ...manifest, ciphertextHash: '0'.repeat(64) },
        ciphertext,
      ),
    ).rejects.toMatchObject({ code: 'DECRYPTION_FAILED' });
  });

  it('rejects a data key wrapped under a different vault key', async () => {
    await expect(
      decryptAll(manifest, ciphertext, new Uint8Array(32).fill(7)),
    ).rejects.toMatchObject({ code: 'WRONG_VAULT_KEY' });
  });

  it('rejects manifests that break the pinned layout', () => {
    expect(() => assertManifestUsable(manifest)).not.toThrow();
    expect(() =>
      assertManifestUsable({ ...manifest, ciphertextSize: manifest.ciphertextSize - 1 }),
    ).toThrowError(CryptoError);
    expect(() =>
      assertManifestUsable({ ...manifest, cipher: 'aes-gcm' } as unknown as EncryptionManifest),
    ).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_MANIFEST' }));
  });
});

describe('byte helpers', () => {
  it('produce the same bytes libsodium accepts', async () => {
    const sodium = await getSodium();
    const bytes = utf8ToBytes(VAULT_VECTOR.passphrase);
    expect(toHex(bytes)).toBe(toHex(new Uint8Array(Buffer.from(VAULT_VECTOR.passphrase, 'utf8'))));
    expect(sodium.crypto_hash_sha256(bytes)).toHaveLength(32);
  });
});
