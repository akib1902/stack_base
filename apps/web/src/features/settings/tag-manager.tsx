'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TagListItem } from '@stackbase/contracts';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/library/ConfirmDialog';
import { createTagAction, deleteTagAction } from '@/features/library/actions';

export function TagManager({ tags }: { tags: readonly TagListItem[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<TagListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const create = async (): Promise<void> => {
    if (pending) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    setPending(true);
    setError(null);
    const result = await createTagAction({ name: trimmed });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setName('');
    router.refresh();
  };

  const remove = async (): Promise<void> => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    setError(null);
    const result = await deleteTagAction(toDelete.id);
    setDeleting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setToDelete(null);
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void create();
        }}
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New tag name"
          maxLength={64}
          aria-label="New tag name"
          className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-sm"
        />
        <Button type="submit" size="sm" disabled={pending || !name.trim()}>
          <Plus className="size-3.5" aria-hidden="true" />
          {pending ? 'Adding…' : 'Add tag'}
        </Button>
      </form>

      <FormError message={error} />

      {tags.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface-raised/40 px-3 py-4 text-xs leading-relaxed text-muted">
          No tags yet. Tags group files across folders without moving them.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {tags.map((tag) => (
            <li key={tag.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{tag.name}</p>
                <p className="text-[11px] text-muted">
                  {tag.fileCount} {tag.fileCount === 1 ? 'file' : 'files'}
                  {tag.colorToken ? ` · ${tag.colorToken}` : ''}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-error hover:bg-error/10"
                onClick={() => setToDelete(tag)}
                aria-label={`Delete tag ${tag.name}`}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete tag?"
        description={`“${toDelete?.name}” will be removed from every file it labels. The files themselves are not affected.`}
        confirmLabel="Delete tag"
        pending={deleting}
        error={error}
        onConfirm={() => void remove()}
        onClose={() => {
          setToDelete(null);
          setError(null);
        }}
      />
    </div>
  );
}
