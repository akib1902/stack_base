import type { EncryptionManifest, UploadManifest } from '@stackbase/contracts';
import {
  DEFAULT_PLAINTEXT_CHUNK_SIZE,
  FILE_CIPHER,
  FILE_MANIFEST_FORMAT,
  FILE_MANIFEST_VERSION,
  MAX_PLAINTEXT_CHUNK_SIZE,
  MIN_PLAINTEXT_CHUNK_SIZE,
  SECRETBOX_NONCE_BYTES,
  SECRETSTREAM_HEADER_BYTES,
  SHA256_HEX_PATTERN,
  WRAPPED_KEY_BYTES,
  checkManifestConsistency,
  ciphertextChunkLength,
  ciphertextSizeFor,
  totalChunksFor,
} from '@stackbase/contracts';
import { equalBytes, fromBase64, toBase64, toHex } from './encoding';
import { CRYPTO_ERROR_COPY, CryptoError } from './errors';
import { getSodium, type Sodium } from './sodium';
import { unwrapDataKey, wrapDataKey } from './vault';

/**
 * The file half of `stackbase/1` (docs/architecture/encryption-format.md):
 * XChaCha20-Poly1305 secretstream chunks behind a 24-byte header, with every
 * byte of the ciphertext hashed while it is produced. The layout matches the
 * contracts' chunk arithmetic exactly — that arithmetic is what the server
 * validates while receiving.
 */

/**
 * Minimal read-only byte source. `Blob`/`File` satisfy it structurally, and
 * `byteSourceFromBytes` covers tests and in-memory previews.
 */
export interface ByteSource {
  readonly size: number;
  slice(start: number, end: number): { arrayBuffer(): Promise<ArrayBuffer> };
}

export function byteSourceFromBytes(bytes: Uint8Array): ByteSource {
  const source = bytes.slice();
  return {
    size: source.byteLength,
    slice: (start, end) => ({
      arrayBuffer: async () => source.slice(start, end).buffer as ArrayBuffer,
    }),
  };
}

export interface EncryptedChunk {
  chunkNumber: number;
  /** Exactly `ciphertextChunkLength` bytes; the header is not part of a chunk. */
  data: Uint8Array;
  /** Lowercase hex SHA-256 of `data`, sent as the chunk checksum header. */
  checksum: string;
}

export interface EncryptedFileHashes {
  ciphertextHash: string;
  plaintextFingerprint: string;
}

export interface EncryptionSession {
  /** What the client POSTs to create the upload job (no hashes yet). */
  manifest: UploadManifest;
  totalChunks: number;
  /**
   * Yields chunks in order and returns the two hashes the client declares at
   * finalize. Drive it manually:
   * `let step = await iterator.next(); … ; step.value` holds the hashes when done.
   */
  encrypt(): AsyncGenerator<EncryptedChunk, EncryptedFileHashes, void>;
}

interface Hasher {
  update(bytes: Uint8Array): void;
  final(): string;
}

function createHasher(sodium: Sodium): Hasher {
  const state = sodium.crypto_hash_sha256_init();
  return {
    update: (bytes) => sodium.crypto_hash_sha256_update(state, bytes),
    final: () => toHex(sodium.crypto_hash_sha256_final(state)),
  };
}

const isHex64 = (value: string): boolean => new RegExp(SHA256_HEX_PATTERN).test(value);

/**
 * Client-side mirror of the server's manifest validation (format section 4).
 * A manifest that fails here is never used for encryption or decryption.
 */
