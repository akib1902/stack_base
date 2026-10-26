'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserSettings } from '@stackbase/contracts';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Dialog';
import { updateSettingsAction } from '@/features/library/actions';
import { SORT_OPTIONS } from '@/features/library/params';

const SELECT = 'h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm';

export function LibraryPreferences({ settings }: { settings: UserSettings }) {
  const router = useRouter();
  const [view, setView] = useState(settings.defaultView);
  const [sort, setSort] = useState(settings.defaultSort);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = view !== settings.defaultView || sort !== settings.defaultSort;

  const save = async (): Promise<void> => {
    if (pending || !dirty) return;
    setPending(true);
    setError(null);
    setSaved(false);

    const result = await updateSettingsAction({ defaultView: view, defaultSort: sort });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSaved(true);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium">Default view</span>
          <select
            value={view}
            onChange={(event) => {
              setView(event.target.value as UserSettings['defaultView']);
              setSaved(false);
            }}
            className={`mt-1.5 ${SELECT}`}
          >
            <option value="grid">Grid</option>
            <option value="list">List</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium">Default sort</span>
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as UserSettings['defaultSort']);
              setSaved(false);
            }}
            className={`mt-1.5 ${SELECT}`}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <FormError message={error} />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          onClick={() => void save()}
          disabled={pending || !dirty}
        >
          {pending ? 'Saving…' : 'Save defaults'}
        </Button>
        {saved && !dirty ? (
          <span role="status" className="text-xs text-success">
            Saved
          </span>
        ) : null}
        <p className="text-[11px] leading-relaxed text-muted">
          Views opened from a link can still override these defaults for that visit.
        </p>
      </div>
    </div>
  );
}
