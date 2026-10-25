import {
  LIBRARY_CATEGORIES,
  type LibraryCategory,
  type LibrarySummaryResponse,
} from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { toCount } from '../../database/values';
import { categoryExpression, type CategoryAggregate, type CategoryTotals } from './categories';

interface SummaryRow {
  category: LibraryCategory;
  files: unknown;
  bytes: unknown;
}

const LOAD_SUMMARY = `
  select
    ${categoryExpression('f')} as category,
    count(*) as files,
    coalesce(sum(f.logical_size_bytes), 0) as bytes
  from public.files f
  where f.user_id = $1 and f.deleted_at is null
  group by 1
`;

/**
 * Owner-scoped category totals for the Bento home screen. Empty categories are
 * returned as honest zeros rather than being hidden, so the grid is stable.
 */
export async function getLibrarySummary(db: Db, userId: string): Promise<LibrarySummaryResponse> {
  const result = await db.query<SummaryRow>(LOAD_SUMMARY, [userId]);

  const totals = Object.fromEntries(
    LIBRARY_CATEGORIES.map((category) => [category, { files: 0, bytes: 0 }]),
  ) as CategoryTotals;

  for (const row of result.rows) {
    const aggregate: CategoryAggregate = {
      files: toCount(row.files),
      bytes: toCount(row.bytes),
    };
    totals[row.category] = aggregate;
  }

  const categories = LIBRARY_CATEGORIES.map((category) => ({
    category,
    ...totals[category],
  }));

  return {
    totals: categories.reduce(
      (sum, category) => ({
        files: sum.files + category.files,
        bytes: sum.bytes + category.bytes,
      }),
      { files: 0, bytes: 0 },
    ),
    categories,
  };
}
