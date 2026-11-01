'use client';

import Link from 'next/link';
import {
  CircleAlert,
  Loader2,
  UploadCloud,
  WifiOff,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeading } from '@/components/ui/Card';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatCount } from '@/lib/utils/format';
import { UploadButton } from './upload-button';
import { useUploads, type UploadItem } from './upload-context';
import { ACTIVE_UPLOAD_STATUSES, UploadQueueList } from './upload-queue';

const WAITING_STATUSES: ReadonlySet<UploadItem['status']> = new Set([
  'paused',
  'failed',
  'needs_source_file',
]);

export interface UploadSummary {
  active: number;
  waiting: number;
  completed: number;
}

/** Counts only states the queue actually reports; nothing is inferred. */
export function summarizeUploads(items: readonly UploadItem[]): UploadSummary {
  let active = 0;
  let waiting = 0;
  let completed = 0;

  for (const item of items) {
    if (ACTIVE_UPLOAD_STATUSES.has(item.status)) active += 1;
    else if (WAITING_STATUSES.has(item.status)) waiting += 1;
    else if (item.status === 'completed') completed += 1;
  }

  return { active, waiting, completed };
}

function QueueMetric({
  label,
  value,
  detail,
  attention = false,
}: {
  label: string;
  value: number;
  detail: string;
  attention?: boolean;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p
        className={
          attention && value > 0
            ? 'mt-1 text-2xl font-semibold tracking-tight text-primary-ink'
            : 'mt-1 text-2xl font-semibold tracking-tight'
        }
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">{detail}</p>
    </div>
  );
}

export function UploadsView() {
  const uploads = useUploads();
  const summary = summarizeUploads(uploads.items);
  const finished = uploads.items.filter(
    (item) => item.status === 'completed' || item.status === 'cancelled' || item.status === 'failed',
  ).length;

  const badge = uploads.restoring
    ? { variant: 'muted' as const, label: 'Checking queue' }
    : uploads.restoreError
      ? { variant: 'danger' as const, label: 'Queue unavailable' }
      : summary.active > 0
        ? {
            variant: 'primary' as const,
            label: `${formatCount(summary.active, 'upload')} active`,
          }
        : summary.waiting > 0
          ? {
              variant: 'warning' as const,
              label: `${formatCount(summary.waiting, 'upload')} waiting`,
            }
          : summary.completed > 0
            ? {
                variant: 'success' as const,
                label: `${formatCount(summary.completed, 'upload')} completed`,
              }
            : { variant: 'muted' as const, label: 'No unfinished uploads' };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Library
          </p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight sm:text-3xl">
            Uploads
          </h1>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">
            Files are encrypted in this browser before any chunk leaves it. The queue shows
            server-confirmed progress and restores unfinished jobs after a refresh.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <UploadButton folderId={null} label="Upload files" />
        </div>
      </header>

      {uploads.restoring ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-card border border-border bg-surface px-4 py-3 text-xs text-muted"
        >
          <Loader2 className="size-4 animate-spin text-primary-ink" aria-hidden="true" />
          Restoring unfinished uploads from the server…
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QueueMetric
            label="In progress"
            value={summary.active}
            detail="Queued, encrypting, transferring or finalizing."
          />
          <QueueMetric
            label="Waiting on you"
            value={summary.waiting}
            detail="Paused, failed, or waiting for the original file."
            attention
          />
          <QueueMetric
            label="Completed"
            value={summary.completed}
            detail="Finished in this browser session."
          />
        </div>
      )}

      <Card>
        <CardHeading
          icon={<UploadCloud className="size-4" />}
          title="Transfer queue"
          hint="One file at a time; progress counts only chunks the server has confirmed."
          action={
            finished > 0 ? (
              <button
                type="button"
                onClick={() => uploads.clearFinished()}
                className="rounded-lg px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
              >
                Clear finished
              </button>
            ) : undefined
          }
        />

        {uploads.restoring ? (
          <p role="status" className="text-sm text-muted">
            Checking for unfinished uploads…
          </p>
        ) : (
          <>
            {uploads.restoreError ? (
              <div
                role="alert"
                className="mb-3 flex items-start gap-2 rounded-xl border border-error/25 bg-error/10 p-3 text-xs leading-relaxed text-error"
              >
                <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>
                  Unfinished uploads could not be checked. New uploads still work; reload the
                  page to try restoring the server queue again.
                </p>
              </div>
            ) : null}

            {uploads.items.length === 0 ? (
              uploads.restoreError ? (
                <p className="flex items-start gap-2 text-sm text-muted">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  No queue items were loaded. Files you choose now will still be encrypted and
                  uploaded.
                </p>
              ) : (
                <EmptyState
                  icon={<UploadCloud className="size-4" aria-hidden="true" />}
                  title="Nothing in the queue"
                  description="Choose files to encrypt them on this device and store only ciphertext. Files chosen here go to the library root; open a folder in All files to upload directly into it."
                  footer={
                    <Link
                      href="/files"
                      className="text-xs font-medium text-primary-ink hover:underline"
                    >
                      Browse all files
                    </Link>
                  }
                />
              )
            ) : (
              <UploadQueueList items={uploads.items} />
            )}
          </>
        )}
      </Card>

      <p className="text-[11px] leading-relaxed text-muted">
        Uploads run while StackBase is open in this tab. Refreshing restores unfinished jobs
        from the server; completed and cancelled rows stay in this browser session. Closing the
        tab stops the transfer, and its stored chunks remain on the server for a later resume.
      </p>
    </div>
  );
}
