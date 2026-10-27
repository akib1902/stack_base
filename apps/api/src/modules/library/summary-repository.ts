import {
  LIBRARY_CATEGORIES,
  type CategorySummary,
  type LibraryCategory,
  type LibrarySummaryResponse,
  type SearchResponse,
} from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { toCount } from '../../database/values';
import { categoryExpression } from './categories';
import { listFileSummaries } from './files-repository';
import { searchFolders } from './folders-repository';

interface TotalsRow {
  files: unknown;
  folders: unknown;
  bytes: unknown;
  tags: unknown;
  trashedFiles: unknown;
  trashedFolders: unknown;
}

interface CategoryRow {
  category: LibraryCategory;
  files: unknown;
  bytes: unknown;
}

const EMPTY_TOTALS: LibrarySummaryResponse['totals'] = {
  files: 0,
  folders: 0,
  bytes: 0,
  tags: 0,
  trashedFiles: 0,
  trashedFolders: 0,
};

/**
 * Category aggregates for the caller's live files. Empty categories are
 * returned explicitly so tiles and charts are stable between loads.
 */
export async function readCategoryTotals(db: Db, userId: string): Promise<CategorySummary[]> {
  const { rows } = await db.query<CategoryRow>(
    `select category, count(*)::int as files, coalesce(sum(size), 0)::bigint as bytes
        from (
          select ${categoryExpression('f')} as category, f.logical_size_bytes as size
          from public.files f
          where f.user_id = $1 and f.deleted_at is null
        ) classified
        group by category`,
    [userId],
  );
  const byCategory = new Map(
    rows.map((row) => [
      row.category,
      { files: toCount(row.files), bytes: toCount(row.bytes) },
    ]),
  );
  return LIBRARY_CATEGORIES.map((category) => ({
    category,
    files: byCategory.get(category)?.files ?? 0,
    bytes: byCategory.get(category)?.bytes ?? 0,
  }));
}

/**
 * Everything the bento grid needs, read from the caller's own rows in one call.
 */
export async function getLibrarySummary(
  db: Db,
  userId: string,
): Promise<LibrarySummaryResponse> {
  const [totals, categories, recent, largest] = await Promise.all([
    db.query<TotalsRow>(
      `select
        (select count(*)::int from public.files where user_id = $1 and deleted_at is null) as files,
        (select count(*)::int from public.folders where user_id = $1 and deleted_at is null) as folders,
        (select coalesce(sum(logical_size_bytes), 0)::bigint from public.files
          where user_id = $1 and deleted_at is null) as bytes,
        (select count(*)::int from public.tags where user_id = $1) as tags,
        (select count(*)::int from public.files where user_id = $1 and deleted_at is not null) as "trashedFiles",
        (select count(*)::int from public.folders where user_id = $1 and deleted_at is not null) as "trashedFolders"`,
      [userId],
    ),
    readCategoryTotals(db, userId),
    listFileSummaries(db, userId, { sort: 'updated_at', limit: 5 }),
    listFileSummaries(db, userId, { sort: 'size_desc', limit: 5 }),
  ]);

  const totalsRow = totals.rows[0];

  return {
    totals: totalsRow
      ? {
          files: toCount(totalsRow.files),
          folders: toCount(totalsRow.folders),
          bytes: toCount(totalsRow.bytes),
          tags: toCount(totalsRow.tags),
          trashedFiles: toCount(totalsRow.trashedFiles),
          trashedFolders: toCount(totalsRow.trashedFolders),
        }
      : EMPTY_TOTALS,
    categories,
    recent,
    largest,
  };
}

/** Global search used by the command palette. Owner-scoped and capped. */
export async function searchLibrary(
  db: Db,
  userId: string,
  rawQuery: string,
): Promise<SearchResponse> {
  const query = rawQuery.trim().slice(0, 200);

  if (query.length === 0) {
    return { query, files: [], folders: [] };
  }

  const [files, folders] = await Promise.all([
    listFileSummaries(db, userId, { q: query, sort: 'updated_at', limit: 8 }),
    searchFolders(db, userId, query, 8),
  ]);

  return { query, files, folders };
}
