import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  isLocalObjectKey,
  type ProviderReference,
  type StorageProvider,
} from './types';

/**
 * Filesystem provider for local development and tests only (ADR-015).
 * `STORAGE_PROVIDER=local` is rejected in production, so this implementation is
 * never the storage backend of a deployed instance. It stores ciphertext under
 * the configured root; it cannot read any content.
 */

const DOWNLOAD_CHUNK_BYTES = 512 * 1024;

export function createLocalStorageProvider(options: { rootDir: string }): StorageProvider {
  const root = path.resolve(options.rootDir);

  const resolveKey = (reference: ProviderReference): string => {
    const key = reference.key;
    if (!isLocalObjectKey(key)) {
      throw new Error('local storage reference is not a valid object key');
    }
    const full = path.resolve(root, key);
    if (!full.startsWith(root + path.sep)) {
      throw new Error('local storage reference escapes the storage root');
    }
    return full;
  };

  return {
    provider: 'local',

    async checkConnection() {
      await mkdir(root, { recursive: true });
      return { ok: true, accountIdentifier: 'Local development storage' };
    },

    async upload(input) {
      const target = resolveKey({ key: input.objectName });
      await mkdir(path.dirname(target), { recursive: true });
      const temp = `${target}.tmp`;
      try {
        const source = createReadStream(input.sourcePath);
        await pipeline(source, createWriteStream(temp));
        const size = (await stat(temp)).size;
        if (size !== input.sizeBytes) {
          throw new Error(
            `local storage received ${size} bytes but ${input.sizeBytes} were expected`,
          );
        }
        await rename(temp, target);
        return {
          provider: 'local' as const,
          reference: { key: input.objectName, size },
          remoteSizeBytes: size,
        };
      } catch (error) {
        await rm(temp, { force: true }).catch(() => undefined);
        throw error;
      }
    },

    download: async function* download(reference) {
      const stream = createReadStream(resolveKey(reference), {
        highWaterMark: DOWNLOAD_CHUNK_BYTES,
      });
      for await (const chunk of stream) {
        yield chunk as Uint8Array;
      }
    },

    async delete(reference) {
      await rm(resolveKey(reference), { force: true });
      return { deleted: true };
    },

    async inspect(reference) {
      try {
        const info = await stat(resolveKey(reference));
        return { status: 'available' as const, remoteSizeBytes: info.size };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return { status: 'missing' as const, remoteSizeBytes: null };
        }
        throw error;
      }
    },
  };
}

/** Convenience for tests: stream a body into a local object without a file on disk. */
export async function writeStagedBytes(
  target: string,
  body: AsyncIterable<Uint8Array>,
): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  await pipeline(Readable.from(body), createWriteStream(target));
}
