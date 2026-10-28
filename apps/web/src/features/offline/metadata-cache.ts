import { clearStores, getAll, getRecord, putRecord } from './idb';

/**
 * Mirror of the authorized library metadata that was already served to this
 * browser, so an offline navigation can show what the account contains
 * (SRS C8: "cached metadata for authorized files").
 *
 * Account isolation: every record carries the owning `userId`, reads are
 * filtered by the signed-in account, adopting a different account drops the
 * previous account's records, and signing out clears the database entirely.
 * No keys, no ciphertext and no plaintext file content are ever written here —
 * only the metadata the server already returned.
 */

export interface OwnerRecord {
  id: 'current';
  userId: string;
  email: string | null;
  storedAt: string;
}

/**
 * The mirror stores a projection, not the API payload: the fields the offline
 * shell renders. Nothing else about a file is persisted.
 */
export interface CachedFile {
  id: string;
  name: string;
  sizeBytes: number;
  updatedAt: string;
  folderId: string | null;
}

export interface CachedFolder {
  id: string;
  name: string;
  parentFolderId: string | null;
}

export interface CachedTag {
  id: string;
  name: string;
}

export interface LibraryRecord {
  userId: string;
  storedAt: string;
  files: CachedFile[];
  folders: CachedFolder[];
  tags: CachedTag[];
}

export interface LibrarySnapshot {
  files: readonly CachedFile[];
  folders: readonly CachedFolder[];
  tags: readonly CachedTag[];
}

/**
 * Records which account this device is working for. A different account wipes
 * the previous one's mirror before it is written over.
 */
export async function adoptAccount(
  userId: string,
  email: string | null,
): Promise<void> {
  const current = await getRecord<OwnerRecord>('owner', 'current');
  if (current && current.userId !== userId) {
    await clearStores();
  }
  await putRecord<OwnerRecord>('owner', {
    id: 'current',
    userId,
    email,
    storedAt: new Date().toISOString(),
  });
}

export async function mirrorLibrary(
  userId: string,
  snapshot: LibrarySnapshot,
): Promise<void> {
  const record: LibraryRecord = {
    userId,
    storedAt: new Date().toISOString(),
    files: [...snapshot.files],
    folders: [...snapshot.folders],
    tags: [...snapshot.tags],
  };
  await putRecord<LibraryRecord>('library', record);
}

/** Returns this account's mirror only — another account's rows never match. */
export async function readLibrary(userId: string): Promise<LibraryRecord | null> {
  const record = await getRecord<LibraryRecord>('library', userId);
  return record && record.userId === userId ? record : null;
}

export async function readOwner(): Promise<OwnerRecord | null> {
  return (await getRecord<OwnerRecord>('owner', 'current')) ?? null;
}

/**
 * Sign-out hygiene (SRS C8): user-specific local state is removed. The
 * service worker's caches hold public shell assets only, so the IDB mirror and
 * queue are the complete set of account-scoped records.
 */
export async function clearOfflineData(): Promise<void> {
  await clearStores();
}

/** How many mirror rows exist on this device, for the settings surface. */
export async function readLibraryAccounts(): Promise<LibraryRecord[]> {
  const records = await getAll<LibraryRecord>('library');
  return records.filter((record) => record && typeof record.userId === 'string');
}
