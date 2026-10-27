import Link from 'next/link';
import type { CategorySummary } from '@stackbase/contracts';
import { Card, CardHeading } from '@/components/ui/Card';
import { CATEGORY_META } from '@/features/library/category-meta';
import { FileTypeIcon } from '@/components/library/FileTypeIcon';
import { cn } from '@/lib/utils/cn';
import { formatBytes, formatCount } from '@/lib/utils/format';

export function CategoryBento({
  categories,
  totalFiles,
  className,
}: {
  categories: readonly CategorySummary[];
  totalFiles: number;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeading
        title="Categories"
        hint="Real counts from your metadata; choose a tile to filter the library"
        action={
          <Link href="/files" className="text-xs font-medium text-primary hover:underline">
            Open library
          </Link>
        }
      />

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((entry) => {
          const meta = CATEGORY_META[entry.category];
          return (
            <li key={entry.category}>
              <Link
                href={`/files?category=${entry.category}`}
                className={cn(
                  'flex h-full flex-col justify-between gap-3 rounded-xl border border-border bg-surface-raised/40 p-3 transition-colors',
                  'hover:border-primary/35 hover:bg-surface-raised',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <FileTypeIcon category={entry.category} className="size-9" />
                  <span className="text-sm font-semibold tabular-nums">{entry.files}</span>
                </div>
                <div>
                  <p className="text-xs font-medium">{meta.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {entry.files === 0 ? meta.empty : formatBytes(entry.bytes)}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        {totalFiles === 0
          ? 'Files appear here after they are uploaded — drop a file into the library and it is encrypted in your browser before it is stored. Folders, tags and metadata work right away.'
          : `${formatCount(totalFiles, 'file')} classified by MIME type first, then by extension.`}
      </p>
    </Card>
  );
}
