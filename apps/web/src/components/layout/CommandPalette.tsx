'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { FileSummary, FolderSummary, SearchResponse } from '@stackbase/contracts';
import { Clock, FolderOpen, Search, Star, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { FileTypeIcon, FolderGlyph } from '@/components/library/FileTypeIcon';
import { searchLibraryAction } from '@/features/library/actions';
import { formatBytes } from '@/lib/utils/format';

const QUICK_LINKS = [
  { href: '/files', label: 'All files', Icon: FolderOpen },
  { href: '/recent', label: 'Recent', Icon: Clock },
  { href: '/favorites', label: 'Favorites', Icon: Star },
  { href: '/trash', label: 'Trash', Icon: Trash2 },
];

function fileHref(file: FileSummary): string {
  const params = new URLSearchParams();
  if (file.folderId) params.set('folderId', file.folderId);
  params.set('file', file.id);
  return `/files?${params.toString()}`;
}

function folderHref(folder: FolderSummary): string {
  return `/files?${new URLSearchParams({ folderId: folder.id }).toString()}`;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const requestId = useRef(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      setError(null);
      return;
    }

    const id = requestId.current + 1;
    requestId.current = id;
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        const response = await searchLibraryAction(trimmed);
        if (requestId.current !== id) return;
        if (!response) {
          setResults(null);
          setError('Search is unavailable right now.');
          return;
        }
        setResults(response);
        setError(null);
      });
    }, 200);

    return () => window.clearTimeout(timer);
  }, [query, open]);

  const close = (): void => {
    setOpen(false);
    setQuery('');
    setResults(null);
    setError(null);
  };

  const go = (href: string): void => {
    close();
    router.push(href);
  };

  const total = results ? results.files.length + results.folders.length : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-3 text-xs text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
        aria-label="Search your library"
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="hidden md:inline">Search</span>
        <kbd className="hidden rounded border border-border bg-surface-raised px-1 py-0.5 text-[10px] font-medium md:inline">
          Ctrl K
        </kbd>
      </button>

      <Dialog
        open={open}
        onClose={close}
        title="Search your library"
        description="Files and folders from your own metadata, matched as you type."
        className="w-[min(94vw,36rem)]"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by file or folder name"
              aria-label="Search query"
              maxLength={200}
              autoFocus
              className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm"
            />
          </div>

          <p aria-live="polite" className="min-h-4 text-[11px] text-muted">
            {pending
              ? 'Searching…'
              : error
                ? error
                : query.trim() && results
                  ? total === 0
                    ? `No matches for “${query.trim()}”.`
                    : `${total} ${total === 1 ? 'result' : 'results'}`
                  : 'Type to search, or jump to a view.'}
          </p>

          {!query.trim() ? (
            <ul className="grid gap-1 sm:grid-cols-2">
              {QUICK_LINKS.map(({ href, label, Icon }) => (
                <li key={href}>
                  <button
                    type="button"
                    onClick={() => go(href)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-raised"
                  >
                    <Icon className="size-4 text-muted" aria-hidden="true" />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-4">
              {results && results.folders.length > 0 ? (
                <section aria-label="Folder results">
                  <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Folders
                  </h3>
                  <ul className="space-y-0.5">
                    {results.folders.map((folder) => (
                      <li key={folder.id}>
                        <button
                          type="button"
                          onClick={() => go(folderHref(folder))}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-raised"
                        >
                          <FolderGlyph className="size-8" />
                          <span className="min-w-0 flex-1 truncate text-sm">{folder.name}</span>
                          <span className="text-[11px] text-muted">
                            {folder.fileCount} {folder.fileCount === 1 ? 'file' : 'files'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {results && results.files.length > 0 ? (
                <section aria-label="File results">
                  <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Files
                  </h3>
                  <ul className="space-y-0.5">
                    {results.files.map((file) => (
                      <li key={file.id}>
                        <button
                          type="button"
                          onClick={() => go(fileHref(file))}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-raised"
                        >
                          <FileTypeIcon category={file.category} className="size-8" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{file.name}</span>
                            <span className="block truncate text-[11px] text-muted">
                              {file.folderName ?? 'Root'} · {formatBytes(file.sizeBytes)}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
