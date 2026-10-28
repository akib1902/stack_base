import { deleteRecord, getAll, putRecord } from './idb';

/**
 * The offline operation queue (SRS FR-15 / C8).
 *
 * Metadata changes made while this browser is offline are written here and
 * replayed when connectivity returns. Replay is deliberately cautious:
 *
 *   1. the server's current version of the resource is read first;
 *   2. if it moved past the version the change was based on, the operation is
 *      marked `conflict` and *not* applied — visibility instead of guessing;
 *   3. only a change against an unchanged resource is applied, and a success
 *      removes it from the queue.
 *
 * `readVersion` and `apply` are injected so the whole policy is unit-testable
 * without a server; the production wiring passes the app's server actions.
 */

export type OperationStatus = 'pending' | 'syncing' | 'conflict' | 'failed';

export interface QueuedOperation {
  id: string;
  userId: string;
  kind: string;
  label: string;
  resourceId: string;
  /** Version of the resource the change was based on; null when unknown. */
  baseVersion: string | null;
  payload: unknown;
  status: OperationStatus;
  error: string | null;
  attempts: number;
  createdAt: string;
}

export interface QueueInput {
  userId: string;
  kind: string;
  label: string;
  resourceId: string;
  baseVersion?: string | null;
  payload: unknown;
}

export interface ReplaySummary {
  applied: number;
  conflicts: number;
  failed: number;
  waiting: number;
}

export interface ReplayDeps {
  /** Current version marker of a resource (its `updatedAt`, or null if gone). */
  readVersion: (resourceId: string) => Promise<string | null>;
  /** Performs the change; rejects if the server refused or is unreachable. */
  apply: (operation: QueuedOperation) => Promise<void>;
  isOnline?: () => boolean;
}

const RETRYABLE: OperationStatus[] = ['pending', 'syncing', 'failed'];

const defaultOnline = (): boolean =>
  typeof navigator === 'undefined' || navigator.onLine !== false;

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueueOperation(
  input: QueueInput,
): Promise<QueuedOperation> {
  const operation: QueuedOperation = {
    id: newId(),
    userId: input.userId,
    kind: input.kind,
    label: input.label,
    resourceId: input.resourceId,
    baseVersion: input.baseVersion ?? null,
    payload: input.payload,
    status: 'pending',
    error: null,
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  await putRecord('queue', operation);
  return operation;
}

export async function listOperations(userId: string): Promise<QueuedOperation[]> {
  const records = await getAll<QueuedOperation>('queue');
  return records
    .filter((record) => record && record.userId === userId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function discardOperation(id: string): Promise<void> {
  await deleteRecord('queue', id);
}

/**
 * Replays every retryable operation for `userId` in creation order.
 * Conflicted operations are left in place for the user to review.
 */
export async function replayQueue(
  userId: string,
  deps: ReplayDeps,
): Promise<ReplaySummary> {
  const isOnline = deps.isOnline ?? defaultOnline;
  const summary: ReplaySummary = { applied: 0, conflicts: 0, failed: 0, waiting: 0 };
  const operations = await listOperations(userId);

  for (const operation of operations) {
    if (!RETRYABLE.includes(operation.status)) {
      // Only `conflict` is terminal-by-design; it waits for a human decision.
      summary.conflicts += 1;
      continue;
    }
    if (!isOnline()) {
      summary.waiting += 1;
      continue;
    }

    const attempts = operation.attempts + 1;
    const syncing: QueuedOperation = { ...operation, status: 'syncing', attempts };
    await putRecord('queue', syncing);

    try {
      const currentVersion = await deps.readVersion(operation.resourceId);
      const diverged =
        operation.baseVersion !== null &&
        currentVersion !== null &&
        currentVersion !== operation.baseVersion;

      if (diverged) {
        await putRecord('queue', {
          ...syncing,
          status: 'conflict',
          error: 'This file changed somewhere else after you edited it offline.',
        });
        summary.conflicts += 1;
        continue;
      }

      // The resource is unchanged (or we cannot prove a base version): apply.
      if (currentVersion === null) {
        // The resource disappeared while queued; nothing left to apply to.
        await deleteRecord('queue', operation.id);
        summary.applied += 1;
        continue;
      }

      await deps.apply(operation);
      await deleteRecord('queue', operation.id);
      summary.applied += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'The change could not be applied.';
      if (!isOnline()) {
        await putRecord('queue', { ...syncing, status: 'pending', error: null });
        summary.waiting += 1;
        continue;
      }
      await putRecord('queue', { ...syncing, status: 'failed', error: message });
      summary.failed += 1;
    }
  }

  return summary;
}
