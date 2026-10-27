import {
  type BulkFileRequest,
  type FileListResponse,
  type FileSort,
  type FileSummary,
  type LibraryCategory,
  type TrashItem,
  type UpdateFileRequest,
} from '@stackbase/contracts';
import type { Db, Queryable } from '../../database/db';
import { toCount, toIsoString } from '../../database/values';
import { ApiError } from '../../errors';
import { categoryExpression } from './categories';
import {
  extensionOf,
  normalizeDescription,
  normalizeName,
  parseOptionalFolderId,
  parseUuid,
} from './names';

interface FileRow {
  id: string;
  name: string;
  extension: string | null;
  mimeType: string;
  sizeBytes: unknown;
  favorite: boolean;
  description: string | null;
  folderId: string | null;
  folderName: string | null;
  currentVersionId: string | null;
  createdAt: unknown;
  updatedAt: unknown;
  category: LibraryCategory;
  tags: unknown;
}

const SELECT_FILES = `
  select
    f.id,
    f.name,
    f.extension,
    f.mime_type as "mimeType",
    f.logical_size_bytes as "sizeBytes",
    f.favorite,
    f.description,
    f.folder_id as "folderId",
    fo.name as "folderName",
    f.current_version_id as "currentVersionId",
    f.created_at as "createdAt",
    f.updated_at as "updatedAt",
    ${categoryExpression('f')} as category,
    coalesce(tags.items, '[]'::jsonb) as tags
  from public.files f
  left join public.folders fo
    on fo.user_id = f.user_id and fo.id = f.folder_id
  left join lateral (
    select jsonb_agg(
      jsonb_build_object('id', tg.id, 'name', tg.name, 'colorToken', tg.color_token)
      order by lower(tg.name)
    ) as items
    from public.file_tags ft
    join public.tags tg on tg.user_id = ft.user_id and tg.id = ft.tag_id
    where ft.user_id = f.user_id and ft.file_id = f.id
  ) tags on true
`;

/** Allowlisted sort keys only; user input never reaches the order-by clause. */
const ORDER_BY: Record<FileSort, string> = {
  updated_at: 'f.updated_at desc',
  created_at: 'f.created_at desc',
  name_asc: 'lower(f.name) asc',
  name_desc: 'lower(f.name) desc',
  size_desc: 'f.logical_size_bytes desc',
  size_asc: 'f.logical_size_bytes asc',
};

export interface FileQuery {
  q?: string;
  category?: LibraryCategory;
  folderId?: 'root' | string;
  favorite?: boolean;
  tagId?: string;
  sort?: FileSort;
  limit?: number;
  offset?: number;
  /** Trash listing shares the same filter builder. */
  deleted?: boolean;
}

const fileNotFound = (): ApiError =>
  new ApiError('FILE_NOT_FOUND', 404, 'That file does not exist.');

function mapTags(value: unknown): FileSummary['tags'] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const tag = entry as Record<string, unknown>;
    if (typeof tag.id !== 'string' || typeof tag.name !== 'string') return [];
    return [
      {
        id: tag.id,
        name: tag.name,
        colorToken: typeof tag.colorToken === 'string' ? tag.colorToken : null,
      },
    ];
  });
}

