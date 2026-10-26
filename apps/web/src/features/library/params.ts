import {
  DEFAULT_FILE_SORT,
  FILE_SORTS,
  LIBRARY_CATEGORIES,
  type DefaultView,
  type FileSort,
  type FolderSummary,
  type LibraryCategory,
} from '@stackbase/contracts';

export const LIBRARY_PAGE_SIZE = 50;

export type LibraryMode = 'all' | 'recent' | 'favorites';

export interface LibraryView {
  q: string;
  category: LibraryCategory | null;
  tagId: string | null;
  /** Active folder for the All files view; null means the root. */
  folderId: string | null;
  sort: FileSort;
  view: DefaultView;
  offset: number;
  /** Deep link from Home or search that opens the details dialog. */
  fileId: string | null;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const asUuid = (value: string | undefined): string | null =>
  value && UUID.test(value) ? value : null;

const asSort = (value: string | undefined, fallback: string): FileSort => {
  if (value && (FILE_SORTS as readonly string[]).includes(value)) {
    return value as FileSort;
  }
  if ((FILE_SORTS as readonly string[]).includes(fallback)) {
    return fallback as FileSort;
  }
  return DEFAULT_FILE_SORT;
};

export function parseLibraryView(
  raw: RawSearchParams,
  settings: { defaultView: DefaultView; defaultSort: string },
): LibraryView {
  const q = (first(raw.q) ?? '').trim().slice(0, 200);
  const categoryParam = first(raw.category);
  const category =
    categoryParam && (LIBRARY_CATEGORIES as readonly string[]).includes(categoryParam)
      ? (categoryParam as LibraryCategory)
      : null;

  const viewParam = first(raw.view);
  const view: DefaultView =
    viewParam === 'list' || viewParam === 'grid' ? viewParam : settings.defaultView;

  const offsetValue = Number.parseInt(first(raw.offset) ?? '0', 10);

  return {
    q,
    category,
    tagId: asUuid(first(raw.tagId)),
    folderId: asUuid(first(raw.folderId)),
    sort: asSort(first(raw.sort), settings.defaultSort),
    view,
    offset: Number.isFinite(offsetValue) && offsetValue > 0 ? offsetValue : 0,
    fileId: asUuid(first(raw.file)),
  };
}

/** API query for the list endpoint; folder scoping only applies to All files. */
export function toApiQuery(view: LibraryView, mode: LibraryMode): string {
  const params = new URLSearchParams({
    sort: view.sort,
    limit: String(LIBRARY_PAGE_SIZE),
    offset: String(view.offset),
  });

  if (view.q) params.set('q', view.q);
  if (view.category) params.set('category', view.category);
  if (view.tagId) params.set('tagId', view.tagId);
  if (mode === 'favorites') params.set('favorite', 'true');
  if (mode === 'all') params.set('folderId', view.folderId ?? 'root');

  return params.toString();
}

/** URL for the same view with a few fields replaced. */
export function libraryHref(
  path: string,
  view: LibraryView,
  patch: Partial<LibraryView> = {},
): string {
  const merged = { ...view, ...patch };
  const params = new URLSearchParams();

  if (merged.q) params.set('q', merged.q);
  if (merged.category) params.set('category', merged.category);
  if (merged.tagId) params.set('tagId', merged.tagId);
  if (merged.folderId) params.set('folderId', merged.folderId);
  if (merged.sort !== DEFAULT_FILE_SORT) params.set('sort', merged.sort);
  if (merged.offset > 0) params.set('offset', String(merged.offset));
  if (merged.view !== 'grid') params.set('view', merged.view);
  if (merged.fileId) params.set('file', merged.fileId);

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export const SORT_OPTIONS: Array<{ value: FileSort; label: string }> = [
  { value: 'updated_at', label: 'Last modified' },
  { value: 'created_at', label: 'Newest first' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
  { value: 'size_desc', label: 'Largest first' },
  { value: 'size_asc', label: 'Smallest first' },
];

export const sortLabel = (sort: FileSort): string =>
  SORT_OPTIONS.find((option) => option.value === sort)?.label ?? 'Last modified';

export function findFolderTrail(
  folders: readonly FolderSummary[],
  folderId: string | null,
): FolderSummary[] {
  if (!folderId) {
    return [];
  }

  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const trail: FolderSummary[] = [];
  let cursor = byId.get(folderId);

  // Bounded walk: a corrupt cycle can never spin here.
  for (let depth = 0; cursor && depth < 64; depth += 1) {
    trail.unshift(cursor);
    cursor = cursor.parentFolderId ? byId.get(cursor.parentFolderId) : undefined;
  }

  return trail;
}

export function childFolders(
  folders: readonly FolderSummary[],
  parentId: string | null,
): FolderSummary[] {
  return folders
    .filter((folder) => folder.parentFolderId === parentId)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function folderOptionLabel(
  folders: readonly FolderSummary[],
  folderId: string,
): string {
  return findFolderTrail(folders, folderId)
    .map((folder) => folder.name)
    .join(' / ');
}

/** Self plus every descendant, used to disable invalid move targets. */
export function excludedMoveTargets(
  folders: readonly FolderSummary[],
  folderId: string,
): Set<string> {
  const excluded = new Set<string>([folderId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const folder of folders) {
      if (
        folder.parentFolderId &&
        excluded.has(folder.parentFolderId) &&
        !excluded.has(folder.id)
      ) {
        excluded.add(folder.id);
        changed = true;
      }
    }
  }
  return excluded;
}

export function activeFilterCount(view: LibraryView): number {
  return [view.q.length > 0, view.category !== null, view.tagId !== null].filter(Boolean).length;
}
