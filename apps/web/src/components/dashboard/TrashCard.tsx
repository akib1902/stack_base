import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import type { LibrarySummaryResponse } from '@stackbase/contracts';
import { Card, CardHeading } from '@/components/ui/Card';
import { formatCount } from '@/lib/utils/format';

export function TrashCard({
  totals,
  retentionDays,
  className,
}: {
  totals: LibrarySummaryResponse['totals'];
  retentionDays: number;
  className?: string;
}) {
  const items = totals.trashedFiles + totals.trashedFolders;

  return (
    <Card className={className}>
      <CardHeading
        icon={<Trash2 className="size-4" />}
        title="Trash"
        hint="Recoverable until you remove it"
        action={
          <Link href="/trash" className="text-xs font-medium text-primary-ink hover:underline">
            Review
          </Link>
        }
      />

      <p className="text-2xl font-semibold tracking-tight tabular-nums">{items}</p>
      <p className="mt-1 text-xs text-muted">{formatCount(items, 'item')} in the trash</p>

      <dl className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Files</dt>
          <dd className="font-medium tabular-nums">{totals.trashedFiles}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Folders</dt>
          <dd className="font-medium tabular-nums">{totals.trashedFolders}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Retention</dt>
          <dd className="font-medium">
            {retentionDays === 0 ? 'No expiry' : `${retentionDays} days`}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        Deleting metadata never deletes provider content while versions still reference it.
      </p>
    </Card>
  );
}