function toFileSummary(row: FileRow): FileSummary {
  return {
    id: row.id,
    name: row.name,
    extension: row.extension,
    mimeType: row.mimeType,
    sizeBytes: toCount(row.sizeBytes),
    category: row.category,
    favorite: row.favorite,
    description: row.description,
    folderId: row.folderId,
    folderName: row.folderName,
    contentStatus: row.currentVersionId ? 'ready' : 'pending',
    tags: mapTags(row.tags),
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

interface Filters {
  where: string;
  params: unknown[];
}

function buildFilters(userId: string, query: FileQuery): Filters {
  const params: unknown[] = [userId];
  const add = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };

  const conditions = [
    'f.user_id = $1',
    query.deleted ? 'f.deleted_at is not null' : 'f.deleted_at is null',
  ];

  if (query.folderId === 'root') {
    conditions.push('f.folder_id is null');
  } else if (query.folderId !== undefined) {
    conditions.push(`f.folder_id = ${add(parseUuid(query.folderId, 'folderId'))}`);
  }

  if (query.category) {
    conditions.push(`${categoryExpression('f')} = ${add(query.category)}`);
  }

  if (query.favorite) {
    conditions.push('f.favorite = true');
  }

  if (query.tagId) {
    conditions.push(
      `exists (
        select 1 from public.file_tags ft
        where ft.user_id = f.user_id and ft.file_id = f.id and ft.tag_id = ${add(
          parseUuid(query.tagId, 'tagId'),
        )}
      )`,
    );
  }

  const needle = query.q?.trim();
  if (needle) {
    const param = add(needle);
    // strpos avoids LIKE wildcard escaping entirely and is case-insensitive here.
    conditions.push(
      `(strpos(lower(f.name), lower(${param})) > 0
        or strpos(lower(coalesce(f.description, '')), lower(${param})) > 0)`,
    );
  }

  return { where: conditions.join(' and '), params };
}

function clampPaging(query: FileQuery): { limit: number; offset: number } {
  const limit = Math.min(Math.max(Math.trunc(query.limit ?? 50), 1), 100);
  const offset = Math.max(Math.trunc(query.offset ?? 0), 0);
  return { limit, offset };
}

/** Page of file summaries plus the total for the same filters. */
export async function listFiles(
  db: Db,
  userId: string,
  query: FileQuery = {},
): Promise<FileListResponse> {
  const { where, params } = buildFilters(userId, query);
  const { limit, offset } = clampPaging(query);
  const order = `${ORDER_BY[query.sort ?? 'updated_at']}, f.id asc`;

  const [page, total] = await Promise.all([
    db.query<FileRow>(
      `${SELECT_FILES} where ${where} order by ${order}
        limit $${params.length + 1} offset $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query<{ total: unknown }>(
      `select count(*)::int as total from public.files f where ${where}`,
      params,
    ),
  ]);

  const items = page.rows.map(toFileSummary);
  const count = toCount(total.rows[0]?.total);

  return {
    items,
    total: count,
    limit,
    offset,
    hasMore: offset + items.length < count,
  };
}

/** Summaries without a count query, used by the dashboard and global search. */
export async function listFileSummaries(
  db: Db,
  userId: string,
  query: FileQuery = {},
): Promise<FileSummary[]> {
  const { where, params } = buildFilters(userId, query);
  const { limit, offset } = clampPaging(query);
  const order = `${ORDER_BY[query.sort ?? 'updated_at']}, f.id asc`;

  const { rows } = await db.query<FileRow>(
    `${SELECT_FILES} where ${where} order by ${order}
      limit $${params.length + 1} offset $${params.length + 2}`,
    [...params, limit, offset],
  );
  return rows.map(toFileSummary);
}

export async function getFile(
  db: Db,
  userId: string,
  fileId: string,
): Promise<FileSummary | null> {
  const id = parseUuid(fileId, 'fileId');
  const { rows } = await db.query<FileRow>(
    `${SELECT_FILES} where f.user_id = $1 and f.id = $2 and f.deleted_at is null`,
    [userId, id],
  );
  return rows[0] ? toFileSummary(rows[0]) : null;
}

export async function assertActiveFolder(
  tx: Queryable,
  userId: string,
  folderId: string,
): Promise<void> {
  const { rows } = await tx.query(
    'select 1 as present from public.folders where user_id = $1 and id = $2 and deleted_at is null',
    [userId, folderId],
  );
  if (rows.length === 0) {
    throw new ApiError('FILE_NOT_FOUND', 404, 'That folder does not exist.');
  }
}

async function assertOwnedTag(tx: Queryable, userId: string, tagId: string): Promise<void> {
  const { rows } = await tx.query(
    'select 1 as present from public.tags where user_id = $1 and id = $2',
    [userId, tagId],
  );
  if (rows.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 400, 'That tag does not exist.');
  }
}

export async function updateFile(
  db: Db,
  userId: string,
  fileId: string,
  input: UpdateFileRequest,
): Promise<FileSummary> {
  const id = parseUuid(fileId, 'fileId');
  const existing = await db.query(
    'select 1 as present from public.files where user_id = $1 and id = $2 and deleted_at is null',
    [userId, id],
  );
  if (existing.rows.length === 0) {
    throw fileNotFound();
  }

  const params: unknown[] = [userId, id];
  const add = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };
  const sets: string[] = [];

  if (input.name !== undefined) {
    const name = normalizeName(input.name);
    sets.push(`name = ${add(name)}`, `extension = ${add(extensionOf(name))}`);
  }

  if (input.folderId !== undefined) {
    const folderId = parseOptionalFolderId(input.folderId, 'folderId');
    if (folderId === null) {
      sets.push('folder_id = null');
    } else {
      await assertActiveFolder(db, userId, folderId);
      sets.push(`folder_id = ${add(folderId)}`);
    }
  }

  if (input.favorite !== undefined) {
    sets.push(`favorite = ${add(input.favorite)}`);
  }

  if (input.description !== undefined) {
    sets.push(`description = ${add(normalizeDescription(input.description))}`);
  }

  if (sets.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 400, 'No supported fields were provided.');
  }

  await db.query(
    `update public.files set ${sets.join(', ')}
      where user_id = $1 and id = $2 and deleted_at is null`,
    params,
  );

  const updated = await getFile(db, userId, id);
  if (!updated) {
    throw fileNotFound();
  }
  return updated;
}

/** Replace the tag set of one file atomically. */
export async function setFileTags(
  db: Db,
  userId: string,
  fileId: string,
  tagIds: readonly string[],
): Promise<FileSummary> {
  const id = parseUuid(fileId, 'fileId');
  const ids = [...new Set(tagIds.map((tagId) => parseUuid(tagId, 'tagIds')))];

  await db.transaction(async (tx) => {
    const file = await tx.query(
      'select 1 as present from public.files where user_id = $1 and id = $2 and deleted_at is null',
      [userId, id],
    );
    if (file.rows.length === 0) {
      throw fileNotFound();
    }

    if (ids.length > 0) {
      const owned = await tx.query<{ total: unknown }>(
        'select count(*)::int as total from public.tags where user_id = $1 and id = any($2::uuid[])',
        [userId, ids],
      );
      if (toCount(owned.rows[0]?.total) !== ids.length) {
        throw new ApiError('VALIDATION_ERROR', 400, 'One or more tags do not exist.');
      }
    }

    await tx.query('delete from public.file_tags where user_id = $1 and file_id = $2', [
      userId,
      id,
    ]);

    if (ids.length > 0) {
      await tx.query(
        `insert into public.file_tags (user_id, file_id, tag_id)
          select $1::uuid, $2::uuid, tag_id from unnest($3::uuid[]) as tag_id`,
        [userId, id, ids],
      );
    }
  });

  const updated = await getFile(db, userId, id);
  if (!updated) {
    throw fileNotFound();
  }
  return updated;
}

/**
 * Apply one action to many files. Ownership is verified up front so a bulk call
 * can never silently act on another account's rows.
 */
export async function bulkUpdateFiles(
  db: Db,
  userId: string,
  input: BulkFileRequest,
): Promise<number> {
  const ids = [...new Set(input.fileIds.map((fileId) => parseUuid(fileId, 'fileIds')))];
  if (ids.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 400, 'Select at least one file.');
  }

  const owned = await db.query<{ id: string }>(
    `select id from public.files
      where user_id = $1 and id = any($2::uuid[]) and deleted_at is null`,
    [userId, ids],
  );
  if (owned.rows.length !== ids.length) {
    throw new ApiError('FILE_NOT_FOUND', 404, 'One or more of those files no longer exist.');
  }

  switch (input.action) {
    case 'move': {
      if (input.folderId === undefined) {
        throw new ApiError('VALIDATION_ERROR', 400, 'A destination folder is required.');
      }
      const folderId = parseOptionalFolderId(input.folderId, 'folderId');
      if (folderId) {
        await assertActiveFolder(db, userId, folderId);
      }
      const { rowCount } = await db.query(
        `update public.files set folder_id = $3
          where user_id = $1 and id = any($2::uuid[]) and deleted_at is null`,
        [userId, ids, folderId],
      );
      return rowCount;
    }

    case 'favorite':
    case 'unfavorite': {
      const { rowCount } = await db.query(
        `update public.files set favorite = $3
          where user_id = $1 and id = any($2::uuid[]) and deleted_at is null`,
        [userId, ids, input.action === 'favorite'],
      );
      return rowCount;
    }

    case 'trash': {
      const { rowCount } = await db.query(
        `update public.files set deleted_at = now()
          where user_id = $1 and id = any($2::uuid[]) and deleted_at is null`,
        [userId, ids],
      );
      return rowCount;
    }

    case 'tag':
    case 'untag': {
      if (!input.tagId) {
        throw new ApiError('VALIDATION_ERROR', 400, 'A tag is required.');
      }
      const tagId = parseUuid(input.tagId, 'tagId');
      await assertOwnedTag(db, userId, tagId);

      if (input.action === 'tag') {
        const { rowCount } = await db.query(
          `insert into public.file_tags (user_id, file_id, tag_id)
            select $1::uuid, f.id, $3::uuid from public.files f
            where f.user_id = $1 and f.id = any($2::uuid[]) and f.deleted_at is null
            on conflict (file_id, tag_id) do nothing`,
          [userId, ids, tagId],
        );
        return rowCount;
      }

      const { rowCount } = await db.query(
        `delete from public.file_tags
          where user_id = $1 and file_id = any($2::uuid[]) and tag_id = $3`,
        [userId, ids, tagId],
      );
      return rowCount;
    }

    default:
      throw new ApiError('VALIDATION_ERROR', 400, 'Unsupported bulk action.');
  }
}

export async function trashFile(db: Db, userId: string, fileId: string): Promise<number> {
  const id = parseUuid(fileId, 'fileId');
  const { rowCount } = await db.query(
    `update public.files set deleted_at = now()
      where user_id = $1 and id = $2 and deleted_at is null`,
    [userId, id],
  );
  if (rowCount === 0) {
    throw fileNotFound();
  }
  return rowCount;
}

export async function restoreFile(db: Db, userId: string, fileId: string): Promise<number> {
  const id = parseUuid(fileId, 'fileId');
  const { rowCount } = await db.query(
    `update public.files f set deleted_at = null
      where f.user_id = $1 and f.id = $2 and f.deleted_at is not null
        and (
          f.folder_id is null or exists (
            select 1 from public.folders fo
            where fo.user_id = f.user_id and fo.id = f.folder_id and fo.deleted_at is null
          )
        )`,
    [userId, id],
  );
  if (rowCount === 0) {
    throw new ApiError(
      'FILE_NOT_FOUND',
      404,
      'That file is not in the trash, or its folder is still in the trash.',
    );
  }
  return rowCount;
}

/**
 * Permanently remove a trashed file record. This deliberately refuses while
 * encrypted versions exist: dropping the metadata would orphan provider content
 * that the version rows still reference.
 */
export async function purgeFile(db: Db, userId: string, fileId: string): Promise<void> {
  const id = parseUuid(fileId, 'fileId');

  await db.transaction(async (tx) => {
    const versions = await tx.query<{ total: unknown }>(
      'select count(*)::int as total from public.file_versions where user_id = $1 and file_id = $2',
      [userId, id],
    );
    if (toCount(versions.rows[0]?.total) > 0) {
      throw new ApiError(
        'STORAGE_RECONCILIATION_REQUIRED',
        409,
        'This file still has encrypted versions. Deleting its metadata would orphan stored content.',
      );
    }

    const { rowCount } = await tx.query(
      'delete from public.files where user_id = $1 and id = $2 and deleted_at is not null',
      [userId, id],
    );
    if (rowCount === 0) {
      throw new ApiError('FILE_NOT_FOUND', 404, 'That file is not in the trash.');
    }
  });
}

interface TrashRow {
  kind: 'file' | 'folder';
  id: string;
  name: string;
  sizeBytes: unknown;
  category: LibraryCategory | null;
  parentName: string | null;
  deletedAt: unknown;
}

/**
 * Trash shows only top-level deleted entries: a file inside a trashed folder is
 * restored with that folder, so it is not listed separately.
 */
export async function listTrash(
  db: Db,
  userId: string,
  retentionDays: number,
): Promise<TrashItem[]> {
  const { rows } = await db.query<TrashRow>(
    `select * from (
      select
        'file'::text as kind,
        f.id,
        f.name,
        f.logical_size_bytes as "sizeBytes",
        ${categoryExpression('f')} as category,
        fo.name as "parentName",
        f.deleted_at as "deletedAt"
      from public.files f
      left join public.folders fo on fo.user_id = f.user_id and fo.id = f.folder_id
      where f.user_id = $1 and f.deleted_at is not null
        and (
          f.folder_id is null or exists (
            select 1 from public.folders p
            where p.user_id = f.user_id and p.id = f.folder_id and p.deleted_at is null
          )
        )

      union all

      select
        'folder'::text as kind,
        d.id,
        d.name,
        0::bigint as "sizeBytes",
        null::text as category,
        parent.name as "parentName",
        d.deleted_at as "deletedAt"
      from public.folders d
      left join public.folders parent
        on parent.user_id = d.user_id and parent.id = d.parent_folder_id
      where d.user_id = $1 and d.deleted_at is not null
        and (
          d.parent_folder_id is null or exists (
            select 1 from public.folders pp
            where pp.user_id = d.user_id and pp.id = d.parent_folder_id and pp.deleted_at is null
          )
        )
    ) items
    order by "deletedAt" desc`,
    [userId],
  );

  return rows.map((row) => {
    const deletedAt = toIsoString(row.deletedAt);
    return {
      kind: row.kind,
      id: row.id,
      name: row.name,
      sizeBytes: toCount(row.sizeBytes),
      category: row.category,
      parentName: row.parentName,
      deletedAt,
      expiresAt:
        retentionDays > 0
          ? new Date(new Date(deletedAt).getTime() + retentionDays * 86_400_000).toISOString()
          : null,
    };
  });
}
