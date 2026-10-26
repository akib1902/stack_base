import type {
  CreateTagRequest,
  TagListResponse,
  UpdateTagRequest,
} from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { toCount, toIsoString } from '../../database/values';
import { ApiError } from '../../errors';
import { normalizeTagName, parseUuid } from './names';

export const TAG_COLOR_TOKENS = ['amber', 'rose', 'indigo', 'sky', 'teal', 'slate'] as const;
export type TagColorToken = (typeof TAG_COLOR_TOKENS)[number];

export type TagListItem = TagListResponse['items'][number];

interface TagRow {
  id: string;
  name: string;
  colorToken: string | null;
  fileCount: unknown;
  createdAt: unknown;
}

function normalizeColorToken(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value.trim() === '') {
    return null;
  }
  const token = value.trim().toLowerCase();
  if (!(TAG_COLOR_TOKENS as readonly string[]).includes(token)) {
    throw new ApiError(
      'VALIDATION_ERROR',
      400,
      `Tag colours must be one of: ${TAG_COLOR_TOKENS.join(', ')}.`,
    );
  }
  return token;
}

const tagNotFound = (): ApiError =>
  new ApiError('FILE_NOT_FOUND', 404, 'That tag does not exist.');

function isDuplicateName(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === '23505';
}

export async function listTags(db: Db, userId: string): Promise<TagListResponse['items']> {
  const { rows } = await db.query<TagRow>(
    `select
      t.id,
      t.name,
      t.color_token as "colorToken",
      t.created_at as "createdAt",
      (
        select count(*)::int
        from public.file_tags ft
        join public.files f on f.user_id = ft.user_id and f.id = ft.file_id
        where ft.user_id = t.user_id and ft.tag_id = t.id and f.deleted_at is null
      ) as "fileCount"
    from public.tags t
    where t.user_id = $1
    order by lower(t.name), t.id`,
    [userId],
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    colorToken: row.colorToken,
    fileCount: toCount(row.fileCount),
    createdAt: toIsoString(row.createdAt),
  }));
}

export async function createTag(
  db: Db,
  userId: string,
  input: CreateTagRequest,
): Promise<TagListItem> {
  const name = normalizeTagName(input.name);
  const colorToken = normalizeColorToken(input.colorToken);

  try {
    const { rows } = await db.query<{ id: string; createdAt: unknown }>(
      `insert into public.tags (user_id, name, color_token)
        values ($1, $2, $3)
        returning id, created_at as "createdAt"`,
      [userId, name, colorToken],
    );
    const row = rows[0];
    if (!row) {
      throw new Error('Tag insert returned no row.');
    }
    return {
      id: row.id,
      name,
      colorToken,
      fileCount: 0,
      createdAt: toIsoString(row.createdAt),
    };
  } catch (error) {
    if (isDuplicateName(error)) {
      throw new ApiError('VALIDATION_ERROR', 400, 'A tag with that name already exists.');
    }
    throw error;
  }
}

export async function updateTag(
  db: Db,
  userId: string,
  tagId: string,
  input: UpdateTagRequest,
): Promise<void> {
  const id = parseUuid(tagId, 'tagId');
  const params: unknown[] = [userId, id];
  const add = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };
  const sets: string[] = [];

  if (input.name !== undefined) {
    sets.push(`name = ${add(normalizeTagName(input.name))}`);
  }
  if (input.colorToken !== undefined) {
    sets.push(`color_token = ${add(normalizeColorToken(input.colorToken))}`);
  }
  if (sets.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 400, 'No supported fields were provided.');
  }

  try {
    const { rowCount } = await db.query(
      `update public.tags set ${sets.join(', ')} where user_id = $1 and id = $2`,
      params,
    );
    if (rowCount === 0) {
      throw tagNotFound();
    }
  } catch (error) {
    if (isDuplicateName(error)) {
      throw new ApiError('VALIDATION_ERROR', 400, 'A tag with that name already exists.');
    }
    throw error;
  }
}

export async function deleteTag(db: Db, userId: string, tagId: string): Promise<void> {
  const id = parseUuid(tagId, 'tagId');
  const { rowCount } = await db.query('delete from public.tags where user_id = $1 and id = $2', [
    userId,
    id,
  ]);
  if (rowCount === 0) {
    throw tagNotFound();
  }
}
