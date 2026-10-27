# StackBase encryption format — `stackbase/1`

**Status:** pinned (SRS A6, milestone 0 items "finalize the encryption format and test
vectors"). Any change to this document requires a new format version; both the vault and
every file version record the version they were written with, so old data stays readable.

The format is implemented **client-side only**, in the browser (`apps/web/src/lib/crypto`),
on top of the reviewed `libsodium-wrappers-sumo` build of libsodium. The server stores
opaque ciphertext, wrapped keys, non-secret parameters and hashes; it never receives the
passphrase, the vault key, the data keys or any plaintext.

## 1. Primitives

| Purpose | Primitive | libsodium API |
|---|---|---|
| Passphrase KDF | Argon2id13 | `crypto_pwhash` |
| Key wrapping / verifier | XSalsa20-Poly1305 (secretbox) | `crypto_secretbox_easy` / `crypto_secretbox_open_easy` |
| File content | XChaCha20-Poly1305 secretstream | `crypto_secretstream_xchacha20poly1305_{init_push,init_pull,push,pull}` |
| Hashing | SHA-256 | `crypto_hash_sha256_init/update/final` (incremental) |

No new construction is invented: every piece is a documented libsodium primitive with a
single, explicit composition described below.

## 2. Vault key hierarchy

1. **Vault key (VK)** — 32 random bytes, generated in the browser with
   `crypto_secretbox_keygen`.
2. **Salt** — 16 random bytes (`crypto_pwhash_SALTBYTES`).
3. **KDF profile** — Argon2id13, `opsLimit = 3`, `memLimitBytes = 64 MiB` (64 · 1024²).
   The chosen numbers are stored with the vault, so raising the profile later does not
   break existing vaults.
4. **KEK** = `crypto_pwhash(32, passphrase, salt, opsLimit, memLimitBytes,
   crypto_pwhash_ALG_ARGON2ID13)`.
5. **Wrapped vault key** = `crypto_secretbox_easy(VK, nonce, KEK)` — 48 bytes
   (32-byte key + 16-byte Poly1305 tag), `nonce` is 24 random bytes.
6. **Recovery verifier** = `crypto_secretbox_easy(UTF8("stackbase/1
   vault-recovery-verifier"), nonce2, VK)`. Unlocking the vault decrypts the verifier: a
   passphrase that produces the wrong KEK fails the secretbox MAC. The verifier proves the
   recovered VK is the *right* one during initial setup and before destructive actions.

Server-side record (`public.encryption_vaults`, one row per user): format version, KDF
algorithm and parameters, salt, wrapped key (nonce + ciphertext), verifier (nonce +
ciphertext), timestamps. Nothing else — and no endpoint ever accepts or returns key
material beyond this ciphertext.

A passphrase change (later milestone) re-wraps VK under a new KEK and replaces only this
record; no file has to be re-encrypted.

## 3. File version format

1. **Data key (DK)** — 32 random bytes per file version.
2. **Wrapped data key** = `crypto_secretbox_easy(DK, nonce, VK)` (48 bytes, 24-byte nonce).
3. **Stream** — `crypto_secretstream_xchacha20poly1305_init_push(DK)` produces a 24-byte
   header. The plaintext is split into chunks of `plaintextChunkSize` bytes
   (default 1 MiB = 1048576; allowed range 64 KiB – 8 MiB) and pushed sequentially:
   every chunk with tag `MESSAGE`, the **last** chunk with tag `FINAL`. A zero-length file
   is one chunk pushed with tag `FINAL`.
4. **Ciphertext layout** —

   ```text
   [ 24-byte stream header ][ chunk 0 ][ chunk 1 ] … [ chunk N-1 ]
   ```

   `N = max(1, ceil(plaintextSize / plaintextChunkSize))`; every chunk ciphertext is
   `plaintextChunkBytes + 17` bytes (`crypto_secretstream_xchacha20poly1305_ABYTES`).
   The final chunk is the only one that may be shorter than the others.
5. **`ciphertextHash`** — SHA-256 (lowercase hex) over the complete ciphertext stream,
   header included. The client computes it while encrypting; the server recomputes it
   while receiving chunks and again after assembling, and stores it on the version. A
   browser cannot know the final hash before it has streamed the whole file in one pass,
   so the hash pair is **declared at finalize** (`POST /api/v1/uploads/:id/finalize`) and
   persisted into the manifest at that point; the create call carries the manifest
   without hashes (`UploadManifest`, ADR-013 and ADR-017).
6. **`plaintextFingerprint`** — SHA-256 (lowercase hex) over the plaintext stream. Kept
   for duplicate detection and source-file reselection checks (SRS A5.4, FR-14); it is not
   a decryption oracle because it is a one-way hash of content the uploader already had.

Chunk boundaries are public (they derive from `plaintextChunkSize` and `plaintextSize`);
chunk *contents* are individually authenticated and chained, so reordered, missing,
duplicated or altered chunks fail `crypto_secretstream_xchacha20poly1305_pull` before any
plaintext is released.

## 4. Manifest

Each file version persists a manifest (`file_versions.encryption_manifest`, jsonb) that
identifies everything needed to decrypt, and nothing secret:

```json
{
  "format": "stackbase-file",
  "version": 1,
  "cipher": "xchacha20poly1305-secretstream",
  "chunking": { "plaintextChunkSize": 1048576, "totalChunks": 3 },
  "plaintextSize": 3145728,
  "ciphertextSize": 3145789,
  "ciphertextHash": "9f2c…64 hex characters…",
  "plaintextFingerprint": "1a77…64 hex characters…",
  "streamHeader": "base64 24 bytes",
  "wrappedKey": {
    "algorithm": "xsalsa20poly1305",
    "nonce": "base64 24 bytes",
    "ciphertext": "base64 48 bytes"
  }
}
```

`file_versions.encryption_format_version` stores `"stackbase/1"` alongside it.

**Validation (server and client, before any use):**

- `format == "stackbase-file"` and `version == 1` and `cipher` matches the pinned name —
  otherwise the version is rejected as unsupported.
- `65536 ≤ plaintextChunkSize ≤ 8388608`; `plaintextSize ≥ 0`.
- `totalChunks == max(1, ceil(plaintextSize / plaintextChunkSize))`.
- `ciphertextSize == plaintextSize + totalChunks * 17 + 24`.
- `streamHeader` decodes to exactly 24 bytes; `wrappedKey.ciphertext` to exactly 48 bytes;
  `wrappedKey.nonce` to exactly 24 bytes.
- `ciphertextHash` and `plaintextFingerprint` are 64 lowercase hex characters.
- Unknown fields are rejected (`additionalProperties: false`).

A manifest that fails validation is never stored, never attached to a version, and never
used for decryption.

## 5. What the server can and cannot do

| Server sees | Server cannot |
|---|---|
| Ciphertext bytes, sizes, chunk boundaries | Plaintext of any file |
| Wrapped data keys, wrapped vault key | Vault key or data keys |
| KDF parameters, salt, nonces, stream header | Passphrase, KEK |
| SHA-256 hashes (ciphertext, plaintext fingerprint) | Reverse the hashes |
| File names, sizes, MIME types, folders, tags (metadata) | Decrypt names inside content |

The server does verify **transfer integrity**: per-chunk SHA-256 checksums while receiving
and the full `ciphertextHash` after assembly. A mismatch is `UPLOAD_INTEGRITY_FAILED` and
the version is never created.

## 6. Test vectors

Deterministic vectors are committed in `apps/web/src/lib/crypto/test-vectors.ts` and
asserted by `apps/web/test/crypto-vectors.test.ts` (layout and round-trip properties are
covered by `apps/web/test/crypto-file-format.test.ts`):

- **Vault vector** — fixed passphrase, salt and KDF parameters (`ops=3`, `mem=8 MiB`,
  the schema minimum so the vector runs fast) pin the KEK; a pinned vault key and two
  pinned secretbox nonces pin the wrapped vault key and the recovery verifier byte for
  byte. `unlockVault` must reproduce the pinned vault key, and a wrong passphrase or a
  replaced verifier must fail. Because the wrapped key can only open with the KEK those
  parameters derive, this pins Argon2id as well.
- **File vector** — a committed single-chunk ciphertext (stream header included, since
  `crypto_secretstream_xchacha20poly1305_init_push` draws a random header and libsodium
  exposes no way to supply one) with its pinned plaintext, data key, wrapped key, sizes
  and SHA-256 hashes. It must decrypt to exactly the pinned plaintext; a flipped byte, a
  truncated stream, an extended stream, a mismatched header, a mismatched recorded hash
  and a data key wrapped under a different vault key must all fail with no plaintext.
- **Layout and round-trip properties** — sizes `0, 1, 100, chunk−1, chunk, chunk+1,
  2×chunk` encrypt and decrypt back to the original, with manifest arithmetic matching
  the contracts; the declared hashes are checked against an independent SHA-256
  implementation (`node:crypto`); the source is read in chunk-sized slices only.
- **Authenticity vectors** — reordered chunks, a dropped final chunk, a corrupted chunk
  and a wrong vault key must throw and produce no plaintext.

Any change that breaks a vector is a format change and must bump the version.

## 7. Accepted limitations

- The client holds the vault key in memory only; reloading the page locks the vault again.
  The passphrase is never persisted anywhere.
- Files are decrypted in the browser into a Blob for download; streaming previews and
  partial decryption arrive with the preview milestone.
- Files whose plaintext is a multiple of the chunk size end with a short (possibly empty)
  `FINAL` chunk; the manifest's `totalChunks` accounts for it.
- The format does not hide file sizes or chunk counts from the server; hiding them is out
  of scope for this milestone and is documented here rather than implied otherwise.
