import { redirect } from 'next/navigation';
import type {
  LibrarySummaryResponse,
  MeResponse,
  SetupStatusResponse,
} from '@stackbase/contracts';
import { Badge } from '@/components/ui/Badge';
import { CategoryBento } from '@/components/dashboard/CategoryBento';
import { FilesMiniCard } from '@/components/dashboard/FilesMiniCard';
import { ServiceStatusCard } from '@/components/dashboard/ServiceStatusCard';
import { SetupProgressCard } from '@/components/dashboard/SetupProgressCard';
import { StorageSummaryCard } from '@/components/dashboard/StorageSummaryCard';
import { TrashCard } from '@/components/dashboard/TrashCard';
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
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Overview
          </p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight sm:text-3xl">
            Your drive, at a glance
          </h1>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">
            Live metadata for {me.user.email ?? 'your account'}, organized by category and
            ready for encrypted uploads.
          </p>
        </div>
        <Badge variant="primary" className="self-start sm:self-auto">
          Metadata build
        </Badge>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
        <StorageSummaryCard
          bytes={summary.totals.bytes}
          files={summary.totals.files}
          folders={summary.totals.folders}
          className="sm:col-span-2 lg:col-span-3"
        />
        <SetupProgressCard
          storage={setup.storage}
          className="sm:col-span-2 lg:col-span-5"
        />
        <TrashCard
          totals={summary.totals}
          retentionDays={me.settings.trashRetentionDays}
          className="sm:col-span-2 lg:col-span-4"
        />
        <CategoryBento
          categories={summary.categories}
          totalFiles={summary.totals.files}
          className="sm:col-span-2 lg:col-span-12"
        />
        <FilesMiniCard
          kind="recent"
          files={summary.recent}
          className="sm:col-span-2 lg:col-span-7"
        />
        <FilesMiniCard
          kind="largest"
          files={summary.largest}
          className="sm:col-span-2 lg:col-span-5"
        />
        <ServiceStatusCard health={health} className="sm:col-span-2 lg:col-span-12" />
      </div>

      <p className="text-[11px] leading-relaxed text-muted">
        Every number on this page is read from your own database. StackBase never shows sample
        files or placeholder statistics.
      </p>
    </div>
  );
}
