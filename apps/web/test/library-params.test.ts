import { describe, expect, it } from 'vitest';
import type { FolderSummary } from '@stackbase/contracts';
import {
  activeFilterCount,
  childFolders,
  excludedMoveTargets,
  findFolderTrail,
  libraryHref,
  parseLibraryView,
  toApiQuery,
} from '@/features/library/params';

const settings = { defaultView: 'grid' as const, defaultSort: 'updated_at' };

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';

const folder = (
  id: string,
  name: string,
  parentFolderId: string | null = null,
): FolderSummary => ({
  id,
  name,
  parentFolderId,
  fileCount: 0,
  folderCount: 0,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
});

describe('parseLibraryView', () => {
  it('falls back to the stored defaults and the root', () => {
    expect(parseLibraryView({}, settings)).toEqual({
      q: '',
      category: null,
      tagId: null,
      folderId: null,
      sort: 'updated_at',
      view: 'grid',
      offset: 0,
      fileId: null,
    });
  });

  it('parses every supported override', () => {
    expect(
      parseLibraryView(
        {
          q: '  report  ',
          category: 'documents',
          tagId: A,
          folderId: B,
          sort: 'size_desc',
          view: 'list',
          offset: '100',
          file: C,
        },
        settings,
      ),
    ).toEqual({
      q: 'report',
      category: 'documents',
      tagId: A,
      folderId: B,
      sort: 'size_desc',
      view: 'list',
      offset: 100,
      fileId: C,
    });
  });

  it('ignores malformed values instead of trusting them', () => {
    const parsed = parseLibraryView(
      {
        q: 'x'.repeat(300),
        category: 'executables',
        tagId: 'nope',
        folderId: '../../etc',
        sort: 'random',
        view: 'masonry',
        offset: '-5',
        file: 'x',
      },
      { defaultView: 'list', defaultSort: 'name_asc' },
    );

    expect(parsed.q).toHaveLength(200);
    expect(parsed.category).toBeNull();
    expect(parsed.tagId).toBeNull();
    expect(parsed.folderId).toBeNull();
    expect(parsed.sort).toBe('name_asc');
    expect(parsed.view).toBe('list');
    expect(parsed.offset).toBe(0);
    expect(parsed.fileId).toBeNull();
  });
});

describe('toApiQuery', () => {
  const view = parseLibraryView(
    { q: 'notes', category: 'documents', tagId: A, folderId: B, sort: 'name_asc' },
    settings,
  );

  it('scopes All files to the active folder', () => {
    const query = new URLSearchParams(toApiQuery(view, 'all'));
    expect(query.get('folderId')).toBe(B);
    expect(query.get('category')).toBe('documents');
    expect(query.get('tagId')).toBe(A);
    expect(query.get('q')).toBe('notes');
    expect(query.get('sort')).toBe('name_asc');
    expect(query.get('limit')).toBe('50');
  });

  it('uses the root when no folder is active', () => {
    const root = parseLibraryView({}, settings);
    expect(new URLSearchParams(toApiQuery(root, 'all')).get('folderId')).toBe('root');
  });

  it('never constrains Recent or Favorites to a folder', () => {
    const favorites = new URLSearchParams(toApiQuery(view, 'favorites'));
    expect(favorites.get('favorite')).toBe('true');
    expect(favorites.has('folderId')).toBe(false);

    const recent = new URLSearchParams(toApiQuery(view, 'recent'));
    expect(recent.has('favorite')).toBe(false);
    expect(recent.has('folderId')).toBe(false);
  });
});

describe('libraryHref', () => {
  const view = parseLibraryView({ folderId: A, q: 'notes', offset: '50' }, settings);

  it('omits defaults and preserves the active filters', () => {
    expect(libraryHref('/files', view, { offset: 0 })).toBe(
      `/files?q=notes&folderId=${A}`,
    );
  });

  it('writes non-default view, sort, offset and file selections', () => {
    const href = libraryHref('/files', view, {
      view: 'list',
      sort: 'size_desc',
      offset: 100,
      fileId: C,
    });
    const query = new URLSearchParams(href.split('?')[1]);
    expect(query.get('view')).toBe('list');
    expect(query.get('sort')).toBe('size_desc');
    expect(query.get('offset')).toBe('100');
    expect(query.get('file')).toBe(C);
    expect(query.get('folderId')).toBe(A);
  });

  it('can clear a filter explicitly', () => {
    const href = libraryHref('/files', view, { q: '', category: null, folderId: null });
    expect(href).not.toContain('q=');
    expect(href).not.toContain('folderId=');
  });
});

describe('folder navigation', () => {
  const folders = [folder(A, 'Projects'), folder(B, 'Design', A), folder(C, 'Artwork', B)];

  it('builds a root-to-folder trail', () => {
    expect(findFolderTrail(folders, C).map((entry) => entry.name)).toEqual([
      'Projects',
      'Design',
      'Artwork',
    ]);
    expect(findFolderTrail(folders, null)).toEqual([]);
    expect(findFolderTrail(folders, 'unknown')).toEqual([]);
  });

  it('lists only direct children of the requested parent', () => {
    expect(childFolders(folders, null).map((entry) => entry.name)).toEqual(['Projects']);
    expect(childFolders(folders, A).map((entry) => entry.name)).toEqual(['Design']);
  });

  it('excludes a folder and all of its descendants from move targets', () => {
    expect([...excludedMoveTargets(folders, A)].sort()).toEqual([A, B, C].sort());
    expect([...excludedMoveTargets(folders, B)].sort()).toEqual([B, C].sort());
    expect([...excludedMoveTargets(folders, C)]).toEqual([C]);
  });

  it('counts only content filters, not navigation', () => {
    expect(activeFilterCount(parseLibraryView({ folderId: A }, settings))).toBe(0);
    expect(
      activeFilterCount(parseLibraryView({ folderId: A, q: 'x', category: 'images' }, settings)),
    ).toBe(2);
  });
});
