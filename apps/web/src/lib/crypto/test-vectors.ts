import type { EncryptionManifest, VaultKdf, WrappedKey } from '@stackbase/contracts';

/**
 * Pinned test vectors for `stackbase/1` (format document §6). They were produced
 * once with libsodium's reference implementation and are asserted by
 * `test/crypto-vectors.test.ts`; any change that breaks one of them is a format
 * change and must bump the format version.
 *
 * Determinism notes:
 * - The vault vector is fully deterministic: salt, passphrase, KDF parameters,
 *   vault key and both secretbox nonces are fixed, so the wrapped key and the
 *   recovery verifier are byte-for-byte reproducible. Because the wrapped key
 *   can only be opened with the KEK those parameters derive, `unlockVault`
 *   reproducing `vaultKeyHex` also pins the Argon2id derivation.
 * - The file vector pins the decrypt direction: `crypto_secretstream_init_push`
 *   draws a random stream header and libsodium exposes no way to supply one, so
 *   a committed ciphertext (header included) is the only deterministic artifact
 *   for the stream construction. Encryption is verified by round-tripping at
 *   runtime with an independent SHA-256, plus the multi-chunk and tamper cases
 *   in the same test file.
 */

export const VAULT_VECTOR = {
  passphrase: 'stackbase/1 test vector passphrase',
  kdf: {
    algorithm: 'argon2id13',
    opsLimit: 3,
    /** The schema minimum, chosen so the vector stays fast to run. */
    memLimitBytes: 8 * 1024 * 1024,
    salt: 'AAECAwQFBgcICQoLDA0ODw==',
  } satisfies VaultKdf,
  /** Argon2id13(32, passphrase, salt, 3, 8 MiB). */
  kekHex: 'cdb0edb864e17ba49fee34dc1a39881bf0762023a40f7ec0c2e979ee1b68dcd1',
  vaultKeyHex: '404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f',
  wrappedVaultKey: {
    algorithm: 'xsalsa20poly1305',
    nonce: 'oKGio6SlpqeoqaqrrK2ur7CxsrO0tba3',
    ciphertext: '2LxwhuRwl6tEqaJd6V20ccIPUr7l4tqyxVPvSzOFGbPc1DZIBsPElgBlGP1DhJBx',
  } satisfies WrappedKey,
  recoveryVerifier: {
    algorithm: 'xsalsa20poly1305',
    nonce: 'sLGys7S1tre4ubq7vL2+v8DBwsPExcbH',
    ciphertext: 'UUj7NgRSaS/FM5kXH27sevhWOg5bvoPgR8vq/erykIt+XOb9QBXdIsT359YmbwDPVUm8',
  } satisfies WrappedKey,
  /** Timestamps are placeholders: they are display data, not format data. */
  record: {
    format: 'stackbase-vault',
    version: 1,
    kdf: {
      algorithm: 'argon2id13',
      opsLimit: 3,
      memLimitBytes: 8 * 1024 * 1024,
      salt: 'AAECAwQFBgcICQoLDA0ODw==',
    },
    wrappedVaultKey: {
      algorithm: 'xsalsa20poly1305',
      nonce: 'oKGio6SlpqeoqaqrrK2ur7CxsrO0tba3',
      ciphertext: '2LxwhuRwl6tEqaJd6V20ccIPUr7l4tqyxVPvSzOFGbPc1DZIBsPElgBlGP1DhJBx',
    },
    recoveryVerifier: {
      algorithm: 'xsalsa20poly1305',
      nonce: 'sLGys7S1tre4ubq7vL2+v8DBwsPExcbH',
      ciphertext: 'UUj7NgRSaS/FM5kXH27sevhWOg5bvoPgR8vq/erykIt+XOb9QBXdIsT359YmbwDPVUm8',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
} as const;

/** The data key of `FILE_VECTOR`, wrapped by the vault vector's vault key. */
export const FILE_VECTOR = {
  dataKeyHex: '202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f',
  chunkSize: 64 * 1024,
  /** 100 bytes of deterministic filler: byte i = (i * 7 + 3) mod 256. */
  plaintextBase64:
    'AwoRGB8mLTQ7QklQV15lbHN6gYiPlp2kq7K5wMfO1dzj6vH4/wYNFBsiKTA3PkVMU1phaG92fYSLkpmgp661vMPK0djf5u30+wIJEBceJSwzOkFIT1ZdZGtyeYCHjpWco6qxuA==',
  plaintextSha256: '5a2cda2351d1cdd9dd7957e57c0b3c8522451f25b6494569b7e94388c46f0980',
  streamHeaderBase64: 'D6HO9PCeCwdkekU/MfnehndGfTIHn5Kq',
  ciphertextBase64:
    'D6HO9PCeCwdkekU/MfnehndGfTIHn5KqFiiCGFU9HJquR34v0Wg6F0yOWWFuvplbLwLu/7wPMwZE+oBc0OeP6QJ/Lbe2Ju/kN9Egvb9eue9PKOsoRCef6CP8LqKYvgv646sxa6I7vy+2hRzdO5QSe5cBVvss2jGgqf/3q1fVS1nvi6zJex3dtkyROqbU',
  ciphertextSha256: '85d9477467fa0282e2f80cc48e2fd720aba1e9d905cc0b720860851188262e4a',
  manifest: {
    format: 'stackbase-file',
    version: 1,
    cipher: 'xchacha20poly1305-secretstream',
    chunking: { plaintextChunkSize: 64 * 1024, totalChunks: 1 },
    plaintextSize: 100,
    ciphertextSize: 141,
    ciphertextHash: '85d9477467fa0282e2f80cc48e2fd720aba1e9d905cc0b720860851188262e4a',
    plaintextFingerprint: '5a2cda2351d1cdd9dd7957e57c0b3c8522451f25b6494569b7e94388c46f0980',
    streamHeader: 'D6HO9PCeCwdkekU/MfnehndGfTIHn5Kq',
    wrappedKey: {
      algorithm: 'xsalsa20poly1305',
      nonce: 'wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX',
      ciphertext: 'S8XLg4TdIRaJd//8CVPfxHNVaFb23w/2Y+UK/NHVO8LjnETqKxa2EOs/u3iN0tCB',
    },
  } satisfies EncryptionManifest,
} as const;