export function assertManifestUsable(manifest: EncryptionManifest): void {
  const invalid = (detail: string): never => {
    throw new CryptoError('INVALID_MANIFEST', `Encryption metadata is invalid: ${detail}`);
  };

  if (manifest.format !== FILE_MANIFEST_FORMAT) {
    throw new CryptoError(
      'UNSUPPORTED_MANIFEST',
      `Unsupported manifest format “${String(manifest.format)}”.`,
    );
  }
  if (manifest.version !== FILE_MANIFEST_VERSION) {
    throw new CryptoError('UNSUPPORTED_MANIFEST', `Unsupported manifest version ${manifest.version}.`);
  }
  if (manifest.cipher !== FILE_CIPHER) {
    throw new CryptoError('UNSUPPORTED_MANIFEST', `Unsupported cipher “${String(manifest.cipher)}”.`);
  }

  const chunkSize = manifest.chunking.plaintextChunkSize;
  if (
    !Number.isInteger(chunkSize) ||
    chunkSize < MIN_PLAINTEXT_CHUNK_SIZE ||
    chunkSize > MAX_PLAINTEXT_CHUNK_SIZE
  ) {
    invalid(`plaintextChunkSize ${chunkSize} is outside the pinned range`);
  }
  if (!Number.isInteger(manifest.plaintextSize) || manifest.plaintextSize < 0) {
    invalid('plaintextSize is not a non-negative integer');
  }
  const consistency = checkManifestConsistency(manifest, {
    maxPlaintextBytes: Number.MAX_SAFE_INTEGER,
  });
  if (consistency !== null) invalid(consistency);

  if (!isHex64(manifest.ciphertextHash)) invalid('ciphertextHash is not a lowercase hex SHA-256');
  if (!isHex64(manifest.plaintextFingerprint)) {
    invalid('plaintextFingerprint is not a lowercase hex SHA-256');
  }

  try {
    if (fromBase64(manifest.streamHeader).length !== SECRETSTREAM_HEADER_BYTES) {
      invalid('streamHeader is not 24 bytes');
    }
    if (fromBase64(manifest.wrappedKey.ciphertext).length !== WRAPPED_KEY_BYTES) {
      invalid('wrappedKey.ciphertext is not 48 bytes');
    }
    if (fromBase64(manifest.wrappedKey.nonce).length !== SECRETBOX_NONCE_BYTES) {
      invalid('wrappedKey.nonce is not 24 bytes');
    }
  } catch {
    invalid('a base64 field could not be decoded');
  }

  if (manifest.wrappedKey.algorithm !== 'xsalsa20poly1305') {
    invalid(`unsupported key-wrapping algorithm “${String(manifest.wrappedKey.algorithm)}”`);
  }
}

/**
 * Starts an encryption session: generates the data key, wraps it with the vault
 * key, initialises the secretstream (which fixes the header and therefore the
 * manifest) and returns the generator that produces the chunks.
 */
export async function startEncryption(
  source: ByteSource,
  options: { vaultKey: Uint8Array; chunkSize?: number },
): Promise<EncryptionSession> {
  const sodium = await getSodium();
  const chunkSize = options.chunkSize ?? DEFAULT_PLAINTEXT_CHUNK_SIZE;

  if (
    !Number.isInteger(chunkSize) ||
    chunkSize < MIN_PLAINTEXT_CHUNK_SIZE ||
    chunkSize > MAX_PLAINTEXT_CHUNK_SIZE
  ) {
    throw new CryptoError(
      'INVALID_MANIFEST',
      `Chunk size must be between ${MIN_PLAINTEXT_CHUNK_SIZE} and ${MAX_PLAINTEXT_CHUNK_SIZE} bytes.`,
    );
  }

  const totalChunks = totalChunksFor(source.size, chunkSize);
  const { dataKey, wrappedKey } = await wrapDataKey(options.vaultKey);
  const { state, header } = sodium.crypto_secretstream_xchacha20poly1305_init_push(dataKey);

  const manifest: UploadManifest = {
    format: FILE_MANIFEST_FORMAT,
    version: FILE_MANIFEST_VERSION,
    cipher: FILE_CIPHER,
    chunking: { plaintextChunkSize: chunkSize, totalChunks },
    plaintextSize: source.size,
    ciphertextSize: ciphertextSizeFor(source.size, chunkSize),
    streamHeader: toBase64(header),
    wrappedKey,
  };

  let started = false;

  async function* encrypt(): AsyncGenerator<EncryptedChunk, EncryptedFileHashes, void> {
    if (started) {
      throw new CryptoError('ENCRYPTION_FAILED', 'This session already produced its chunks.');
    }
    started = true;

    const ciphertextHasher = createHasher(sodium);
    const plaintextHasher = createHasher(sodium);
    ciphertextHasher.update(header);

    try {
      for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber += 1) {
        const start = chunkNumber * chunkSize;
        const end = Math.min(source.size, start + chunkSize);
        const plaintext = new Uint8Array(await source.slice(start, end).arrayBuffer());
        const isLast = chunkNumber === totalChunks - 1;

        const ciphertext = sodium.crypto_secretstream_xchacha20poly1305_push(
          state,
          plaintext,
          null,
          isLast
            ? sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
            : sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE,
        );

        ciphertextHasher.update(ciphertext);
        plaintextHasher.update(plaintext);

        yield {
          chunkNumber,
          data: ciphertext,
          checksum: toHex(sodium.crypto_hash_sha256(ciphertext)),
        };
      }
    } catch (error) {
      if (error instanceof CryptoError) throw error;
      throw new CryptoError('ENCRYPTION_FAILED', CRYPTO_ERROR_COPY.ENCRYPTION_FAILED);
    } finally {
      sodium.memzero(dataKey);
    }

    return {
      ciphertextHash: ciphertextHasher.final(),
      plaintextFingerprint: plaintextHasher.final(),
    };
  }

  return { manifest, totalChunks, encrypt };
}

