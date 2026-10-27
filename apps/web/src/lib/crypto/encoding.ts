/**
 * Byte helpers shared by the crypto modules. Pure JavaScript on purpose: no
 * `Buffer`, no DOM-only globals, so the same code runs in the browser, in
 * jsdom tests and in a plain Node script.
 */

const HEX_DIGITS = '0123456789abcdef';

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const BASE64_LOOKUP: Record<string, number> = Object.fromEntries(
  [...BASE64_ALPHABET].map((character, index) => [character, index]),
);

export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) {
    out += HEX_DIGITS[byte >> 4]! + HEX_DIGITS[byte & 0x0f]!;
  }
  return out;
}

export function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error('Not a hex string.');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

/** Canonical padded base64 — the exact alphabet the API schemas accept. */
export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]!;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    out += BASE64_ALPHABET[first >> 2]!;
    out += BASE64_ALPHABET[((first & 0x03) << 4) | ((second ?? 0) >> 4)]!;
    out += second === undefined ? '=' : BASE64_ALPHABET[((second & 0x0f) << 2) | ((third ?? 0) >> 6)]!;
    out += third === undefined ? '=' : BASE64_ALPHABET[third & 0x3f]!;
  }
  return out;
}

export function fromBase64(value: string): Uint8Array {
  const trimmed = value.endsWith('==') ? value.slice(0, -2) : value.endsWith('=') ? value.slice(0, -1) : value;
  if (!/^[A-Za-z0-9+/]*$/.test(trimmed)) {
    throw new Error('Not a base64 string.');
  }
  const bytes = new Uint8Array(Math.floor((trimmed.length * 3) / 4));
  let byteIndex = 0;
  let buffer = 0;
  let bits = 0;
  for (const character of trimmed) {
    const value_ = BASE64_LOOKUP[character];
    if (value_ === undefined) throw new Error('Not a base64 string.');
    buffer = (buffer << 6) | value_;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[byteIndex] = (buffer >> bits) & 0xff;
      byteIndex += 1;
    }
  }
  return bytes;
}

export function utf8ToBytes(value: string): Uint8Array {
  // Copied into a fresh array so the result belongs to the caller's realm:
  // libsodium's wrappers compare with the ambient `Uint8Array`, and jsdom tests
  // run against a TextEncoder from a different realm.
  return new Uint8Array(new TextEncoder().encode(value));
}

export function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Constant-time-ish comparison is not needed here; these are never secrets. */
export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}
