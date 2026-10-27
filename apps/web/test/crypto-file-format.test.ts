import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { fromBase64, toHex } from '../src/lib/crypto/encoding';
import { CryptoError } from '../src/lib/crypto/errors';
import {
  byteSourceFromBytes,
  decryptFile,
  startEncryption,
  type ByteSource,
  type EncryptedChunk,
} from '../src/lib/crypto/file-format';
import { FILE_VECTOR, VAULT_VECTOR } from '../src/lib/crypto/test-vectors';
import type { EncryptionManifest } from '@stackbase/contracts';

const CHUNK_SIZE = 64 * 1024;
const VAULT_KEY = hexBytes(VAULT_VECTOR.vaultKeyHex);

function hexBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let index = 0; index < out.length; index += 1) {
    out[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
}

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

const filler = (length: number): Uint8Array =>
  Uint8Array.from({ length }, (_, index) => (index * 13 + 29) % 256);

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

const streamOf = (bytes: Uint8Array, pieceSize = 4096): ReadableStream<Uint8Array> => {
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.length) {
        controller.close();
        return;
      }
      controller.enqueue(bytes.slice(offset, offset + pieceSize));
      offset += pieceSize;
    },
  });
};

async function encryptAll(source: ByteSource, vaultKey = VAULT_KEY) {
  const session = await startEncryption(source, { vaultKey, chunkSize: CHUNK_SIZE });

  const chunks: EncryptedChunk[] = [];
  const iterator = session.encrypt();
  let step = await iterator.next();
  while (!step.done) {
    chunks.push(step.value);
    step = await iterator.next();
  }

  const hashes = step.value;
  // What the server persists once finalize declares the two hashes.
  const manifest: EncryptionManifest = { ...session.manifest, ...hashes };
  return { session, chunks, hashes, manifest };
}

async function decryptAll(manifest: EncryptionManifest, ciphertext: Uint8Array, vaultKey = VAULT_KEY) {
  const parts: Uint8Array[] = [];
  for await (const chunk of decryptFile({ manifest, vaultKey, body: streamOf(ciphertext) })) {
    parts.push(chunk);
  }
  return concat(parts);
}

describe('file encryption layout', () => {
  it('produces manifests that match the pinned arithmetic', async () => {
    const plaintext = filler(150_000);
    const { session, chunks, hashes } = await encryptAll(byteSourceFromBytes(plaintext));


    expect(session.manifest.chunking).toEqual({
      plaintextChunkSize: CHUNK_SIZE,
      totalChunks: 3,
    });
    expect(session.manifest.plaintextSize).toBe(150_000);
    expect(session.manifest.ciphertextSize).toBe(150_000 + 3 * 17 + 24);
    expect(chunks.map((chunk) => chunk.chunkNumber)).toEqual([0, 1, 2]);
    expect(chunks.map((chunk) => chunk.data.length)).toEqual([
      CHUNK_SIZE + 17,
      CHUNK_SIZE + 17,
      150_000 - 2 * CHUNK_SIZE + 17,
    ]);

    // Hashes are computed over the whole stream, header included, and agree
    // with an independent SHA-256 implementation.
    const ciphertext = concat([fromBase64(session.manifest.streamHeader), ...chunks.map((c) => c.data)]);
    expect(hashes.ciphertextHash).toBe(sha256(ciphertext));
    expect(hashes.plaintextFingerprint).toBe(sha256(plaintext));
    expect(chunks[0]?.checksum).toBe(sha256(chunks[0]!.data));
    expect(new TextEncoder().encode(hashes.ciphertextHash)).toHaveLength(64);
  });

  it('round-trips every interesting size, including exact multiples', async () => {
    for (const size of [0, 1, 100, CHUNK_SIZE - 1, CHUNK_SIZE, CHUNK_SIZE + 1, 2 * CHUNK_SIZE]) {
      const plaintext = filler(size);
      const { session, chunks, hashes, manifest } = await encryptAll(byteSourceFromBytes(plaintext));
      const ciphertext = concat([
        fromBase64(session.manifest.streamHeader),
        ...chunks.map((chunk) => chunk.data),
      ]);

      expect(chunks).toHaveLength(session.totalChunks);
      expect(session.manifest.ciphertextSize).toBe(ciphertext.length);
      expect(hashes.plaintextFingerprint).toBe(sha256(plaintext));

      const decrypted = await decryptAll(manifest, ciphertext);
      expect(decrypted.length).toBe(size);
      expect(toHex(decrypted)).toBe(toHex(plaintext));
    }
  });

  it('reads the source in chunk-sized slices and never holds more than one chunk', async () => {
    const plaintext = filler(3 * CHUNK_SIZE);
    const reads: Array<[number, number]> = [];
    const tracked: ByteSource = {
      size: plaintext.length,
      slice: (start, end) => {
        reads.push([start, end]);
        return byteSourceFromBytes(plaintext).slice(start, end);
      },
    };

    await encryptAll(tracked);
    expect(reads).toEqual([
      [0, CHUNK_SIZE],
      [CHUNK_SIZE, 2 * CHUNK_SIZE],
      [2 * CHUNK_SIZE, 3 * CHUNK_SIZE],
    ]);
  });

  it('refuses to run an encryption session twice', async () => {
    const session = await startEncryption(byteSourceFromBytes(filler(10)), {
      vaultKey: VAULT_KEY,
      chunkSize: CHUNK_SIZE,
    });
    const iterator = session.encrypt();
    await iterator.next();
    await expect(session.encrypt().next()).rejects.toMatchObject({ code: 'ENCRYPTION_FAILED' });
  });
});

