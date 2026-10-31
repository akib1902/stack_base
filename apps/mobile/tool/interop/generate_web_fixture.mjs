/**
 * Produces the web→Flutter interop fixture for `stackbase/1`.
 *
 * The ciphertext is made by the same libsodium build the web app pins
 * (`libsodium-wrappers-sumo 0.8.4`) and committed under
 * `assets/vectors/interop-web-to-flutter.json`. The Flutter suite decrypts it
 * on the Dart VM or Android; any failure means the mobile format is not
 * byte-compatible.
 *
 * Run from `apps/mobile`:
 *   node tool/interop/generate_web_fixture.mjs
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../../web/package.json', import.meta.url));
const sodium = require('libsodium-wrappers-sumo');

await sodium.ready;

const chunkSize = 64 * 1024;
const plaintextSize = 70_000; // Two chunks: one full, one short FINAL.
const vaultKey = Buffer.from(
  '404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f',
  'hex',
);
const dataKey = Buffer.from(
  '202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f',
  'hex',
);
const plaintext = Buffer.alloc(plaintextSize);
for (let index = 0; index < plaintext.length; index += 1) {
  plaintext[index] = (index * 31 + 7) & 0xff;
}

const totalChunks = Math.max(1, Math.ceil(plaintextSize / chunkSize));
const { state, header } = sodium.crypto_secretstream_xchacha20poly1305_init_push(dataKey);
const parts = [Buffer.from(header)];
for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber += 1) {
  const start = chunkNumber * chunkSize;
  const end = Math.min(plaintextSize, start + chunkSize);
  const isLast = chunkNumber === totalChunks - 1;
  const ciphertext = sodium.crypto_secretstream_xchacha20poly1305_push(
    state,
    plaintext.subarray(start, end),
    null,
    isLast
      ? sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
      : sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE,
  );
  parts.push(Buffer.from(ciphertext));
}
const ciphertext = Buffer.concat(parts);

const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
const wrappedKey = sodium.crypto_secretbox_easy(dataKey, nonce, vaultKey);

const manifest = {
  format: 'stackbase-file',
  version: 1,
  cipher: 'xchacha20poly1305-secretstream',
  chunking: { plaintextChunkSize: chunkSize, totalChunks },
  plaintextSize,
  ciphertextSize: ciphertext.length,
  ciphertextHash: createHash('sha256').update(ciphertext).digest('hex'),
  plaintextFingerprint: createHash('sha256').update(plaintext).digest('hex'),
  streamHeader: Buffer.from(header).toString('base64'),
  wrappedKey: {
    algorithm: 'xsalsa20poly1305',
    nonce: Buffer.from(nonce).toString('base64'),
    ciphertext: Buffer.from(wrappedKey).toString('base64'),
  },
};

const fixture = {
  description:
    'Produced by libsodium-wrappers-sumo 0.8.4 through tool/interop/generate_web_fixture.mjs. Do not edit by hand.',
  vaultKeyHex: vaultKey.toString('hex'),
  dataKeyHex: dataKey.toString('hex'),
  chunkSize,
  plaintextBase64: plaintext.toString('base64'),
  plaintextSha256: createHash('sha256').update(plaintext).digest('hex'),
  ciphertextBase64: ciphertext.toString('base64'),
  ciphertextSha256: createHash('sha256').update(ciphertext).digest('hex'),
  manifest,
};

const output = new URL('../../assets/vectors/interop-web-to-flutter.json', import.meta.url);
writeFileSync(output, `${JSON.stringify(fixture, null, 2)}\n`);
console.log(
  JSON.stringify({
    output: output.pathname,
    plaintextSize,
    totalChunks,
    ciphertextSize: ciphertext.length,
    ciphertextHash: manifest.ciphertextHash,
  }),
);
