'use client';

import { useEffect, useMemo } from 'react';
import type { FileSummary, FolderSummary, TagListItem } from '@stackbase/contracts';
import {
  mirrorLibrary,
  type CachedFile,
  type CachedFolder,
  type CachedTag,
} from './metadata-cache';
import { useOffline } from './offline-context';

export interface LibraryData {
  files: readonly FileSummary[];
  folders: readonly FolderSummary[];
  tags: readonly TagListItem[];
}

export interface ProjectedLibrary {
  files: CachedFile[];
  folders: CachedFolder[];
  tags: CachedTag[];
}

/** Projects the API shapes down to the fields the offline shell renders. */
export function projectLibrary(data: LibraryData): ProjectedLibrary {
  return {
    files: data.files.map((file) => ({
      id: file.id,
      name: file.name,
      sizeBytes: file.sizeBytes,
      updatedAt: file.updatedAt,
      folderId: file.folderId ?? null,
    })),
    folders: data.folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      parentFolderId: folder.parentFolderId ?? null,
    })),
    tags: data.tags.map((tag) => ({ id: tag.id, name: tag.name })),
  };
}

/**
 * Mirrors the library metadata this screen was served into IndexedDB, so an
 * offline navigation can still show the account's files (SRS C8).
 *
 * The snapshot is compared as JSON so a re-render with identical data does not
 * rewrite the record, and the mirror is skipped entirely when the account has
 * offline metadata turned off.
 */
export function useMetadataMirror(data: LibraryData): void {
  const { userId, offlineEnabled } = useOffline();
  const snapshot = useMemo(() => projectLibrary(data), [data]);
  const key = JSON.stringify(snapshot);

  useEffect(() => {
    if (!offlineEnabled) return;
    void mirrorLibrary(userId, JSON.parse(key) as ProjectedLibrary);
  }, [key, offlineEnabled, userId]);
}
