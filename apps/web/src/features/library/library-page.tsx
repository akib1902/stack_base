import Link from 'next/link';
import { redirect } from 'next/navigation';
import type {
  FileListResponse,
  FolderListResponse,
  MeResponse,
  TagListResponse,
} from '@stackbase/contracts';
import { Clock, FolderOpen, SearchX, Star } from 'lucide-react';
import { EmptyState } from '@/components/feedback/EmptyState';
import { NewFolderButton } from '@/components/library/NewFolderButton';
import { FileBrowser } from '@/components/library/FileBrowser';
import { LibraryToolbar } from '@/components/library/LibraryToolbar';
import { UnauthenticatedError, apiFetch } from '@/lib/api/client';
import { formatCount } from '@/lib/utils/format';
import {
  childFolders,
  findFolderTrail,
  libraryHref,
  parseLibraryView,
  toApiQuery,
  type LibraryMode,
  type RawSearchParams,
} from './params';

const COPY: Record<LibraryMode, { eyebrow: string; title: string; description: string }> = {
  all: {
    eyebrow: 'Library',
    title: 'All files',
    description: 'Folders, filters and metadata for everything in your drive.',
  },
  recent: {
    eyebrow: 'Library',
    title: 'Recent',
    description: 'The files you touched last, newest first.',
  },
  favorites: {
    eyebrow: 'Library',
    title: 'Favorites',
    description: 'Files you starred, from every folder.',
  },
};

export async function LibraryPage({
  mode,
  searchParams,
}: {
  mode: LibraryMode;
  searchParams: RawSearchParams;
}) {
  let me: MeResponse;
  let files: FileListResponse;
  let folders: FolderListResponse;
  let tags: TagListResponse;

  try {
    me = await apiFetch<MeResponse>('/api/v1/me');
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect('/sign-in');
    }
    throw error;
  }

  const view = parseLibraryView(searchParams, me.settings);
  const basePath = mode === 'all' ? '/files' : mode === 'recent' ? '/recent' : '/favorites';

  try {
    [files, folders, tags] = await Promise.all([
      apiFetch<FileListResponse>(`/api/v1/files?${toApiQuery(view, mode)}`),
      apiFetch<FolderListResponse>('/api/v1/folders'),
      apiFetch<TagListResponse>('/api/v1/tags'),
    ]);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect('/sign-in');
    }
    throw error;
  }

  const trail = mode === 'all' ? findFolderTrail(folders.items, view.folderId) : [];
  if (mode === 'all' && view.folderId && trail.length === 0) {
    redirect(basePath);
  }

  const filtered = view.q.length > 0 || view.category !== null || view.tagId !== null;
  const subfolders =
    mode === 'all' && !filtered ? childFolders(folders.items, view.folderId) : [];

  const copy = COPY[mode];
  const clearHref = libraryHref(basePath, view, {
    q: '',
    category: null,
    tagId: null,
    offset: 0,
    fileId: null,
  });

  const emptyState =
    filtered ? (
      <EmptyState
        icon={<SearchX className="size-4" aria-hidden="true" />}
        title="No matching files"
        description={
          view.q
            ? `Nothing matches “${view.q}” with the current filters.`
            : 'Nothing matches the current filters.'
        }
        footer={
          <Link href={clearHref} className="text-xs font-medium text-primary hover:underline">
            Clear filters
          </Link>
        }
      />
    ) : mode === 'favorites' ? (
      <EmptyState
        icon={<Star className="size-4" aria-hidden="true" />}
        title="No favorites yet"
        description="Open a file’s details and mark it as a favorite to keep it one click away."
        footer={
          <Link href="/files" className="text-xs font-medium text-primary hover:underline">
            Browse all files
          </Link>
        }
      />
    ) : mode === 'recent' ? (
      <EmptyState
        icon={<Clock className="size-4" aria-hidden="true" />}
        title="Nothing here yet"
        description="Recently touched files appear here once your library has content."
        footer={
          <Link href="/files" className="text-xs font-medium text-primary hover:underline">
            Go to All files
          </Link>
        }
      />
    ) : view.folderId ? (
      <EmptyState
        icon={<FolderOpen className="size-4" aria-hidden="true" />}
        title="This folder is empty"
        description="Create a subfolder or move files here from another folder."
        footer={<NewFolderButton folders={folders.items} parentId={view.folderId} />}
      />
    ) : (
      <EmptyState
        icon={<FolderOpen className="size-4" aria-hidden="true" />}
        title="Your library is empty"
        description="Create a folder to start organizing. File records arrive through the encrypted upload pipeline in the storage milestone — nothing is uploaded yet."
        footer={<NewFolderButton folders={folders.items} parentId={null} />}
      />
    );

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            {copy.eyebrow}
          </p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight sm:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">
            {copy.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted">
            {formatCount(files.total, 'file')}
            {filtered ? ' matching' : ''}
          </span>
          {mode === 'all' ? (
            <NewFolderButton folders={folders.items} parentId={view.folderId} />
          ) : null}
        </div>
      </header>

      {mode === 'all' ? (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs">
          <Link
            href={libraryHref(basePath, view, { folderId: null, offset: 0, fileId: null })}
            className={
              view.folderId ? 'text-muted hover:text-foreground' : 'font-medium text-foreground'
            }
          >
            All files
          </Link>
          {trail.map((folder) => (
            <span key={folder.id} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="text-muted/60">
                /
              </span>
              <Link
                href={libraryHref(basePath, view, {
                  folderId: folder.id,
                  offset: 0,
                  fileId: null,
                })}
                className={
                  folder.id === view.folderId
                    ? 'font-medium text-foreground'
                    : 'text-muted hover:text-foreground'
                }
              >
                {folder.name}
              </Link>
            </span>
          ))}
        </nav>
      ) : null}

      <LibraryToolbar view={view} mode={mode} basePath={basePath} tags={tags.items} />

      <FileBrowser
        files={files.items}
        subfolders={subfolders}
        folders={folders.items}
        tags={tags.items}
        view={view}
        mode={mode}
        basePath={basePath}
        emptyState={emptyState}
      />

      {files.total > files.limit ? (
        <nav
          aria-label="Pagination"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"
        >
          <p className="text-xs text-muted">
            Showing {files.offset + 1}–{Math.min(files.offset + files.items.length, files.total)}{' '}
            of {files.total}
          </p>
          <div className="flex items-center gap-2">
            {files.offset > 0 ? (
              <Link
                href={libraryHref(basePath, view, {
                  offset: Math.max(0, files.offset - files.limit),
                  fileId: null,
                })}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-surface-raised"
              >
                Previous
              </Link>
            ) : null}
            {files.hasMore ? (
              <Link
                href={libraryHref(basePath, view, {
                  offset: files.offset + files.limit,
                  fileId: null,
                })}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-surface-raised"
              >
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