describe('file decryption authenticity', () => {
  async function encryptThreeChunks() {
    const plaintext = filler(2 * CHUNK_SIZE + 1234);
    const { manifest, chunks } = await encryptAll(byteSourceFromBytes(plaintext));
    return { manifest, chunks, plaintext };
  }

  it('rejects reordered chunks', async () => {
    const { manifest, chunks } = await encryptThreeChunks();
    const reordered = concat([
      fromBase64(manifest.streamHeader),
      chunks[1]!.data,
      chunks[0]!.data,
      chunks[2]!.data,
    ]);
    await expect(decryptAll(manifest, reordered)).rejects.toMatchObject({
      code: 'DECRYPTION_FAILED',
    });
  });

  it('rejects a missing final chunk', async () => {
    const { manifest, chunks } = await encryptThreeChunks();
    const truncated = concat([
      fromBase64(manifest.streamHeader),
      chunks[0]!.data,
      chunks[1]!.data,
    ]);
    await expect(decryptAll(manifest, truncated)).rejects.toMatchObject({
      code: 'DECRYPTION_FAILED',
    });
  });

  it('rejects a corrupted chunk and a wrong vault key', async () => {
    const { manifest, chunks } = await encryptThreeChunks();
    const corrupted = chunks[1]!.data.slice();
    corrupted[10] = (corrupted[10] ?? 0) ^ 0x20;
    await expect(
      decryptAll(
        manifest,
        concat([fromBase64(manifest.streamHeader), chunks[0]!.data, corrupted, chunks[2]!.data]),
      ),
    ).rejects.toMatchObject({ code: 'DECRYPTION_FAILED' });

    await expect(
      decryptAll(
        manifest,
        concat([fromBase64(manifest.streamHeader), ...chunks.map((chunk) => chunk.data)]),
        new Uint8Array(32).fill(3),
      ),
    ).rejects.toMatchObject({ code: 'WRONG_VAULT_KEY' });
  });

  it('rejects a manifest that disagrees with the stream', async () => {
    const { manifest, chunks } = await encryptThreeChunks();
    const ciphertext = concat([
      fromBase64(manifest.streamHeader),
      ...chunks.map((chunk) => chunk.data),
    ]);
    await expect(
      decryptAll({ ...manifest, ciphertextHash: sha256(new Uint8Array(1)) }, ciphertext),
    ).rejects.toMatchObject({ code: 'DECRYPTION_FAILED' });
    await expect(decryptAll({ ...manifest, plaintextSize: 5 }, ciphertext)).rejects.toBeInstanceOf(
      CryptoError,
    );
  });

  it('keeps the committed single-chunk vector compatible with the encrypter', async () => {
    const vectorManifest = FILE_VECTOR.manifest as EncryptionManifest;
    const plaintext = fromBase64(FILE_VECTOR.plaintextBase64);
    const { session, chunks } = await encryptAll(byteSourceFromBytes(plaintext));
    expect(session.manifest.chunking).toEqual(vectorManifest.chunking);
    expect(session.manifest.ciphertextSize).toBe(vectorManifest.ciphertextSize);
    expect(chunks).toHaveLength(1);
    expect(fromBase64(session.manifest.streamHeader)).toHaveLength(24);
    expect(fromBase64(session.manifest.wrappedKey.ciphertext)).toHaveLength(48);
  });
});
