import { redirect } from 'next/navigation';
import type { LibrarySummaryResponse, MeResponse, SetupStatusResponse } from '@stackbase/contracts';
import { Badge } from '@/components/ui/Badge';
import { CategoryBento } from '@/components/dashboard/CategoryBento';
import { LibraryCard } from '@/components/dashboard/LibraryCard';
import { ServiceStatusCard } from '@/components/dashboard/ServiceStatusCard';
import { SetupProgressCard } from '@/components/dashboard/SetupProgressCard';
import { StorageSummaryCard } from '@/components/dashboard/StorageSummaryCard';
import { UnauthenticatedError, apiFetch, apiHealth } from '@/lib/api/client';

export const metadata = { title: 'Home' };

export default async function HomePage() {
  let me: MeResponse;
  let setup: SetupStatusResponse;
  let summary: LibrarySummaryResponse;

  try {
    [me, setup, summary] = await Promise.all([
      apiFetch<MeResponse>('/api/v1/me'),
      apiFetch<SetupStatusResponse>('/api/v1/setup/status'),
      apiFetch<LibrarySummaryResponse>('/api/v1/library/summary'),
    ]);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect('/sign-in');
    }
    throw error;
  }

  const health = await apiHealth().catch(() => null);

  return (
    <div className="space-y-6">
      <header className="reveal flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Overview
          </p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight sm:text-3xl">
            Your drive, at a glance
          </h1>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">
            Everything here is read from {me.user.email ?? 'your account'}&apos;s own metadata —
            categories, storage and connection health included.
          </p>
        </div>
        <Badge variant="primary" className="self-start sm:self-auto">
          Foundation build
        </Badge>
      </header>

      <CategoryBento summary={summary} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StorageSummaryCard
          bytes={setup.library.bytes}
          files={setup.library.files}
          folders={setup.library.folders}
          delay={0}
          className="sm:col-span-2 lg:col-span-2"
        />
        <SetupProgressCard storage={setup.storage} delay={60} className="sm:col-span-2 lg:col-span-4" />
        <LibraryCard
          files={setup.library.files}
          folders={setup.library.folders}
          bytes={setup.library.bytes}
          delay={120}
          className="sm:col-span-2 lg:col-span-3"
        />
        <ServiceStatusCard health={health} delay={180} className="sm:col-span-2 lg:col-span-3" />
      </div>

      <p className="text-[11px] leading-relaxed text-muted">
        StackBase never shows sample files or placeholder statistics. Empty tiles stay empty until
        your own files exist.
      </p>
    </div>
  );
}
