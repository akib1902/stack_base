'use client';

import { UploadCloud } from 'lucide-react';
import { useUploads } from './upload-context';
import { UploadQueueList } from './upload-queue';

/**
 * The queue lives in one place (bottom right, above the mobile navigation) and
 * reports per-file truth: encrypted locally, transferred chunk by chunk (server
 * confirmed), paused with its stored chunks kept, or interrupted by a refresh
 * and waiting for its source file to be picked again (A5.4).
 */
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
          <UploadCloud className="size-4 text-primary-ink" aria-hidden="true" />
          Uploads
          <span className="text-xs font-normal text-muted">
            {active > 0 ? `${active} active` : `${finished} finished`}
          </span>
        </h2>
        {finished > 0 ? (
          <button
            type="button"
            onClick={() => uploads.clearFinished()}
            className="rounded-lg px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            Clear finished
          </button>
        ) : null}
      </header>

      <UploadQueueList
        items={uploads.items}
        className="max-h-[45vh] overflow-y-auto px-4"
      />
    </aside>
  );
}
