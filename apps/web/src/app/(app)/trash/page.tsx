import { redirect } from 'next/navigation';
import type { TrashListResponse } from '@stackbase/contracts';
import { TrashView } from '@/components/library/TrashView';
import { UnauthenticatedError, apiFetch } from '@/lib/api/client';

export const metadata = { title: 'Trash' };

export default async function TrashPage() {
  let trash: TrashListResponse;

  try {
    trash = await apiFetch<TrashListResponse>('/api/v1/trash');
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect('/sign-in');
    }
    throw error;
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Library
        </p>
        <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight sm:text-3xl">
          Trash
        </h1>
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">
          Deleted files and folders stay recoverable here. Nothing is purged from storage
          behind your back.
        </p>
      </header>

      <TrashView items={trash.items} retentionDays={trash.retentionDays} />
    </div>
  );
}
