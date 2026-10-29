'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserSettings } from '@stackbase/contracts';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Dialog';
import { updateSettingsAction } from '@/features/library/actions';
import { readLibrary, type LibraryRecord } from '@/features/offline/metadata-cache';
import { useOffline } from '@/features/offline/offline-context';

const STATUS_LABEL: Record<string, string> = {
  pending: 'waiting',
  syncing: 'syncing',
  conflict: 'conflict',
  failed: 'failed',
};

function formatWhen(value: string | undefined): string {
  if (!value) return 'never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'never' : date.toLocaleString();
}

/**
 * The "Offline and cache" settings surface (SRS C4): the account's offline
 * toggle, what this device has cached, and the queued operation list with
 * conflict visibility and manual retry/discard.
 */
export function OfflinePreferences({ settings }: { settings: UserSettings }) {
  const router = useRouter();
  const { userId, online, offlineEnabled, queued, refresh, replay, discard } =
    useOffline();

  const [enabled, setEnabled] = useState(settings.offlineEnabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [mirror, setMirror] = useState<LibraryRecord | null>(null);

  const load = useCallback(async () => {
    setMirror(await readLibrary(userId));
    await refresh();
  }, [refresh, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (): Promise<void> => {
    if (pending) return;
    const next = !enabled;
    setPending(true);
    setError(null);
    setNote(null);
    const result = await updateSettingsAction({ offlineEnabled: next });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      setEnabled(enabled);
      return;
    }
    setEnabled(next);
    router.refresh();
    await load();
  };

  const runReplay = async (): Promise<void> => {
    setNote(null);
    const summary = await replay();
    if (summary) {
      const parts: string[] = [];
      if (summary.applied) parts.push(`${summary.applied} applied`);
      if (summary.conflicts) parts.push(`${summary.conflicts} in conflict`);
      if (summary.failed) parts.push(`${summary.failed} failed`);
      if (summary.waiting) parts.push(`${summary.waiting} waiting`);
      setNote(parts.length ? parts.join(' · ') : 'Nothing to send.');
    }
    await load();
  };

  const conflicts = queued.filter((operation) => operation.status === 'conflict');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Offline metadata</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Keeps a metadata-only mirror of this account&apos;s files, folders and tags in
            this browser so a failed page can still show what you have. No file contents,
            no keys and no ciphertext are stored.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={enabled ? 'secondary' : 'primary'}
          onClick={() => void toggle()}
          disabled={pending}
          aria-pressed={enabled}
        >
          {pending ? 'Saving…' : enabled ? 'On' : 'Off'}
        </Button>
      </div>

      <dl className="space-y-1.5 border-t border-border pt-3 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Cached on this device</dt>
          <dd className="text-right font-medium">
            {offlineEnabled && mirror
              ? `${mirror.files.length} files · ${mirror.folders.length} folders · ${mirror.tags.length} tags`
              : 'Not mirroring'}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Last synced</dt>
          <dd className="text-right font-medium">{formatWhen(mirror?.storedAt)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Queued changes</dt>
          <dd className="text-right font-medium">
            {queued.length}
            {!online ? ' · offline' : ''}
          </dd>
        </div>
      </dl>

      {queued.length > 0 ? (
        <div className="rounded-xl border border-border bg-surface-raised/40 p-3">
          <ul className="space-y-2">
            {queued.map((operation) => (
              <li key={operation.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{operation.label}</p>
                  {operation.error ? (
                    <p className="mt-0.5 text-[11px] leading-snug text-error">
                      {operation.error}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    data-status={operation.status}
                    className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted data-[status=conflict]:border-error/40 data-[status=conflict]:text-error data-[status=failed]:border-error/40 data-[status=failed]:text-error data-[status=pending]:text-primary-ink"
                  >
                    {STATUS_LABEL[operation.status] ?? operation.status}
                  </span>
                  <button
                    type="button"
                    className="text-[11px] font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
                    onClick={() => void discard(operation.id)}
                  >
                    Discard
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void runReplay()}
              disabled={!online}
            >
              Sync now
            </Button>
            {note ? (
              <span role="status" className="text-xs text-muted">
                {note}
              </span>
            ) : null}
            {!online ? (
              <span className="text-xs text-muted">Waiting for a connection.</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {conflicts.length > 0 ? (
        <p className="text-xs leading-relaxed text-muted">
          A conflicting change was made elsewhere after you edited it offline, so it was
          not applied. Review it on the file, then discard it here or apply it again once
          you have decided.
        </p>
      ) : null}

      <FormError message={error} />

      <p className="text-[11px] leading-relaxed text-muted">
        Signing out clears this mirror and the queue. Changes are replayed automatically
        when the connection returns, and a change is only sent after confirming the file
        has not moved on since you made it.
      </p>
    </div>
  );
}