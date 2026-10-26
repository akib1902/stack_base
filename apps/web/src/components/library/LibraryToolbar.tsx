'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { TagListItem } from '@stackbase/contracts';
import { LayoutGrid, List, RotateCcw, Search } from 'lucide-react';
import { CATEGORY_META, CATEGORY_ORDER } from '@/features/library/category-meta';
import {
  activeFilterCount,
  libraryHref,
  SORT_OPTIONS,
  type LibraryMode,
  type LibraryView,
} from '@/features/library/params';
import { cn } from '@/lib/utils/cn';

const SELECT =
  'h-10 rounded-xl border border-border bg-surface px-2.5 text-xs font-medium text-foreground';

const VIEW_ITEM =
  'grid size-9 place-items-center rounded-lg border transition-colors';

export function LibraryToolbar({
  view,
  mode,
  basePath,
  tags,
}: {
  view: LibraryView;
  mode: LibraryMode;
  basePath: string;
  tags: readonly TagListItem[];
}) {
  const router = useRouter();
  const filters = activeFilterCount(view);

  const go = (patch: Partial<LibraryView>): void => {
    router.push(libraryHref(basePath, view, { ...patch, offset: 0, fileId: null }));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="relative min-w-[12rem] flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get('q');
            go({ q: typeof value === 'string' ? value.trim() : '' });
          }}
        >
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            key={view.q}
            name="q"
            defaultValue={view.q}
            maxLength={200}
            placeholder="Search names and descriptions"
            aria-label="Search files"
            className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-20 text-sm"
          />
          <button
            type="submit"
            className="absolute right-1 top-1 h-8 rounded-lg bg-surface-raised px-3 text-xs font-medium transition-colors hover:bg-border"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-1" role="group" aria-label="View">
          <Link
            href={libraryHref(basePath, view, { view: 'grid', fileId: null })}
            aria-current={view.view === 'grid' ? 'true' : undefined}
            aria-label="Grid view"
            className={cn(
              VIEW_ITEM,
              view.view === 'grid'
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-surface text-muted hover:bg-surface-raised',
            )}
          >
            <LayoutGrid className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href={libraryHref(basePath, view, { view: 'list', fileId: null })}
            aria-current={view.view === 'list' ? 'true' : undefined}
            aria-label="List view"
            className={cn(
              VIEW_ITEM,
              view.view === 'list'
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-surface text-muted hover:bg-surface-raised',
            )}
          >
            <List className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="category-filter">
          Category
        </label>
        <select
          id="category-filter"
          value={view.category ?? ''}
          onChange={(event) => go({ category: (event.target.value || null) as LibraryView['category'] })}
          className={SELECT}
        >
          <option value="">All categories</option>
          {CATEGORY_ORDER.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_META[category].label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="tag-filter">
          Tag
        </label>
        <select
          id="tag-filter"
          value={view.tagId ?? ''}
          onChange={(event) => go({ tagId: event.target.value || null })}
          className={SELECT}
        >
          <option value="">All tags</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="sort-filter">
          Sort
        </label>
        <select
          id="sort-filter"
          value={view.sort}
          onChange={(event) => go({ sort: event.target.value as LibraryView['sort'] })}
          className={SELECT}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {mode === 'all' && view.folderId ? (
          <Link
            href={libraryHref(basePath, view, {
              folderId: null,
              offset: 0,
              fileId: null,
            })}
            className="text-xs font-medium text-primary hover:underline"
          >
            Back to root
          </Link>
        ) : null}

        {filters > 0 ? (
          <button
            type="button"
            onClick={() => go({ q: '', category: null, tagId: null })}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Clear filters ({filters})
          </button>
        ) : null}
      </div>
    </div>
  );
}
