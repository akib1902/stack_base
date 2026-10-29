'use client';

import { CloudOff, CloudUpload } from 'lucide-react';
import { useOffline } from './offline-context';

/**
 * Connectivity and queue state in the top bar: invisible when everything is
 * synced, explicit when the browser is offline or changes are waiting
 * (SRS C8: offline status and synchronization status).
 */
export function OfflineIndicator() {
  const { online, queued } = useOffline();

  if (online && queued.length === 0) return null;

  const conflicts = queued.filter((operation) => operation.status === 'conflict').length;
  const label = !online
    ? queued.length > 0
      ? `Offline · ${queued.length} queued`
      : 'Offline'
    : conflicts > 0
      ? `${conflicts} change${conflicts === 1 ? '' : 's'} need review`
      : `${queued.length} change${queued.length === 1 ? '' : 's'} waiting`;

  const Icon = online ? CloudUpload : CloudOff;

  return (
    <span
      role="status"
      aria-live="polite"
      data-online={online}
      className="inline-flex max-w-[190px] items-center gap-1.5 truncate rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted data-[online=false]:border-primary/40 data-[online=false]:bg-primary/10 data-[online=false]:text-primary-ink"
      title={
        online
          ? 'Connectivity restored; queued changes sync automatically.'
          : 'You are offline. Changes you make are queued on this device.'
      }
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  );
}
