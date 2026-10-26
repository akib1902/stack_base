'use client';

import Link from 'next/link';
import type { FileSummary, FolderSummary } from '@stackbase/contracts';
import { Pencil, Star, X } from 'lucide-react';
import { DropdownMenu, MenuItem } from '@/components/ui/DropdownMenu';
import { Button } from '@/components/ui/Button';
import { formatBytes, formatRelativeDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { FileTypeIcon, FolderGlyph, TagChip } from './FileTypeIcon';

const CHECKBOX =
  'size-4 shrink-0 cursor-pointer rounded border-border accent-[var(--primary)]';

function FavoriteMark({ favorite }: { favorite: boolean }) {
  if (!favorite) return null;
  return (
    <span title="Favorite">
      <Star className="size-3.5 fill-primary text-primary" aria-hidden="true" />
      <span className="sr-only">Favorite</span>
    </span>
  );
}

export function FolderGrid({
  folders,
  foldersHref,
  onEdit,
}: {
  folders: readonly FolderSummary[];
  foldersHref: (folderId: string) => string;
  onEdit: (folder: FolderSummary) => void;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {folders.map((folder) => (
        <li
          key={folder.id}
          className="flex items-start justify-between gap-2 rounded-card border border-border bg-surface p-3"
        >
          <Link
            href={foldersHref(folder.id)}
            className="flex min-w-0 flex-1 items-start gap-3"
          >
            <FolderGlyph className="size-11" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{folder.name}</span>
              <span className="mt-0.5 block text-[11px] text-muted">
                {folder.folderCount} {folder.folderCount === 1 ? 'folder' : 'folders'} ·{' '}
                {folder.fileCount} {folder.fileCount === 1 ? 'file' : 'files'}
              </span>
            </span>
          </Link>
          <DropdownMenu label={`Actions for ${folder.name}`}>
            <MenuItem onClick={() => onEdit(folder)}>
              <Pencil className="size-3.5" aria-hidden="true" />
              Rename or move
            </MenuItem>
          </DropdownMenu>
        </li>
      ))}
    </ul>
  );
}

export function FileGrid({
  files,
  selectedIds,
  onToggle,
  onOpen,
}: {
  files: readonly FileSummary[];
  selectedIds: ReadonlySet<string>;
  onToggle: (fileId: string) => void;
  onOpen: (file: FileSummary) => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {files.map((file) => {
        const selected = selectedIds.has(file.id);
        return (
          <li
            key={file.id}
            className={cn(
              'relative flex flex-col rounded-card border bg-surface p-3 transition-colors',
              selected ? 'border-primary/50 ring-1 ring-primary/25' : 'border-border',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <input
                type="checkbox"
                className={CHECKBOX}
                checked={selected}
                onChange={() => onToggle(file.id)}
                aria-label={`Select ${file.name}`}
              />
              <div className="flex items-center gap-1">
                <FavoriteMark favorite={file.favorite} />
                <DropdownMenu label={`Actions for ${file.name}`}>
                  <MenuItem onClick={() => onOpen(file)}>Details</MenuItem>
                  <MenuItem onClick={() => onToggle(file.id)}>
                    {selected ? 'Deselect' : 'Select'}
                  </MenuItem>
                </DropdownMenu>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpen(file)}
              className="mt-1 flex min-w-0 flex-1 flex-col items-start gap-2 text-left"
            >
              <FileTypeIcon category={file.category} className="size-12" />
              <span className="line-clamp-2 break-all text-sm font-medium leading-snug">
                {file.name}
              </span>
              <span className="text-[11px] text-muted">
                {formatBytes(file.sizeBytes)} · {formatRelativeDate(file.updatedAt)}
              </span>
              {file.tags.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {file.tags.slice(0, 2).map((tag) => (
                    <TagChip key={tag.id} tag={tag} />
                  ))}
                  {file.tags.length > 2 ? (
                    <span className="text-[11px] text-muted">+{file.tags.length - 2}</span>
                  ) : null}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function FileList({
  files,
  selectedIds,
  onToggle,
  onOpen,
}: {
  files: readonly FileSummary[];
  selectedIds: ReadonlySet<string>;
  onToggle: (fileId: string) => void;
  onOpen: (file: FileSummary) => void;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <div className="hidden items-center gap-3 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted sm:flex">
        <span className="w-4" />
        <span className="min-w-0 flex-1">Name</span>
        <span className="w-28 shrink-0">Folder</span>
        <span className="w-20 shrink-0 text-right">Size</span>
        <span className="w-24 shrink-0 text-right">Modified</span>
        <span className="w-8 shrink-0" />
      </div>

      <ul className="divide-y divide-border">
        {files.map((file) => {
          const selected = selectedIds.has(file.id);
          return (
            <li
              key={file.id}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 transition-colors',
                selected ? 'bg-primary/5' : 'hover:bg-surface-raised/60',
              )}
            >
              <input
                type="checkbox"
                className={CHECKBOX}
                checked={selected}
                onChange={() => onToggle(file.id)}
                aria-label={`Select ${file.name}`}
              />

              <button
                type="button"
                onClick={() => onOpen(file)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <FileTypeIcon category={file.category} className="size-9" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{file.name}</span>
                    <FavoriteMark favorite={file.favorite} />
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted sm:hidden">
                    <span>{formatBytes(file.sizeBytes)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatRelativeDate(file.updatedAt)}</span>
                    {file.folderName ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{file.folderName}</span>
                      </>
                    ) : null}
                  </span>
                  <span className="mt-0.5 hidden gap-1 sm:flex">
                    {file.tags.slice(0, 3).map((tag) => (
                      <TagChip key={tag.id} tag={tag} />
                    ))}
                  </span>
                </span>
              </button>

              <span className="hidden w-28 shrink-0 truncate text-xs text-muted sm:block">
                {file.folderName ?? 'Root'}
              </span>
              <span className="hidden w-20 shrink-0 text-right text-xs tabular-nums sm:block">
                {formatBytes(file.sizeBytes)}
              </span>
              <span className="hidden w-24 shrink-0 text-right text-xs text-muted sm:block">
                {formatRelativeDate(file.updatedAt)}
              </span>

              <DropdownMenu label={`Actions for ${file.name}`}>
                <MenuItem onClick={() => onOpen(file)}>Details</MenuItem>
                <MenuItem onClick={() => onToggle(file.id)}>
                  {selected ? 'Deselect' : 'Select'}
                </MenuItem>
              </DropdownMenu>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SelectionBar({
  count,
  onClear,
  onFavorite,
  onUnfavorite,
  onMove,
  onTrash,
}: {
  count: number;
  onClear: () => void;
  onFavorite: () => void;
  onUnfavorite: () => void;
  onMove: () => void;
  onTrash: () => void;
}) {
  if (count === 0) return null;

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="flex flex-wrap items-center gap-2 rounded-card border border-primary/30 bg-primary/5 px-3 py-2"
    >
      <span className="mr-1 text-xs font-semibold">{count} selected</span>
      <Button type="button" variant="secondary" size="sm" onClick={onFavorite}>
        <Star className="size-3.5" aria-hidden="true" />
        Favorite
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={onUnfavorite}>
        Unfavorite
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={onMove}>
        Move to…
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-error hover:bg-error/10"
        onClick={onTrash}
      >
        Move to trash
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-auto"
        onClick={onClear}
        aria-label="Clear selection"
      >
        <X className="size-3.5" aria-hidden="true" />
        Clear
      </Button>
    </div>
  );
}
