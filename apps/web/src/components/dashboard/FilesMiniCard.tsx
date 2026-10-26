import Link from 'next/link';
import type { FileSummary } from '@stackbase/contracts';
import { Clock, HardDrive } from 'lucide-react';
import { Card, CardHeading } from '@/components/ui/Card';
import { EmptyState } from '@/components/feedback/EmptyState';
import { FileTypeIcon } from '@/components/library/FileTypeIcon';
import { formatBytes, formatRelativeDate } from '@/lib/utils/format';

function detailHref(file: FileSummary): string {
  const params = new URLSearchParams();
  if (file.folderId) params.set('folderId', file.folderId);
  params.set('file', file.id);
  return `/files?${params.toString()}`;
}

export function FilesMiniCard({
  kind,
  files,
  className,
}: {
  kind: 'recent' | 'largest';
  files: readonly FileSummary[];
  className?: string;
}) {
  const recent = kind === 'recent';
  const title = recent ? 'Recently touched' : 'Largest files';
  const hint = recent
    ? 'Newest metadata changes first'
    : 'The big items in your library, by logical size';
  const Icon = recent ? Clock : HardDrive;

  return (
    <Card className={className}>
      <CardHeading
        icon={<Icon className="size-4" />}
        title={title}
        hint={hint}
        action={
          <Link
            href={recent ? '/recent' : '/files?sort=size_desc'}
            className="text-xs font-medium text-primary hover:underline"
          >
            View all
          </Link>
        }
      />

      {files.length === 0 ? (
        <EmptyState
          icon={<Icon className="size-4" aria-hidden="true" />}
          title={recent ? 'Nothing here yet' : 'No files to rank'}
          description={
            recent
              ? 'Recently touched files appear here once your library has content.'
              : 'Sizes appear here as soon as your library has files.'
          }
          footer={
            <Link href="/files" className="text-xs font-medium text-primary hover:underline">
              Open library
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-border">
          {files.map((file) => (
            <li key={file.id}>
              <Link
                href={detailHref(file)}
                className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-raised"
              >
                <FileTypeIcon category={file.category} className="size-9" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{file.name}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted">
                    {recent
                      ? `${formatRelativeDate(file.updatedAt)} · ${formatBytes(file.sizeBytes)}`
                      : `${formatBytes(file.sizeBytes)} · ${file.folderName ?? 'Root'}`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
