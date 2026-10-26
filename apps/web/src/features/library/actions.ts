'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type {
  BulkFileRequest,
  CreateFolderRequest,
  CreateTagRequest,
  FileSummary,
  FolderSummary,
  SearchResponse,
  TagListItem,
  UpdateFileRequest,
  UpdateFolderRequest,
  UpdateTagRequest,
  UserSettings,
  UserSettingsUpdate,
} from '@stackbase/contracts';
import { ApiRequestError, UnauthenticatedError, apiFetch } from '@/lib/api/client';

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; message: string };

const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
const fail = (message: string): ActionResult<never> => ({ ok: false, message });

function describeError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return 'The change could not be applied. Check your connection and try again.';
}

async function mutate<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    // One refresh for every affected surface; the caller also refreshes its route.
    revalidatePath('/', 'layout');
    return ok(data);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect('/sign-in');
    }
    return fail(describeError(error));
  }
}

type Method = 'POST' | 'PATCH' | 'PUT' | 'DELETE';

const send = <T>(path: string, method: Method, body?: unknown): Promise<T> =>
  apiFetch<T>(path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

export async function updateFileAction(
  fileId: string,
  input: UpdateFileRequest,
): Promise<ActionResult<FileSummary>> {
  return mutate(() => send<FileSummary>(`/api/v1/files/${fileId}`, 'PATCH', input));
}

export async function setFileTagsAction(
  fileId: string,
  tagIds: string[],
): Promise<ActionResult<FileSummary>> {
  return mutate(() => send<FileSummary>(`/api/v1/files/${fileId}/tags`, 'PUT', { tagIds }));
}

export async function bulkFileAction(
  input: BulkFileRequest,
): Promise<ActionResult<number>> {
  return mutate(async () => {
    const result = await send<{ affected: number }>('/api/v1/files/bulk', 'POST', input);
    return result.affected;
  });
}

export async function trashFileAction(fileId: string): Promise<ActionResult<number>> {
  return mutate(async () => {
    const result = await send<{ affected: number }>(`/api/v1/files/${fileId}`, 'DELETE');
    return result.affected;
  });
}

export async function createFolderAction(
  input: CreateFolderRequest,
): Promise<ActionResult<FolderSummary>> {
  return mutate(() => send<FolderSummary>('/api/v1/folders', 'POST', input));
}

export async function updateFolderAction(
  folderId: string,
  input: UpdateFolderRequest,
): Promise<ActionResult<FolderSummary>> {
  return mutate(() => send<FolderSummary>(`/api/v1/folders/${folderId}`, 'PATCH', input));
}

export async function trashFolderAction(folderId: string): Promise<ActionResult<number>> {
  return mutate(async () => {
    const result = await send<{ affected: number }>(`/api/v1/folders/${folderId}`, 'DELETE');
    return result.affected;
  });
}

export async function restoreTrashAction(
  kind: 'file' | 'folder',
  id: string,
): Promise<ActionResult<number>> {
  return mutate(async () => {
    const result = await send<{ affected: number }>(
      `/api/v1/trash/${kind === 'file' ? 'files' : 'folders'}/${id}/restore`,
      'POST',
    );
    return result.affected;
  });
}

export async function purgeTrashAction(
  kind: 'file' | 'folder',
  id: string,
): Promise<ActionResult<number>> {
  return mutate(async () => {
    const result = await send<{ affected: number }>(
      `/api/v1/trash/${kind === 'file' ? 'files' : 'folders'}/${id}`,
      'DELETE',
    );
    return result.affected;
  });
}

export async function createTagAction(
  input: CreateTagRequest,
): Promise<ActionResult<TagListItem>> {
  return mutate(() => send<TagListItem>('/api/v1/tags', 'POST', input));
}

export async function updateTagAction(
  tagId: string,
  input: UpdateTagRequest,
): Promise<ActionResult<undefined>> {
  return mutate(async () => {
    await send(`/api/v1/tags/${tagId}`, 'PATCH', input);
    return undefined;
  });
}

export async function deleteTagAction(tagId: string): Promise<ActionResult<undefined>> {
  return mutate(async () => {
    await send(`/api/v1/tags/${tagId}`, 'DELETE');
    return undefined;
  });
}

export async function updateSettingsAction(
  patch: UserSettingsUpdate,
): Promise<ActionResult<UserSettings>> {
  return mutate(() => send<UserSettings>('/api/v1/me/settings', 'PATCH', patch));
}

/** Read-only action for the command palette. */
export async function searchLibraryAction(query: string): Promise<SearchResponse | null> {
  try {
    return await apiFetch<SearchResponse>(`/api/v1/search?q=${encodeURIComponent(query)}`);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect('/sign-in');
    }
    return null;
  }
}
