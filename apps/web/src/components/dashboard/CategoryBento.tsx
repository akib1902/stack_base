import type { LibrarySummaryResponse } from '@stackbase/contracts';
import { cn } from '@/lib/utils/cn';
import { formatCount } from '@/lib/utils/format';
import { CategoryTile } from './CategoryTile';

export function CategoryBento({
  summary,
  className,
}: {
  summary: LibrarySummaryResponse;
  className?: string;
}) {
  const totalBytes = summary.totals.bytes;

  return (
    <section aria-labelledby="browse-heading" className={className}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="browse-heading" className="text-sm font-semibold tracking-tight">
            Browse
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Sorted by type from your own file metadata — never sample data.
          </p>
        </div>
        <p className="text-[11px] tabular-nums text-muted">
          {formatCount(summary.totals.files, 'file')} across{' '}
          {formatCount(summary.categories.length, 'category', 'categories')}
        </p>
      </div>

      <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4')}>
        {summary.categories.map((entry, index) => (
          <CategoryTile
            key={entry.category}
            entry={entry}
            index={index}
            sharePercent={totalBytes > 0 ? Math.round((entry.bytes / totalBytes) * 100) : 0}
          />
        ))}
      </div>
    </section>
  );
}
