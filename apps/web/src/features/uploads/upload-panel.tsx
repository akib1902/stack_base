'use client';

import { CheckCircle2, ChevronDown, CircleAlert, Loader2, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import { formatBytes } from '@/lib/utils/format';
import { useUploads, type UploadItem } from './upload-context';

/**
 * The queue lives in one place (bottom right, above the mobile navigation) and
 * reports per-file truth: encrypted locally, transferred chunk by chunk (server
 * confirmed), or failed with the server's own reason and a resume-capable retry.
 */

const ACTIVE: ReadonlySet<UploadItem['status']> = new Set([
  'queued',
  'encrypting',
  'transferring',
  'finalizing',
]);

function StatusIcon({ status }: { status: UploadItem['status'] }) {
  if (status === 'completed') {
    return <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />;
  }
  if (status === 'failed') {
    return <CircleAlert className="size-4 shrink-0 text-error" aria-hidden="true" />;
  }
  if (status === 'cancelled') {
    return <X className="size-4 shrink-0 text-muted" aria-hidden="true" />;
  }
  return <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden="true" />;
}

export function UploadPanel() {
  const uploads = useUploads();
  if (uploads.items.length === 0) return null;

  const active = uploads.activeCount;
  const finished = uploads.items.length - active;

  return (
    <aside
      aria-label="Uploads"
      className="fixed bottom-20 right-4 z-30 w-[min(94vw,22rem)] rounded-card border border-border bg-surface shadow-2xl lg:bottom-6"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <UploadCloud className="size-4 text-primary" aria-hidden="true" />
          Uploads
          <span className="text-xs font-normal text-muted">
            {active > 0 ? `${active} active` : `${finished} finished`}
          </span>
        </h2>
        <div className="flex items-center gap-1">
          {finished > 0 ? (
            <button
              type="button"
              onClick={() => uploads.clearFinished()}
              className="rounded-lg px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
            >
              Clear finished
            </button>
          ) : null}
          <ChevronDown className="size-4 text-muted" aria-hidden="true" />
        </div>
      </header>

      <ul className="max-h-[45vh] divide-y divide-border overflow-y-auto">
        {uploads.items.map((item) => (
          <li key={item.id} className="space-y-2 px-4 py-3">
            <div className="flex items-start gap-2">
              <StatusIcon status={item.status} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium" title={item.name}>
                  {item.name}
                </p>
                <p className="text-[11px] text-muted">
                  {formatBytes(item.sizeBytes)} · {item.detail}
                </p>
                {item.error ? (
                  <p role="alert" className="mt-1 text-[11px] leading-relaxed text-error">
                    {item.error}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {ACTIVE.has(item.status) ? (
                  <button
                    type="button"
                    onClick={() => uploads.cancel(item.id)}
                    className="rounded-lg px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
                  >
                    Cancel
                  </button>
                ) : null}
                {item.status === 'failed' ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => uploads.retry(item.id)}
                  >
                    Retry
                  </Button>
                ) : null}
                {item.status === 'completed' || item.status === 'cancelled' ? (
                  <button
                    type="button"
                    onClick={() => uploads.dismiss(item.id)}
                    aria-label={`Dismiss ${item.name}`}
                    className="grid size-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>

            {ACTIVE.has(item.status) ? (
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={item.percent}
                aria-label={`${item.name} progress`}
                className="h-1.5 overflow-hidden rounded-full bg-surface-raised"
              >
                <div
                  className={cn('h-full rounded-full bg-primary transition-[width] duration-300')}
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </aside>
  );
}
