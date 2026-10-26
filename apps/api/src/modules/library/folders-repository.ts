import {
  type CreateFolderRequest,
  type FolderSummary,
  type UpdateFolderRequest,
} from '@stackbase/contracts';
import type { Db, Queryable } from '../../database/db';
import { toCount, toIsoString } from '../../database/values';
import { ApiError } from '../../errors';
import { normalizeName, parseOptionalFolderId, parseUuid } from './names';

interface FolderRow {
  id: string;
  name: string;
  parentFolderId: string | null;
  fileCount: unknown;
  folderCount: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}

const SELECT_FOLDERS = `
  select
    fo.id,
    fo.name,
    fo.parent_folder_id as "parentFolderId",
    (
      select count(*)::int from public.files f
      where f.user_id = fo.user_id and f.folder_id = fo.id and f.deleted_at is null
    ) as "fileCount",
    (
      select count(*)::int from public.folders c
      where c.user_id = fo.user_id and c.parent_folder_id = fo.id and c.deleted_at is null
    ) as "folderCount",
    fo.created_at as "createdAt",
    fo.updated_at as "updatedAt"
  from public.folders fo
`;

const folderNotFound = (): ApiError =>
  new ApiError('FILE_NOT_FOUND', 404, 'That folder does not exist.');

function toFolderSummary(row: FolderRow): FolderSummary {
  return {
    id: row.id,
    name: row.name,
    parentFolderId: row.parentFolderId,
    fileCount: toCount(row.fileCount),
    folderCount: toCount(row.folderCount),
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

async function loadFolder(db: Queryable, userId: string, folderId: string): Promise<FolderSummary> {
  const { rows } = await db.query<FolderRow>(
    `${SELECT_FOLDERS} where fo.user_id = $1 and fo.id = $2 and fo.deleted_at is null`,
    [userId, folderId],
  );
  const row = rows[0];
  if (!row) {
    throw folderNotFound();
  }
  return toFolderSummary(row);
}

async function assertActiveFolder(
  db: Queryable,
  userId: string,
  folderId: string,
): Promise<void> {
  const { rows } = await db.query(
    'select 1 as present from public.folders where user_id = $1 and id = $2 and deleted_at is null',
    [userId, folderId],
  );
  if (rows.length === 0) {
    throw folderNotFound();
  }
}

/** Every active folder, flat, ordered for a stable tree render. */
export async function listFolders(db: Db, userId: string): Promise<FolderSummary[]> {
  const { rows } = await db.query<FolderRow>(
    `${SELECT_FOLDERS} where fo.user_id = $1 and fo.deleted_at is null order by lower(fo.name), fo.id`,
    [userId],
  );
  return rows.map(toFolderSummary);
}

export async function searchFolders(
  db: Db,
  userId: string,
  q: string,
  limit = 8,
): Promise<FolderSummary[]> {
  const needle = q.trim();
  if (!needle) {
    return [];
  }
  const { rows } = await db.query<FolderRow>(
    `${SELECT_FOLDERS}
      where fo.user_id = $1 and fo.deleted_at is null
        and strpos(lower(fo.name), lower($2)) > 0
      order by lower(fo.name), fo.id
      limit $3`,
    [userId, needle, Math.min(Math.max(limit, 1), 20)],
  );
  return rows.map(toFolderSummary);
}

export async function createFolder(
  db: Db,
  userId: string,
  input: CreateFolderRequest,
): Promise<FolderSummary> {
  const name = normalizeName(input.name);
  const parentFolderId = parseOptionalFolderId(input.parentFolderId, 'parentFolderId');

  if (parentFolderId) {
    await assertActiveFolder(db, userId, parentFolderId);
  }

  const { rows } = await db.query<{ id: string }>(
    `insert into public.folders (user_id, parent_folder_id, name)
      values ($1, $2, $3)
      returning id`,
    [userId, parentFolderId, name],
  );
  const id = rows[0]?.id;
  if (!id) {
    throw new Error('Folder insert returned no id.');
  }
  return loadFolder(db, userId, id);
}

export async function updateFolder(
  db: Db,
  userId: string,
  folderId: string,
  input: UpdateFolderRequest,
): Promise<FolderSummary> {
  const id = parseUuid(folderId, 'folderId');
  await assertActiveFolder(db, userId, id);

  const params: unknown[] = [userId, id];
  const add = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };
  const sets: string[] = [];

  if (input.name !== undefined) {
    sets.push(`name = ${add(normalizeName(input.name))}`);
  }

  if (input.parentFolderId !== undefined) {
    const parentId = parseOptionalFolderId(input.parentFolderId, 'parentFolderId');
    if (parentId === null) {
      sets.push('parent_folder_id = null');
    } else {
      if (parentId === id) {
        throw new ApiError('VALIDATION_ERROR', 400, 'A folder cannot contain itself.');
      }
      await assertActiveFolder(db, userId, parentId);
      sets.push(`parent_folder_id = ${add(parentId)}`);
    }
  }

  if (sets.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 400, 'No supported fields were provided.');
  }

  try {
    await db.query(
      `update public.folders set ${sets.join(', ')}
        where user_id = $1 and id = $2 and deleted_at is null`,
      params,
    );
  } catch (error) {
    if ((error as { code?: string }).code === '23514') {
      throw new ApiError(
        'VALIDATION_ERROR',
        400,
        'A folder cannot be moved inside itself or one of its descendants.',
      );
    }
    throw error;
  }

  return loadFolder(db, userId, id);
}

