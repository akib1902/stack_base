/**
 * Minimal promise wrapper over IndexedDB for the offline stores (SRS C5/C8).
 *
 * Deliberately dependency-free and defensive: during SSR there is no
 * `indexedDB`, so every call resolves as a no-op instead of throwing. The
 * store names and DB version are shared verbatim with `public/offline.html`,
 * which renders the same records when a navigation fails offline.
 */

export const DB_NAME = 'stackbase-offline';
export const DB_VERSION = 1;

export type StoreName = 'owner' | 'library' | 'queue';

const STORES: StoreName[] = ['owner', 'library', 'queue'];

const browser = typeof indexedDB !== 'undefined';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('owner')) {
        db.createObjectStore('owner', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('library')) {
        db.createObjectStore('library', { keyPath: 'userId' });
      }
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  run: (objectStore: IDBObjectStore) => IDBRequest<T>,
): Promise<T | undefined> {
  if (!browser) return undefined;
  const db = await openDb();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const request = run(db.transaction(store, mode).objectStore(store));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function putRecord<T>(store: StoreName, value: T): Promise<void> {
  await withStore(store, 'readwrite', (objectStore) => objectStore.put(value));
}

export async function getRecord<T>(
  store: StoreName,
  key: IDBValidKey,
): Promise<T | undefined> {
  return (await withStore<T>(store, 'readonly', (objectStore) =>
    objectStore.get(key),
  )) as T | undefined;
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  return ((await withStore<T[]>(store, 'readonly', (objectStore) =>
    objectStore.getAll(),
  )) ?? []) as T[];
}

export async function deleteRecord(store: StoreName, key: IDBValidKey): Promise<void> {
  await withStore(store, 'readwrite', (objectStore) => objectStore.delete(key));
}

/** Wipes every offline record for every account on this device. */
export async function clearStores(stores: StoreName[] = STORES): Promise<void> {
  if (!browser) return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(stores, 'readwrite');
      for (const store of stores) transaction.objectStore(store).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function countRecords(store: StoreName): Promise<number> {
  return (await withStore<number>(store, 'readonly', (objectStore) =>
    objectStore.count(),
  )) ?? 0;
}
