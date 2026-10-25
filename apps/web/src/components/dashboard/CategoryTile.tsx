import type { LibraryCategorySummary } from '@stackbase/contracts';
import { cn } from '@/lib/utils/cn';
import { formatBytes, formatCount } from '@/lib/utils/format';
import { CATEGORY_META } from '@/features/library/category-meta';

export function CategoryTile({
  entry,
  sharePercent,
  index,
}: {
  entry: LibraryCategorySummary;
  sharePercent: number;
  index: number;
}) {
  const meta = CATEGORY_META[entry.category];
  const Icon = meta.icon;
  const hasFiles = entry.files > 0;

  return (
    <article
      className={cn(
        'bento-tile glass reveal group relative flex flex-col overflow-hidden rounded-card border border-border p-4 backdrop-blur-xl backdrop-saturate-150',
        meta.span,
      )}
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn('icon-chip size-10', `tint-${meta.tint}`)} aria-hidden="true">
          <Icon className="size-[18px]" strokeWidth={1.9} />
        </span>
        <span className="pt-0.5 text-[11px] font-medium tabular-nums text-muted">
          {hasFiles ? formatBytes(entry.bytes) : '—'}
        </span>
      </div>

      <h3 className="mt-3 text-sm font-medium tracking-tight">{meta.label}</h3>
      <p className="mt-0.5 text-xs tabular-nums text-muted">
        {hasFiles ? formatCount(entry.files, 'file') : meta.empty}
      </p>

      <div className="mt-auto pt-3">
        <div className="h-1 overflow-hidden rounded-full bg-surface-raised" aria-hidden="true">
          <div
            className="h-full rounded-full bg-[rgb(var(--tint))] transition-[width] duration-500"
            style={{ width: `${hasFiles ? Math.max(sharePercent, 4) : 0}%` }}
          />
        </div>
      </div>
    </article>
  );
}
