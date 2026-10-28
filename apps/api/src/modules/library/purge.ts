import type {
  PurgeTrashResponse,
  StorageProvider as StorageProviderName,
} from '@stackbase/contracts';
import type { Config } from '../../config/env';
import type { Db, Queryable } from '../../database/db';
import { toCount } from '../../database/values';
import { ApiError } from '../../errors';
import { mapProviderErrorToApiError, openStorageProvider } from '../../storage/registry';
import type { ProviderReference } from '../../storage/types';
import { recordAuditEvent } from '../audit/repository';

/**
 * Permanent deletion and retention (SRS B5). Soft deletion only touches
 * metadata; permanent deletion is the separately tracked operation that removes
 * provider ciphertext. Order matters:
 *
 *   1. find every storage object the file's versions reference;
 *   2. delete those objects on the provider first — a failure leaves every row
 *      intact, so the operation is visible and retryable;
 *   3. then, in one transaction, remove the shares that pin those versions
 *      (the foreign key deliberately restricts deleting referenced versions),
 *      remove the file (cascading versions) and finally the now-unreferenced
 *      storage objects.
 *
 * No remote object is deleted while a retained version still references it.
 */

export interface PurgeDeps {
  db: Db;
  config: Config;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseId(value: string, field: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new ApiError('VALIDATION_ERROR', 400, `${field} must be a UUID.`);
  }
  return value;
}

interface PurgeObject {
  objectId: string;
  provider: StorageProviderName;
  reference: ProviderReference;
}

async function loadPurgeObjects(
  db: Db | Queryable,
  userId: string,
  fileIds: string[],
): Promise<PurgeObject[]> {
  if (fileIds.length === 0) return [];
  const { rows } = await db.query<{
    objectId: string;
    provider: StorageProviderName;
    reference: unknown;
  }>(
    `select distinct o.id as "objectId", o.provider,
            o.provider_reference as reference
       from public.file_versions v
       join public.storage_objects o on o.user_id = v.user_id and o.id = v.storage_object_id
      where v.user_id = $1 and v.file_id = any($2::uuid[])`,
    [userId, fileIds],
  );

  return rows.map((row) => {
    if (typeof row.reference !== 'object' || row.reference === null) {
      throw new ApiError(
        'STORAGE_RECONCILIATION_REQUIRED',
        409,
        'A stored object reference is invalid, so it cannot be removed safely.',
      );
    }
    return {
      objectId: row.objectId,
      provider: row.provider,
      reference: row.reference as ProviderReference,
    };
  });
}

async function deleteRemoteObjects(
  deps: PurgeDeps,
  userId: string,
  objects: PurgeObject[],
): Promise<void> {
  const byProvider = new Map<StorageProviderName, PurgeObject[]>();
  for (const object of objects) {
    const list = byProvider.get(object.provider);
    if (list) list.push(object);
    else byProvider.set(object.provider, [object]);
  }

  for (const [provider, list] of byProvider) {
    let handle;
    try {
      handle = await openStorageProvider(deps, userId, provider);
    } catch (error) {
      throw mapProviderErrorToApiError(error);
    }
    try {
      for (const object of list) {
        // A missing copy is already gone; only call delete when it exists, so
        // an earlier partial purge can be retried.
        const status = await handle.provider.inspect(object.reference);
        if (status.status === 'available') {
          await handle.provider.delete(object.reference);
        }
      }
    } catch (error) {
      throw mapProviderErrorToApiError(error);
    } finally {
      await handle.close();
    }
  }
}

async function deleteStorageObjectRows(
  tx: Queryable,
  userId: string,
  objectIds: string[],
): Promise<void> {
  if (objectIds.length === 0) return;
  await tx.query(
    `delete from public.storage_objects o
      where o.user_id = $1 and o.id = any($2::uuid[])
        and not exists (
          select 1 from public.file_versions v
          where v.user_id = o.user_id and v.storage_object_id = o.id
        )`,
    [userId, objectIds],
  );
}

async function deleteSharesForFiles(
  tx: Queryable,
  userId: string,
  fileIds: string[],
): Promise<void> {
  if (fileIds.length === 0) return;
  await tx.query(
    `delete from public.shares
      where user_id = $1
        and file_version_id in (
          select id from public.file_versions
           where user_id = $1 and file_id = any($2::uuid[])
        )`,
    [userId, fileIds],
  );
}

/** Permanently delete one trashed file, its versions, shares and ciphertext. */
export async function purgeTrashedFile(
  deps: PurgeDeps,
  userId: string,
  fileId: string,
): Promise<number> {
  const id = parseId(fileId, 'fileId');

  const file = await deps.db.query<{ id: string }>(
    'select id from public.files where user_id = $1 and id = $2 and deleted_at is not null',
    [userId, id],
  );
  if (!file.rows[0]) {
    throw new ApiError('FILE_NOT_FOUND', 404, 'That file is not in the trash.');
  }

  const objects = await loadPurgeObjects(deps.db, userId, [id]);
  await deleteRemoteObjects(deps, userId, objects);

  await deps.db.transaction(async (tx) => {
    const stillTrashed = await tx.query<{ id: string }>(
      `select id from public.files
        where user_id = $1 and id = $2 and deleted_at is not null
        for update`,
      [userId, id],
    );
    if (!stillTrashed.rows[0]) return; // Another purge won; deletion is idempotent.

    await deleteSharesForFiles(tx, userId, [id]);

    const removed = await tx.query(
      'delete from public.files where user_id = $1 and id = $2 and deleted_at is not null',
      [userId, id],
    );
    if (removed.rowCount === 0) return;

    await deleteStorageObjectRows(
      tx,
      userId,
      objects.map((object) => object.objectId),
    );

    await recordAuditEvent(tx, userId, {
      eventType: 'file.purge',
      resourceType: 'file',
      resourceId: id,
      metadata: { storageObjects: objects.length },
    });
  });

  return 1;
}

