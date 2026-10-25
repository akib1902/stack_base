import Link from 'next/link';
import { FolderOpen } from 'lucide-react';
import { Card, CardHeading } from '@/components/ui/Card';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatBytes, formatCount } from '@/lib/utils/format';

export function LibraryCard({
  files,
  folders,
  bytes,
  className,
  delay,
}: {
  files: number;
  folders: number;
  bytes: number;
  className?: string;
  delay?: number;
}) {
  return (
    <Card className={className} delay={delay}>
      <CardHeading
        icon={<FolderOpen className="size-4" />}
        title="Library"
        hint="Live counts from your metadata"
      />

      {files === 0 && folders === 0 ? (
        <EmptyState
          icon={<FolderOpen className="size-4" aria-hidden="true" />}
          title="Your library is empty"
          description="Folder and file management ships in the next milestone. These counters are read from the database on every load, so they will fill in automatically."
          footer={
            <Link href="/settings" className="text-xs font-medium text-primary hover:underline">
              Review setup
            </Link>
          }
        />
      ) : (
        <dl className="grid grid-cols-3 gap-3">
          <div>
            <dt className="text-xs text-muted">Files</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{files}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Folders</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{folders}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Size</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{formatBytes(bytes)}</dd>
          </div>
        </dl>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        {formatCount(files, 'file')} in {formatCount(folders, 'folder')} · trashed items excluded.
      </p>
    </Card>
  );
}
