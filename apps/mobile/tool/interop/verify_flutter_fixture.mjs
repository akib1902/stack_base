/**
 * Verifies the Flutter→web half of `stackbase/1` interop.
 *
 * The fixture is written by `integration_test/interop_fixture_test.dart` on an
 * Android device. This script uses the web app's pinned
 * `libsodium-wrappers-sumo 0.8.4` build, unwraps the data key with the pinned
 * test vault key, decrypts every secretstream chunk and checks the final tag,
 * ciphertext SHA-256 and plaintext SHA-256.
 *
 * Usage:
 *   node tool/interop/verify_flutter_fixture.mjs <fixture.json>
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../../web/package.json', import.meta.url));
const sodium = require('libsodium-wrappers-sumo');

await sodium.ready;

const path = process.argv[2];
if (!path) {
  throw new Error('Pass the pulled Flutter fixture JSON as the first argument.');
}

const fixture = JSON.parse(readFileSync(path, 'utf8'));
const manifest = fixture.manifest;
const ciphertext = Buffer.from(fixture.ciphertextBase64, 'base64');
const ciphertextHash = createHash('sha256').update(ciphertext).digest('hex');
if (ciphertextHash !== manifest.ciphertextHash || ciphertextHash !== fixture.ciphertextSha256) {
  throw new Error('Flutter ciphertext does not match its declared SHA-256.');
}
if (ciphertext.length !== manifest.ciphertextSize) {
  throw new Error('Flutter ciphertext length does not match the manifest.');
}

const header = Buffer.from(manifest.streamHeader, 'base64');
if (header.length !== 24) throw new Error('Flutter stream header is not 24 bytes.');

const vaultKey = Buffer.from(fixture.vaultKeyHex, 'hex');
if (vaultKey.length !== 32) throw new Error('Fixture vault key is not 32 bytes.');

const dataKey = Buffer.from(
  sodium.crypto_secretbox_open_easy(
    Buffer.from(manifest.wrappedKey.ciphertext, 'base64'),
    Buffer.from(manifest.wrappedKey.nonce, 'base64'),
    vaultKey,
  ),
);
if (dataKey.length !== 32) throw new Error('Flutter data key did not unwrap to 32 bytes.');

const state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(header, dataKey);
const parts = [];
let offset = 24;
for (let number = 0; number < manifest.chunking.totalChunks; number += 1) {
  const isLast = number === manifest.chunking.totalChunks - 1;
  const plaintextBytes = isLast
    ? manifest.plaintextSize -
      (manifest.chunking.totalChunks - 1) * manifest.chunking.plaintextChunkSize
    : manifest.chunking.plaintextChunkSize;
  const length = plaintextBytes + 17;
  const opened = sodium.crypto_secretstream_xchacha20poly1305_pull(
    state,
    ciphertext.subarray(offset, offset + length),
    null,
  );
  if (opened === false) throw new Error(`Chunk ${number} failed authentication.`);
  const expectedTag = isLast
    ? sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
    : sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE;
  if (opened.tag !== expectedTag) {
    throw new Error(`Chunk ${number} has the wrong secretstream tag.`);
  }
  parts.push(Buffer.from(opened.message));
  offset += length;
}
if (offset !== ciphertext.length) throw new Error('Flutter ciphertext has trailing bytes.');

const plaintext = Buffer.concat(parts);
const plaintextHash = createHash('sha256').update(plaintext).digest('hex');
if (plaintext.length !== manifest.plaintextSize) {
  throw new Error('Decrypted Flutter plaintext has the wrong size.');
}
if (plaintextHash !== manifest.plaintextFingerprint || plaintextHash !== fixture.plaintextSha256) {
  throw new Error('Decrypted Flutter plaintext does not match its fingerprint.');
}

console.log(
  JSON.stringify(
    {
      ok: true,
      direction: 'flutter-to-web',
      chunks: manifest.chunking.totalChunks,
      plaintextSize: plaintext.length,
      ciphertextSize: ciphertext.length,
      plaintextSha256: plaintextHash,
    },
    null,
    2,
  ),
);
