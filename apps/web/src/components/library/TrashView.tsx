'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { TrashItem } from '@stackbase/contracts';
import { RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatBytes, formatDate, formatRelativeDate } from '@/lib/utils/format';
import {
  purgeTrashAction,
  restoreTrashAction,
} from '@/features/library/actions';
import { FileTypeIcon, FolderGlyph } from './FileTypeIcon';
import { ConfirmDialog } from './ConfirmDialog';

export function TrashView({
  items,
  retentionDays,
}: {
  items: readonly TrashItem[];
  retentionDays: number;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toPurge, setToPurge] = useState<TrashItem | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restore = async (item: TrashItem): Promise<void> => {
    setBusyId(item.id);
    setError(null);
    const result = await restoreTrashAction(item.kind, item.id);
    setBusyId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  };

  const purge = async (): Promise<void> => {
    if (!toPurge || pending) return;
    setPending(true);
    setError(null);
    const result = await purgeTrashAction(toPurge.kind, toPurge.id);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setToPurge(null);
    router.refresh();
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Trash2 className="size-4" aria-hidden="true" />}
        title="Trash is empty"
        description="Deleted files and folders stay here until you restore or permanently remove them."
        footer={
          <Link href="/files" className="text-xs font-medium text-primary hover:underline">
            Browse all files
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-error/25 bg-error/10 px-3 py-2 text-xs text-error"
        >
          {error}
        </p>
      ) : null}

      <p className="text-xs leading-relaxed text-muted">
        {retentionDays === 0
          ? 'Retention is set to 0 days, so nothing expires automatically. Items stay until you remove them.'
          : `Items are slated to expire after ${retentionDays} days. Automatic purging arrives with the lifecycle milestone; until then nothing is deleted without you.`}
      </p>

      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {items.map((item) => {
          const busy = busyId === item.id;
          return (
            <li
              key={`${item.kind}-${item.id}`}
              className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center"
            >
              {item.kind === 'folder' ? (
                <FolderGlyph className="size-10" />
              ) : (
                <FileTypeIcon
                  category={item.category ?? 'other'}
                  className="size-10"
                />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-muted">
                  <span className="capitalize">{item.kind}</span>
                  {item.parentName ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>in {item.parentName}</span>
                    </>
                  ) : null}
                  {item.kind === 'file' ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{formatBytes(item.sizeBytes)}</span>
                    </>
                  ) : null}
                  <span aria-hidden="true">·</span>
                  <span>deleted {formatRelativeDate(item.deletedAt)}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {item.expiresAt
                    ? `Expires ${formatDate(item.expiresAt)}`
                    : 'No automatic expiry'}
                </p>
              </div>

              <div className="flex items-center gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => void restore(item)}
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  {busy ? 'Restoring…' : 'Restore'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-error hover:bg-error/10"
                  disabled={busy}
                  onClick={() => setToPurge(item)}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Delete forever
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={toPurge !== null}
        title="Delete permanently?"
        description={
          toPurge?.kind === 'folder'
            ? `“${toPurge?.name}” and everything inside it will be permanently removed. This cannot be undone.`
            : `“${toPurge?.name}” will be permanently removed. This cannot be undone.`
        }
        confirmLabel="Delete forever"
        pending={pending}
        error={error}
        onConfirm={() => void purge()}
        onClose={() => {
          setToPurge(null);
          setError(null);
        }}
      />
    </div>
  );
}