/**
 * Reads exact byte counts out of a network stream. A read may deliver more
 * bytes than the current chunk needs, so the remainder is carried over instead
 * of being dropped — without this, a chunk boundary that lands mid-read would
 * corrupt every following chunk.
 */
class ExactReader {
  private pending: Uint8Array = new Uint8Array(0);

  constructor(private readonly reader: ReadableStreamDefaultReader<Uint8Array>) {}

  async readExactly(byteLength: number): Promise<Uint8Array> {
    const out = new Uint8Array(byteLength);
    let received = 0;

    if (this.pending.length > 0) {
      received = Math.min(this.pending.length, byteLength);
      out.set(this.pending.subarray(0, received), 0);
      this.pending = this.pending.subarray(received);
    }

    while (received < byteLength) {
      const step = await this.reader.read();
      if (step.done) {
        throw new CryptoError(
          'DECRYPTION_FAILED',
          'The encrypted stream ended before the declared size.',
        );
      }
      const value = step.value;
      if (value.length === 0) continue;

      const needed = byteLength - received;
      if (value.length > needed) {
        out.set(value.subarray(0, needed), received);
        this.pending = value.subarray(needed);
        received = byteLength;
      } else {
        out.set(value, received);
        received += value.length;
      }
    }

    return out;
  }

  /** True when the stream still holds bytes the manifest does not account for. */
  async hasTrailingBytes(): Promise<boolean> {
    if (this.pending.length > 0) return true;
    for (;;) {
      const step = await this.reader.read();
      if (step.done) return false;
      if ((step.value?.length ?? 0) > 0) return true;
    }
  }
}

export interface DecryptFileOptions {
  manifest: EncryptionManifest;
  vaultKey: Uint8Array;
  /** The ciphertext stream, typically the body of the download response. */
  body: ReadableStream<Uint8Array>;
}

/**
 * Decrypts one version in chunk order. Every chunk is authenticated by the
 * secretstream construction, the stream must be exactly as long as the manifest
 * declares, and the SHA-256 over the whole ciphertext must equal
 * `ciphertextHash` — otherwise nothing is returned and the generator throws.
 */
export async function* decryptFile({
  manifest,
  vaultKey,
  body,
}: DecryptFileOptions): AsyncGenerator<Uint8Array, void, void> {
  assertManifestUsable(manifest);
  const sodium = await getSodium();
  const dataKey = await unwrapDataKey(vaultKey, manifest.wrappedKey);
  const reader = body.getReader();
  const source = new ExactReader(reader);

  try {
    const header = await source.readExactly(SECRETSTREAM_HEADER_BYTES);
    if (!equalBytes(header, fromBase64(manifest.streamHeader))) {
      throw new CryptoError(
        'DECRYPTION_FAILED',
        'The stream header does not match the stored manifest.',
      );
    }

    const hasher = createHasher(sodium);
    hasher.update(header);
    const state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(header, dataKey);

    let plaintextBytes = 0;
    const { totalChunks } = manifest.chunking;

    for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber += 1) {
      const ciphertext = await source.readExactly(ciphertextChunkLength(manifest, chunkNumber));
      hasher.update(ciphertext);

      const opened = sodium.crypto_secretstream_xchacha20poly1305_pull(state, ciphertext, null);
      if (opened === false) {
        throw new CryptoError('DECRYPTION_FAILED', CRYPTO_ERROR_COPY.DECRYPTION_FAILED);
      }

      const expectedTag =
        chunkNumber === totalChunks - 1
          ? sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
          : sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE;
      if (opened.tag !== expectedTag) {
        throw new CryptoError(
          'DECRYPTION_FAILED',
          'The encrypted stream is truncated or has extra chunks.',
        );
      }

      plaintextBytes += opened.message.length;
      if (opened.message.length > 0) yield opened.message;
    }

    if (await source.hasTrailingBytes()) {
      throw new CryptoError('DECRYPTION_FAILED', 'The encrypted stream has trailing bytes.');
    }

    if (plaintextBytes !== manifest.plaintextSize) {
      throw new CryptoError(
        'DECRYPTION_FAILED',
        'The decrypted size does not match the declared plaintext size.',
      );
    }
    if (hasher.final() !== manifest.ciphertextHash) {
      throw new CryptoError(
        'DECRYPTION_FAILED',
        'The encrypted stream does not match its recorded SHA-256.',
      );
    }
  } finally {
    sodium.memzero(dataKey);
    await reader.cancel().catch(() => undefined);
  }
}

/** Convenience wrapper for the download button. */
export async function decryptToBlob(options: DecryptFileOptions): Promise<Blob> {
  const parts: Uint8Array[] = [];
  for await (const chunk of decryptFile(options)) {
    parts.push(chunk);
  }
  return new Blob(parts as BlobPart[]);
}
