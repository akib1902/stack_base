'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type {
  FileSummary,
  FolderSummary,
  TagListItem,
  UpdateFileRequest,
} from '@stackbase/contracts';
import { Info, Plus, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog, FormError } from '@/components/ui/Dialog';
import {
  createTagAction,
  setFileTagsAction,
  updateFileAction,
} from '@/features/library/actions';
import { CATEGORY_META } from '@/features/library/category-meta';
import { useOffline } from '@/features/offline/offline-context';
import { enqueueOperation } from '@/features/offline/queue';
import { folderOptionLabel } from '@/features/library/params';
import { FilePreview } from '@/features/previews/file-preview';
import { DownloadFileButton } from '@/features/uploads/download-button';
import { VersionHistory } from '@/features/uploads/version-history';
import { formatBytes, formatDateTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

function MetadataRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0 last:pb-0 first:pt-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right text-xs font-medium">{children}</dd>
    </div>
  );
}

export function FileDetailsDialog({
  open,
  file,
  folders,
  tags,
  onClose,
  onSaved,
  onRestored,
  onShare,
  onRequestDelete,
}: {
  open: boolean;
  file: FileSummary | null;
  folders: readonly FolderSummary[];
  tags: readonly TagListItem[];
  onClose: () => void;
  onSaved: () => void;
  onRestored: () => void;
  onShare: (file: FileSummary) => void;
  onRequestDelete: (file: FileSummary) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [knownTags, setKnownTags] = useState<TagListItem[]>([]);
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [queuedNotice, setQueuedNotice] = useState(false);
  const { userId, offlineEnabled } = useOffline();

  useEffect(() => {
    if (!open || !file) return;
    setName(file.name);
    setDescription(file.description ?? '');
    setFolderId(file.folderId ?? '');
    setFavorite(file.favorite);
    setSelectedTags(new Set(file.tags.map((tag) => tag.id)));
    setNewTag('');
    setError(null);
    setPending(false);
  }, [open, file?.id]);

  useEffect(() => {
    if (open) setKnownTags([...tags]);
  }, [open, tags]);

  if (!file) {
    return null;
  }

  const toggleTag = (tagId: string): void => {
    setSelectedTags((current) => {
      const next = new Set(current);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const addTag = async (): Promise<void> => {
    const name = newTag.trim();
    if (!name) return;
    setError(null);
    const result = await createTagAction({ name });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setKnownTags((current) => [...current, result.data]);
    setSelectedTags((current) => new Set(current).add(result.data.id));
    setNewTag('');
  };

  const save = async (): Promise<void> => {
    if (pending) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError('A file name is required.');
      return;
    }

    setPending(true);
    setError(null);
    setQueuedNotice(false);

    const patch: UpdateFileRequest = {
      name: trimmed,
      description: description.trim() ? description.trim() : null,
      folderId: folderId || null,
      favorite,
    };

    // Offline this tab cannot reach the app at all, so the whole save (fields
    // plus tags) is written to the local queue against the file's current
    // version and replayed when connectivity returns. Replay refuses to apply
    // it if the file moved on meanwhile, rather than overwriting that edit.
    const offline =
      offlineEnabled && typeof navigator !== 'undefined' && navigator.onLine === false;
    if (offline) {
      await enqueueOperation({
        userId,
        kind: 'update-file',
        label: `Update “${trimmed}”`,
        resourceId: file.id,
        baseVersion: file.updatedAt,
        payload: { patch, tagIds: [...selectedTags] },
      });
      setPending(false);
      setQueuedNotice(true);
      return;
    }

    const updated = await updateFileAction(file.id, patch);
    if (!updated.ok) {
      setPending(false);
      setError(updated.message);
      return;
    }

    const tagged = await setFileTagsAction(file.id, [...selectedTags]);
    setPending(false);
    if (!tagged.ok) {
      setError(tagged.message);
      return;
    }

    onSaved();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="File details"
      description="Metadata is stored in your own database; file content never leaves your device."
      className="w-[min(94vw,38rem)]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-error hover:bg-error/10"
              onClick={() => onRequestDelete(file)}
            >
              Move to trash
            </Button>
            {file.contentStatus === 'ready' ? (
              <>
                <DownloadFileButton
                  fileId={file.id}
                  fileName={file.name}
                  sizeBytes={file.sizeBytes}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onShare(file)}
                >
                  <Share2 className="size-3.5" aria-hidden="true" />
                  Share link
                </Button>
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={() => void save()} disabled={pending}>
              {pending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <FormError message={error} />

        {queuedNotice ? (
          <p
            role="status"
            className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-xs leading-relaxed text-primary-ink"
          >
            Saved to this device. It will be sent when you are back online, and Settings →
            Offline and cache shows its status if it conflicts with another change.
          </p>
        ) : null}

        {/* Decrypts in this tab on open; nothing is requested while closed. */}
        {open ? <FilePreview file={file} /> : null}

        {open && file.contentStatus === 'ready' ? (
          <VersionHistory fileId={file.id} fileName={file.name} onRestored={onRestored} />
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={255}
              className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium">Folder</span>
            <select
              value={folderId}
              onChange={(event) => setFolderId(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
            >
              <option value="">No folder (root)</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folderOptionLabel(folders, folder.id)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-medium">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Optional note about this file"
            className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          />
        </label>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised/60 px-3 py-2.5">
          <span className="text-xs font-medium">Favorite</span>
          <input
            type="checkbox"
            checked={favorite}
            onChange={(event) => setFavorite(event.target.checked)}
            className="size-4 accent-[var(--primary)]"
          />
        </label>

        <div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium">Tags</span>
            <span className="text-[11px] text-muted">{selectedTags.size} selected</span>
          </div>

          {knownTags.length === 0 ? (
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
              No tags yet. Create one to group files across folders.
            </p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {knownTags.map((tag) => {
                const active = selectedTags.has(tag.id);
                return (
                  <li key={tag.id}>
                    <button
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      aria-pressed={active}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                        active
                          ? 'border-primary/40 bg-primary/10 text-primary-ink'
                          : 'border-border bg-surface text-foreground/80 hover:bg-surface-raised',
                      )}
                    >
                      {tag.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-2 flex items-center gap-2">
            <input
              value={newTag}
              onChange={(event) => setNewTag(event.target.value)}
              placeholder="New tag name"
              maxLength={64}
              className="h-9 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-xs"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void addTag();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void addTag()}
              disabled={!newTag.trim()}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Add
            </Button>
          </div>
        </div>

        <dl className="rounded-xl border border-border bg-surface-raised/50 px-3 py-2">
          <MetadataRow label="Category">
            {CATEGORY_META[file.category].label}
          </MetadataRow>
          <MetadataRow label="Size">{formatBytes(file.sizeBytes)}</MetadataRow>
          <MetadataRow label="Type">
            <code className="font-mono text-[11px]">{file.mimeType}</code>
          </MetadataRow>
          <MetadataRow label="Created">{formatDateTime(file.createdAt)}</MetadataRow>
          <MetadataRow label="Modified">{formatDateTime(file.updatedAt)}</MetadataRow>
          <MetadataRow label="Content">
            {file.contentStatus === 'ready' ? (
              'Encrypted version available'
            ) : (
              <span className="inline-flex items-center gap-1 text-primary-ink">
                <Info className="size-3" aria-hidden="true" />
                Metadata only
              </span>
            )}
          </MetadataRow>
        </dl>

        {file.contentStatus === 'pending' ? (
          <p className="text-[11px] leading-relaxed text-muted">
            This record has metadata but no encrypted content yet — an interrupted upload keeps
            the file listable while its bytes are still being transferred.
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
