import type { StorageProvider as StorageProviderName } from '@stackbase/contracts';

/**
 * Provider-independent storage contract (SRS A4.2). Implementations receive and
 * return ciphertext only; nothing here can decrypt content.
 */

export interface ProviderReference {
  [key: string]: unknown;
}

export interface ConnectionStatus {
  ok: boolean;
  accountIdentifier: string | null;
}

export interface EncryptedUploadInput {
  /**
   * Provider-visible object name, `<storageObjectId>.bin`. The user's file name
   * is never sent to the provider.
   */
  objectName: string;
  sizeBytes: number;
  /** Ciphertext source on disk; streamed, never buffered whole. */
  sourcePath: string;
}

export interface StoredObjectReference {
  provider: StorageProviderName;
  /** Documented provider reference stored in `storage_objects.provider_reference`. */
  reference: ProviderReference;
  /** Telegram rows also populate the legacy provider-specific columns. */
  telegram?: {
    chatReference: string;
    messageReference: string;
    mediaReference: ProviderReference | null;
  };
  remoteSizeBytes: number | null;
}

export interface DeleteResult {
  deleted: boolean;
}

export interface StorageObjectStatus {
  status: 'available' | 'missing';
  remoteSizeBytes: number | null;
}

export interface StorageProvider {
  readonly provider: StorageProviderName;
  checkConnection(): Promise<ConnectionStatus>;
  upload(input: EncryptedUploadInput): Promise<StoredObjectReference>;
  download(reference: ProviderReference): AsyncIterable<Uint8Array>;
  delete(reference: ProviderReference): Promise<DeleteResult>;
  inspect(reference: ProviderReference): Promise<StorageObjectStatus>;
}

const UUID =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/** `<userId>/<storageObjectId>.bin` — the only key shape the local provider accepts. */
export const LOCAL_OBJECT_KEY_PATTERN = new RegExp(`^${UUID}/${UUID}\\.bin$`, 'i');

export const isLocalObjectKey = (value: unknown): value is string =>
  typeof value === 'string' && LOCAL_OBJECT_KEY_PATTERN.test(value);
