import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  adoptAccount,
  clearOfflineData,
  mirrorLibrary,
  readLibrary,
  readOwner,
} from '@/features/offline/metadata-cache';
import { clearStores } from '@/features/offline/idb';

const snapshot = (names: string[]) => ({
  files: names.map((name, index) => ({
    id: `file-${index}`,
    name,
    sizeBytes: 1024,
    updatedAt: '2026-10-28T09:00:00.000Z',
    folderId: null as string | null,
  })),
  folders: [{ id: 'folder-0', name: 'Docs', parentFolderId: null as string | null }],
  tags: [{ id: 'tag-0', name: 'work' }],
});

beforeEach(async () => {
  await clearStores();
});

describe('offline metadata mirror (FR-15)', () => {
  it('reads back exactly what was mirrored for that account', async () => {
    await mirrorLibrary('user-a', snapshot(['notes.txt', 'photo.png']));

    const cached = await readLibrary('user-a');
    expect(cached?.files.map((file) => file.name)).toEqual(['notes.txt', 'photo.png']);
    expect(cached?.folders).toHaveLength(1);
    expect(cached?.tags.map((tag) => tag.name)).toEqual(['work']);
    expect(Date.parse(cached!.storedAt)).not.toBeNaN();
  });

  it('never returns another account’s mirror', async () => {
    await mirrorLibrary('user-a', snapshot(['a.txt']));
    await mirrorLibrary('user-b', snapshot(['b.txt']));

    expect((await readLibrary('user-a'))?.files[0]?.name).toBe('a.txt');
    expect((await readLibrary('user-b'))?.files[0]?.name).toBe('b.txt');
    expect(await readLibrary('user-c')).toBeNull();
  });

  it('drops the previous account’s records when a different account signs in', async () => {
    await adoptAccount('user-a', 'a@example.com');
    await mirrorLibrary('user-a', snapshot(['a.txt']));

    await adoptAccount('user-b', 'b@example.com');

    expect(await readLibrary('user-a')).toBeNull();
    expect(await readOwner()).toMatchObject({ userId: 'user-b', email: 'b@example.com' });
  });

  it('keeps the mirror when the same account is adopted again', async () => {
    await adoptAccount('user-a', 'a@example.com');
    await mirrorLibrary('user-a', snapshot(['a.txt']));

    await adoptAccount('user-a', 'a@example.com');

    expect((await readLibrary('user-a'))?.files).toHaveLength(1);
  });

  it('clears mirror and queue for every account on sign-out', async () => {
    await adoptAccount('user-a', 'a@example.com');
    await mirrorLibrary('user-a', snapshot(['a.txt']));
    await mirrorLibrary('user-b', snapshot(['b.txt']));

    await clearOfflineData();

    expect(await readLibrary('user-a')).toBeNull();
    expect(await readLibrary('user-b')).toBeNull();
    expect(await readOwner()).toBeNull();
  });
});