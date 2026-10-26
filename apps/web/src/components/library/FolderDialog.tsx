'use client';

import { useEffect, useState } from 'react';
import type { FolderSummary } from '@stackbase/contracts';
import { Button } from '@/components/ui/Button';
import { Dialog, FormError } from '@/components/ui/Dialog';
import {
  createFolderAction,
  updateFolderAction,
} from '@/features/library/actions';
import { excludedMoveTargets, folderOptionLabel } from '@/features/library/params';

export function FolderDialog({
  open,
  mode,
  folder,
  folders,
  defaultParentId = null,
  onClose,
  onSaved,
  onRequestDelete,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  folder?: FolderSummary | null;
  folders: readonly FolderSummary[];
  defaultParentId?: string | null;
  onClose: () => void;
  onSaved: () => void;
  onRequestDelete?: (folder: FolderSummary) => void;
}) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(folder?.name ?? '');
    setParentId(folder?.parentFolderId ?? defaultParentId ?? '');
    setError(null);
    setPending(false);
  }, [open, folder?.id, defaultParentId]);

  const excluded =
    mode === 'edit' && folder ? excludedMoveTargets(folders, folder.id) : new Set<string>();

  const submit = async (): Promise<void> => {
    if (pending) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError('A folder name is required.');
      return;
    }

    setPending(true);
    setError(null);

    const result =
      mode === 'create'
        ? await createFolderAction({
            name: trimmed,
            parentFolderId: parentId || null,
          })
        : await updateFolderAction(folder!.id, {
            name: trimmed,
            parentFolderId: parentId || null,
          });

    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'New folder' : 'Folder settings'}
      description={
        mode === 'create'
          ? 'Folders are metadata only; nothing leaves your device.'
          : 'Rename this folder or move it inside another one.'
      }
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          {mode === 'edit' && folder && onRequestDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-error hover:bg-error/10"
              onClick={() => onRequestDelete(folder)}
            >
              Move to trash
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={() => void submit()} disabled={pending}>
              {pending ? 'Saving…' : mode === 'create' ? 'Create folder' : 'Save changes'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />

        <label className="block">
          <span className="text-xs font-medium">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={255}
            autoFocus
            className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
            aria-invalid={error ? true : undefined}
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium">Inside</span>
          <select
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
          >
            <option value="">No parent (root)</option>
            {folders
              .filter((candidate) => !excluded.has(candidate.id))
              .map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {folderOptionLabel(folders, candidate.id)}
                </option>
              ))}
          </select>
          {mode === 'edit' ? (
            <span className="mt-1.5 block text-[11px] leading-relaxed text-muted">
              A folder cannot be moved inside itself or one of its own subfolders.
            </span>
          ) : null}
        </label>
      </div>
    </Dialog>
  );
}
