import { mkdtempSync, rmSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createLocalStorageProvider } from '../src/storage/local';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OBJECT_ID = '22222222-2222-4222-8222-222222222222';
const KEY = `${USER_ID}/${OBJECT_ID}.bin`;

let root: string;

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), 'stackbase-local-'));
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

async function collect(iterable: AsyncIterable<Uint8Array>): Promise<Buffer> {
  const parts: Buffer[] = [];
  for await (const part of iterable) {
    parts.push(Buffer.from(part));
  }
  return Buffer.concat(parts);
}

async function writeSource(name: string, bytes: Buffer): Promise<string> {
  const source = path.join(root, sourceName(name));
  await writeFile(source, bytes);
  return source;
}

let counter = 0;
const sourceName = (name: string): string => `${counter++}-${name}`;

describe('local storage provider', () => {
  it('uploads, inspects, downloads and deletes ciphertext', async () => {
    const provider = createLocalStorageProvider({ rootDir: path.join(root, 'objects') });
    const bytes = Buffer.from('ciphertext-\u0000-\u00ff-\u4e2d\u6587-bytes');
    const source = await writeSource('payload.bin', bytes);

    const stored = await provider.upload({
      objectName: KEY,
      sizeBytes: bytes.length,
      sourcePath: source,
    });
    expect(stored.provider).toBe('local');
    expect(stored.reference).toEqual({ key: KEY, size: bytes.length });
    expect(stored.remoteSizeBytes).toBe(bytes.length);

    const inspection = await provider.inspect(stored.reference);
    expect(inspection).toEqual({ status: 'available', remoteSizeBytes: bytes.length });

    const downloaded = await collect(provider.download(stored.reference));
    expect(downloaded.equals(bytes)).toBe(true);

    await provider.delete(stored.reference);
    expect(await provider.inspect(stored.reference)).toEqual({
      status: 'missing',
      remoteSizeBytes: null,
    });
  });

  it('refuses an upload whose byte count does not match the declared size', async () => {
    const provider = createLocalStorageProvider({ rootDir: path.join(root, 'objects') });
    const source = await writeSource('short.bin', Buffer.from('short'));

    await expect(
      provider.upload({ objectName: KEY, sizeBytes: 999, sourcePath: source }),
    ).rejects.toThrow(/received 5 bytes/);

    // The failed upload left nothing behind that a later inspect could see.
    expect(await provider.inspect({ key: KEY })).toEqual({
      status: 'missing',
      remoteSizeBytes: null,
    });
  });

  it('rejects references that are not object keys, so paths cannot escape the root', async () => {
    const provider = createLocalStorageProvider({ rootDir: path.join(root, 'objects') });

    await expect(collect(provider.download({ key: '../../etc/passwd' }))).rejects.toThrow(
      /not a valid object key/,
    );
    await expect(collect(provider.download({ key: 'plain-file.bin' }))).rejects.toThrow(
      /not a valid object key/,
    );
    await expect(provider.delete({ key: `${USER_ID}/../escape.bin` })).rejects.toThrow(
      /not a valid object key/,
    );
  });

  it('reports a usable connection', async () => {
    const provider = createLocalStorageProvider({ rootDir: path.join(root, 'objects') });
    await expect(provider.checkConnection()).resolves.toEqual({
      ok: true,
      accountIdentifier: 'Local development storage',
    });
  });
});