/**
 * Soft-delete a folder, its descendant folders and every file inside them, all
 * stamped in one transaction so a later restore can treat them as one unit.
 */
export async function trashFolder(
  db: Db,
  userId: string,
  folderId: string,
): Promise<{ folders: number; files: number }> {
  const id = parseUuid(folderId, 'folderId');

  return db.transaction(async (tx) => {
    await assertActiveFolder(tx, userId, id);

    const folders = await tx.query(
      `with recursive subtree as (
        select id from public.folders where user_id = $1 and id = $2
        union all
        select child.id
        from public.folders child
        join subtree parent on child.parent_folder_id = parent.id
        where child.user_id = $1
      )
      update public.folders set deleted_at = now()
      where user_id = $1 and id in (select id from subtree) and deleted_at is null`,
      [userId, id],
    );

    const files = await tx.query(
      `with recursive subtree as (
        select id from public.folders where user_id = $1 and id = $2
        union all
        select child.id
        from public.folders child
        join subtree parent on child.parent_folder_id = parent.id
        where child.user_id = $1
      )
      update public.files set deleted_at = now()
      where user_id = $1
        and folder_id in (select id from subtree)
        and deleted_at is null`,
      [userId, id],
    );

    return { folders: folders.rowCount, files: files.rowCount };
  });
}

/** Restore a trashed folder together with everything that was deleted inside it. */
export async function restoreFolder(db: Db, userId: string, folderId: string): Promise<number> {
  const id = parseUuid(folderId, 'folderId');

  return db.transaction(async (tx) => {
    const { rows } = await tx.query<{ parentFolderId: string | null }>(
      `select parent_folder_id as "parentFolderId" from public.folders
        where user_id = $1 and id = $2 and deleted_at is not null`,
      [userId, id],
    );
    const folder = rows[0];
    if (!folder) {
      throw new ApiError('FILE_NOT_FOUND', 404, 'That folder is not in the trash.');
    }

    if (folder.parentFolderId) {
      const parent = await tx.query(
        'select 1 as present from public.folders where user_id = $1 and id = $2 and deleted_at is null',
        [userId, folder.parentFolderId],
      );
      if (parent.rows.length === 0) {
        throw new ApiError(
          'VALIDATION_ERROR',
          400,
          'Restore the parent folder first, then restore this one.',
        );
      }
    }

    const folders = await tx.query(
      `with recursive subtree as (
        select id from public.folders where user_id = $1 and id = $2
        union all
        select child.id
        from public.folders child
        join subtree parent on child.parent_folder_id = parent.id
        where child.user_id = $1
      )
      update public.folders set deleted_at = null
      where user_id = $1 and id in (select id from subtree) and deleted_at is not null`,
      [userId, id],
    );

    await tx.query(
      `with recursive subtree as (
        select id from public.folders where user_id = $1 and id = $2
        union all
        select child.id
        from public.folders child
        join subtree parent on child.parent_folder_id = parent.id
        where child.user_id = $1
      )
      update public.files set deleted_at = null
      where user_id = $1
        and folder_id in (select id from subtree)
        and deleted_at is not null`,
      [userId, id],
    );

    return folders.rowCount;
  });
}

/**
 * Permanently delete a trashed folder subtree. Refuses while any file inside it
 * has encrypted versions, so provider content is never orphaned.
 */
export async function purgeFolder(db: Db, userId: string, folderId: string): Promise<number> {
  const id = parseUuid(folderId, 'folderId');

  return db.transaction(async (tx) => {
    const subtree = await tx.query<{ id: string; depth: unknown }>(
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

    const ids = subtree.rows.map((row) => row.id);

    const versions = await tx.query<{ total: unknown }>(
      `select count(*)::int as total
        from public.file_versions v
        join public.files f on f.user_id = v.user_id and f.id = v.file_id
        where v.user_id = $1 and f.folder_id = any($2::uuid[])`,
      [userId, ids],
    );
    if (toCount(versions.rows[0]?.total) > 0) {
      throw new ApiError(
        'STORAGE_RECONCILIATION_REQUIRED',
        409,
        'This folder still contains files with encrypted versions. Deleting it would orphan stored content.',
      );
    }

    await tx.query('delete from public.files where user_id = $1 and folder_id = any($2::uuid[])', [
      userId,
      ids,
    ]);

    // Deepest first: the ownership-aware parent foreign key restricts deletes.
    for (const folder of subtree.rows) {
      await tx.query('delete from public.folders where user_id = $1 and id = $2', [
        userId,
        folder.id,
      ]);
    }

    return ids.length;
  });
}
