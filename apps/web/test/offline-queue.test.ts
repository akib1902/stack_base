import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearStores } from '@/features/offline/idb';
import {
  discardOperation,
  enqueueOperation,
  listOperations,
  replayQueue,
  type QueuedOperation,
} from '@/features/offline/queue';

const base = {
  userId: 'user-a',
  kind: 'update-file',
  label: 'Update “notes.txt”',
  resourceId: 'file-1',
  baseVersion: '2026-10-28T09:00:00.000Z',
  payload: { patch: { name: 'notes.txt' }, tagIds: [] },
};

const online = { isOnline: () => true };
const offline = { isOnline: () => false };

beforeEach(async () => {
  await clearStores();
});

describe('offline operation queue (FR-15)', () => {
  it('replays a change against an unchanged file and removes it', async () => {
    const operation = await enqueueOperation(base);
    const applied: QueuedOperation[] = [];

    const summary = await replayQueue('user-a', {
      ...online,
      readVersion: async () => base.baseVersion,
      apply: async (queued) => {
        applied.push(queued);
      },
    });

    expect(summary).toMatchObject({ applied: 1, conflicts: 0, failed: 0, waiting: 0 });
    expect(applied).toHaveLength(1);
    expect(applied[0]?.id).toBe(operation.id);
    expect(await listOperations('user-a')).toHaveLength(0);
  });

  it('surfaces a conflict instead of overwriting a newer edit', async () => {
    await enqueueOperation(base);
    let applyCalls = 0;

    const summary = await replayQueue('user-a', {
      ...online,
      readVersion: async () => '2026-10-28T11:30:00.000Z',
      apply: async () => {
        applyCalls += 1;
      },
    });

    expect(summary.conflicts).toBe(1);
    expect(applyCalls).toBe(0);

    const [queued] = await listOperations('user-a');
    expect(queued?.status).toBe('conflict');
    expect(queued?.error).toMatch(/changed somewhere else/);
  });

  it('holds the change while offline without attempting it', async () => {
    await enqueueOperation(base);
    let applyCalls = 0;

    const summary = await replayQueue('user-a', {
      ...offline,
      readVersion: async () => base.baseVersion,
      apply: async () => {
        applyCalls += 1;
      },
    });

    expect(summary).toMatchObject({ applied: 0, waiting: 1 });
    expect(applyCalls).toBe(0);
    expect((await listOperations('user-a'))[0]?.status).toBe('pending');
  });

  it('keeps the change when the server refuses it', async () => {
    await enqueueOperation(base);

    const summary = await replayQueue('user-a', {
      ...online,
      readVersion: async () => base.baseVersion,
      apply: async () => {
        throw new Error('The name is already taken.');
      },
    });

    expect(summary.failed).toBe(1);
    const [queued] = await listOperations('user-a');
    expect(queued?.status).toBe('failed');
    expect(queued?.error).toBe('The name is already taken.');
    expect(queued?.attempts).toBe(1);
  });

  it('keeps the change when the version check itself fails', async () => {
    await enqueueOperation(base);

    const summary = await replayQueue('user-a', {
      ...online,
      readVersion: async () => {
        throw new Error('The API is unreachable.');
      },
      apply: async () => {
        throw new Error('must not run');
      },
    });

    expect(summary.failed).toBe(1);
    expect(await listOperations('user-a')).toHaveLength(1);
  });

  it('drops the change only when the resource is really gone', async () => {
    await enqueueOperation(base);

    const summary = await replayQueue('user-a', {
      ...online,
      readVersion: async () => null,
      apply: async () => {
        throw new Error('must not run');
      },
    });

    expect(summary.applied).toBe(1);
    expect(await listOperations('user-a')).toHaveLength(0);
  });

  it('leaves a conflicted change for a human instead of retrying it', async () => {
    await enqueueOperation(base);
    await replayQueue('user-a', {
      ...online,
      readVersion: async () => '2026-10-28T11:30:00.000Z',
      apply: async () => {},
    });

    const second = await replayQueue('user-a', {
      ...online,
      readVersion: async () => base.baseVersion,
      apply: async () => {
        throw new Error('must not run');
      },
    });

    expect(second.conflicts).toBe(1);
    expect((await listOperations('user-a'))[0]?.status).toBe('conflict');
  });

  it('replays only the signed-in account’s operations', async () => {
    await enqueueOperation(base);
    await enqueueOperation({ ...base, userId: 'user-b', label: 'Other account' });

    const summary = await replayQueue('user-a', {
      ...online,
      readVersion: async () => base.baseVersion,
      apply: async () => {},
    });

    expect(summary.applied).toBe(1);
    const remaining = await listOperations('user-b');
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.label).toBe('Other account');
  });

  it('discards an operation on request', async () => {
    const operation = await enqueueOperation(base);
    await discardOperation(operation.id);
    expect(await listOperations('user-a')).toHaveLength(0);
  });
});