import { HardDrive } from 'lucide-react';
import { Card, CardHeading } from '@/components/ui/Card';
import { formatBytes, formatCount } from '@/lib/utils/format';

export function StorageSummaryCard({
  bytes,
  files,
  folders,
  className,
  delay,
}: {
  bytes: number;
  files: number;
  folders: number;
  className?: string;
  delay?: number;
}) {
  return (
    <Card className={className} delay={delay}>
      <CardHeading icon={<HardDrive className="size-4" />} title="Logical storage" />

      <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatBytes(bytes)}</p>
      <p className="mt-1 text-xs text-muted">
        {formatCount(files, 'file')} · {formatCount(folders, 'folder')}
      </p>

      <dl className="mt-5 space-y-2 border-t border-border pt-3 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Source</dt>
          <dd className="font-medium">Metadata database</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Trash</dt>
          <dd className="font-medium">Excluded</dd>
        </div>
      </dl>

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        Logical size may differ from the physical storage your provider reports.
      </p>
    </Card>
  );
}
