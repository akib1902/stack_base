'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type {
  FileSummary,
  FolderSummary,
  TagListItem,
} from '@stackbase/contracts';
import { Button } from '@/components/ui/Button';
import { Dialog, FormError } from '@/components/ui/Dialog';
import { bulkFileAction, trashFolderAction } from '@/features/library/actions';
import {
  folderOptionLabel,
  libraryHref,
  type LibraryMode,
  type LibraryView,
} from '@/features/library/params';
import { ShareDialog } from '@/features/shares/share-dialog';
import { useMetadataMirror } from '@/features/offline/use-metadata-mirror';
import { ConfirmDialog } from './ConfirmDialog';
import { FileDetailsDialog } from './FileDetailsDialog';
import { FolderDialog } from './FolderDialog';
import { FileGrid, FileList, FolderGrid, SelectionBar } from './FileViews';

interface Confirmation {
  kind: 'file' | 'folder';
  ids: string[];
  name: string;
}

function MoveFilesDialog({
  open,
  fileIds,
  folders,
  onClose,
  onMoved,
}: {
  open: boolean;
  fileIds: string[];
  folders: readonly FolderSummary[];
  onClose: () => void;
  onMoved: () => void;
}) {
  const [folderId, setFolderId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setFolderId('');
      setError(null);
      setPending(false);
    }
  }, [open]);

  const submit = async (): Promise<void> => {
    if (pending) return;
    setPending(true);
    setError(null);
    const result = await bulkFileAction({
      action: 'move',
      fileIds,
      folderId: folderId || null,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onMoved();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Move ${fileIds.length === 1 ? 'file' : `${fileIds.length} files`}`}
      description="Choose the destination folder. Nothing is copied or uploaded."
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={() => void submit()} disabled={pending}>
            {pending ? 'Moving…' : 'Move'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormError message={error} />
        <label className="block">
          <span className="text-xs font-medium">Destination</span>
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
    </Dialog>
  );
}

export function FileBrowser({
  files,
  subfolders,
  folders,
  tags,
  view,
  mode,
  basePath,
  emptyState,
}: {
  files: readonly FileSummary[];
  subfolders: readonly FolderSummary[];
  folders: readonly FolderSummary[];
  tags: readonly TagListItem[];
  view: LibraryView;
  mode: LibraryMode;
  basePath: string;
  emptyState: ReactNode;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openFile, setOpenFile] = useState<FileSummary | null>(
    () => files.find((file) => file.id === view.fileId) ?? null,
  );
  const [editingFolder, setEditingFolder] = useState<FolderSummary | null>(null);
  const [sharingFile, setSharingFile] = useState<FileSummary | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mirrors what this screen was served into IndexedDB for offline viewing.
  useMetadataMirror({ files, folders, tags });

  useEffect(() => {
    setSelectedIds((current) => {
      const visible = new Set(files.map((file) => file.id));
      const next = new Set([...current].filter((id) => visible.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [files]);

  // `openFile` is a snapshot from when the dialog opened. Follow newer server
  // revisions (an online save, or a queued change that just replayed) so the
  // next offline edit is based on the current version rather than conflicting
  // with the user's own earlier change.
  useEffect(() => {
    setOpenFile((current) => {
      if (!current) return current;
      const fresh = files.find((file) => file.id === current.id);
      return fresh && fresh !== current ? fresh : current;
    });
  }, [files]);

  const toggle = (fileId: string): void => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const allSelected = files.length > 0 && files.every((file) => selectedIds.has(file.id));

  const refresh = (): void => {
    setConfirmation(null);
    setEditingFolder(null);
    setMoveOpen(false);
    router.refresh();
  };

  const runBulk = async (
    action: 'favorite' | 'unfavorite' | 'trash',
  ): Promise<void> => {
    const result = await bulkFileAction({
      action,
      fileIds: [...selectedIds],
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSelectedIds(new Set());
    refresh();
  };

  const confirmTrash = async (): Promise<void> => {
    if (!confirmation || pending) return;
    setPending(true);
    setError(null);

    const result =
      confirmation.kind === 'file'
        ? await bulkFileAction({ action: 'trash', fileIds: confirmation.ids })
        : await trashFolderAction(confirmation.ids[0]!);

    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setOpenFile(null);
    setSelectedIds(new Set());
    refresh();
  };

  const folderHref = (folderId: string): string =>
    libraryHref(basePath, view, {
      folderId,
      q: '',
      category: null,
      tagId: null,
      offset: 0,
      fileId: null,
    });

  return (
    <div className="space-y-4">
      {mode === 'all' && subfolders.length > 0 ? (
        <section aria-label="Folders" className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Folders
          </h2>
          <FolderGrid folders={subfolders} foldersHref={folderHref} onEdit={setEditingFolder} />
        </section>
      ) : null}

      <SelectionBar
        count={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onFavorite={() => void runBulk('favorite')}
        onUnfavorite={() => void runBulk('unfavorite')}
        onMove={() => setMoveOpen(true)}
        onTrash={() =>
          setConfirmation({
            kind: 'file',
            ids: [...selectedIds],
            name: `${selectedIds.size} ${selectedIds.size === 1 ? 'file' : 'files'}`,
          })
        }
      />

      {files.length === 0 && subfolders.length === 0 ? (
        emptyState
      ) : (
        <section aria-label="Files" className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Files
            </h2>
            {files.length > 0 ? (
              <button
                type="button"
                onClick={() =>
                  setSelectedIds(
                    allSelected ? new Set() : new Set(files.map((file) => file.id)),
                  )
                }
                className="text-[11px] font-medium text-primary-ink hover:underline"
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            ) : null}
          </div>

          {files.length === 0 ? (
            <p className="rounded-card border border-dashed border-border bg-surface-raised/40 px-4 py-6 text-center text-sm text-muted">
              No files in this folder.
            </p>
          ) : view.view === 'grid' ? (
            <FileGrid
              files={files}
              selectedIds={selectedIds}
              onToggle={toggle}
              onOpen={setOpenFile}
            />
          ) : (
            <FileList
              files={files}
              selectedIds={selectedIds}
              onToggle={toggle}
              onOpen={setOpenFile}
            />
          )}
        </section>
      )}

      <FileDetailsDialog
        open={openFile !== null}
        file={openFile}
        folders={folders}
        tags={tags}
        onClose={() => setOpenFile(null)}
        onSaved={() => {
          setOpenFile(null);
          router.refresh();
        }}
        onRestored={() => router.refresh()}
        onShare={(file) => {
          setOpenFile(null);
          setSharingFile(file);
        }}
        onRequestDelete={(file) => {
          setOpenFile(null);
          setConfirmation({ kind: 'file', ids: [file.id], name: file.name });
        }}
      />

      <ShareDialog
        open={sharingFile !== null}
        file={sharingFile}
        onClose={() => setSharingFile(null)}
      />

      <FolderDialog
        open={editingFolder !== null}
        mode="edit"
        folder={editingFolder}
        folders={folders}
        onClose={() => setEditingFolder(null)}
        onSaved={refresh}
        onRequestDelete={(folder) => {
          setEditingFolder(null);
          setConfirmation({ kind: 'folder', ids: [folder.id], name: folder.name });
        }}
      />

      <MoveFilesDialog
        open={moveOpen}
        fileIds={[...selectedIds]}
        folders={folders}
        onClose={() => setMoveOpen(false)}
        onMoved={() => {
          setSelectedIds(new Set());
          refresh();
        }}
      />

      <ConfirmDialog
        open={confirmation !== null}
        title={
          confirmation?.kind === 'folder' ? 'Move folder to trash?' : 'Move to trash?'
        }
        description={
          confirmation?.kind === 'folder'
            ? `“${confirmation?.name}” and everything inside it will move to Trash. You can restore it later.`
            : `“${confirmation?.name}” will move to Trash. You can restore it later.`
        }
        confirmLabel="Move to trash"
        pending={pending}
        error={error}
        onConfirm={() => void confirmTrash()}
        onClose={() => {
          setConfirmation(null);
          setError(null);
        }}
      />
    </div>
  );
}