/** Permanently delete a trashed folder subtree and everything it holds. */
export async function purgeTrashedFolder(
  deps: PurgeDeps,
  userId: string,
  folderId: string,
): Promise<number> {
  const id = parseId(folderId, 'folderId');

  const subtree = await deps.db.query<{ id: string; depth: unknown }>(
    `with recursive subtree as (
       select id, 0 as depth from public.folders
        where user_id = $1 and id = $2 and deleted_at is not null
       union all
       select child.id, parent.depth + 1
         from public.folders child
         join subtree parent on child.parent_folder_id = parent.id
        where child.user_id = $1
     )
     select id, depth from subtree order by depth desc`,
    [userId, id],
  );
  if (subtree.rows.length === 0) {
    throw new ApiError('FILE_NOT_FOUND', 404, 'That folder is not in the trash.');
  }

  const folderIds = subtree.rows.map((row) => row.id);
  const files = await deps.db.query<{ id: string }>(
    'select id from public.files where user_id = $1 and folder_id = any($2::uuid[])',
    [userId, folderIds],
  );
  const fileIds = files.rows.map((row) => row.id);

  const objects = await loadPurgeObjects(deps.db, userId, fileIds);
  await deleteRemoteObjects(deps, userId, objects);

  await deps.db.transaction(async (tx) => {
    const stillTrashed = await tx.query<{ id: string }>(
      `select id from public.folders
        where user_id = $1 and id = $2 and deleted_at is not null
        for update`,
      [userId, id],
    );
    if (!stillTrashed.rows[0]) return;

    await deleteSharesForFiles(tx, userId, fileIds);

    if (fileIds.length > 0) {
      await tx.query(
        'delete from public.files where user_id = $1 and id = any($2::uuid[])',
        [userId, fileIds],
      );
    }

    for (const folder of subtree.rows) {
      await tx.query('delete from public.folders where user_id = $1 and id = $2', [
        userId,
        folder.id,
      ]);
    }

    await deleteStorageObjectRows(
      tx,
      userId,
      objects.map((object) => object.objectId),
    );

    await recordAuditEvent(tx, userId, {
      eventType: 'folder.purge',
      resourceType: 'folder',
      resourceId: id,
      metadata: { folders: folderIds.length, files: fileIds.length, storageObjects: objects.length },
    });
  });

  return folderIds.length;
}

async function readRetentionDays(db: Db, userId: string): Promise<number> {
  const { rows } = await db.query<{ retentionDays: unknown }>(
    'select trash_retention_days as "retentionDays" from public.user_settings where user_id = $1',
    [userId],
  );
  return rows.length === 0
    ? 30
    : Math.min(Math.max(toCount(rows[0]?.retentionDays), 0), 3650);
}

/**
 * Enforce retention for one owner. Zero means "keep until removed". Purging a
 * folder removes its whole subtree, so only top-level expired entries are
 * selected. A provider failure leaves that item intact and is counted as
 * skipped, keeping the operation retryable without hiding the rest.
 */
export async function purgeExpiredTrash(
  deps: PurgeDeps,
  userId: string,
): Promise<PurgeTrashResponse> {
  const retentionDays = await readRetentionDays(deps.db, userId);
  if (retentionDays === 0) return { purged: 0, skipped: 0 };

  const expiredFolders = await deps.db.query<{ id: string }>(
    `select d.id
       from public.folders d
      where d.user_id = $1
        and d.deleted_at is not null
        and d.deleted_at < now() - ($2 * interval '1 day')
        and (
          d.parent_folder_id is null or exists (
            select 1 from public.folders p
            where p.user_id = d.user_id and p.id = d.parent_folder_id
              and p.deleted_at is null
          )
        )`,
    [userId, retentionDays],
  );

  const expiredFiles = await deps.db.query<{ id: string }>(
    `select f.id
       from public.files f
      where f.user_id = $1
        and f.deleted_at is not null
        and f.deleted_at < now() - ($2 * interval '1 day')
        and (
          f.folder_id is null or exists (
            select 1 from public.folders p
            where p.user_id = f.user_id and p.id = f.folder_id
              and p.deleted_at is null
          )
        )`,
    [userId, retentionDays],
  );

  let purged = 0;
  let skipped = 0;

  for (const folder of expiredFolders.rows) {
    try {
      await purgeTrashedFolder(deps, userId, folder.id);
      purged += 1;
    } catch {
      skipped += 1;
    }
  }

  for (const file of expiredFiles.rows) {
    try {
      await purgeTrashedFile(deps, userId, file.id);
      purged += 1;
    } catch {
      skipped += 1;
    }
  }

  if (purged > 0) {
    await recordAuditEvent(deps.db, userId, {
      eventType: 'trash.purge',
      resourceType: 'trash',
      metadata: { purged, skipped, retentionDays },
    });
  }

  return { purged, skipped };
}
