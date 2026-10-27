import { redirect } from 'next/navigation';
import type { StorageInsightsResponse } from '@stackbase/contracts';
import { Copy, Files, HardDrive, Layers, Tag, Trash2 } from 'lucide-react';
import { Card, CardHeading } from '@/components/ui/Card';
import { CATEGORY_META } from '@/features/library/category-meta';
import { UnauthenticatedError, apiFetch } from '@/lib/api/client';
import { formatBytes, formatDateTime } from '@/lib/utils/format';

export const metadata = { title: 'Storage insights' };

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised/50 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted">
        <span className="text-primary">{icon}</span>
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export default async function InsightsPage() {
  let insights: StorageInsightsResponse;

  try {
    insights = await apiFetch<StorageInsightsResponse>('/api/v1/insights');
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect('/sign-in');
    }
    throw error;
  }

  const { totals, categories, largestFiles, largestFolders, duplicateGroups } = insights;
  const maxCategoryBytes = Math.max(1, ...categories.map((entry) => entry.bytes));
  const duplicatedBytes = duplicateGroups.reduce((sum, group) => sum + group.wastedBytes, 0);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Library
        </p>
        <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight sm:text-3xl">
          Storage insights
        </h1>
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">
          All figures are aggregates over your own rows, computed just for you. Logical size is
          what your files add up to; what the provider physically stores can differ, because
          encrypted uploads add a small per-file overhead and Telegram compresses some media.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={<Files className="size-3.5" />} label="Files" value={String(totals.files)} />
        <StatTile icon={<HardDrive className="size-3.5" />} label="Logical size" value={formatBytes(totals.bytes)} />
        <StatTile icon={<Layers className="size-3.5" />} label="Folders" value={String(totals.folders)} />
        <StatTile icon={<Tag className="size-3.5" />} label="Tags" value={String(totals.tags)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeading
            icon={<HardDrive className="size-4" />}
            title="Category distribution"
            hint="Live files only; empty categories are omitted here"
          />
          <ul className="space-y-3">
            {categories
              .filter((entry) => entry.files > 0)
              .sort((a, b) => b.bytes - a.bytes)
              .map((entry) => (
                <li key={entry.category}>
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="font-medium">{CATEGORY_META[entry.category].label}</span>
                    <span className="text-muted">
                      {formatBytes(entry.bytes)} · {entry.files}{' '}
                      {entry.files === 1 ? 'file' : 'files'}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={maxCategoryBytes}
                    aria-valuenow={entry.bytes}
                    aria-label={`${CATEGORY_META[entry.category].label} share`}
                    className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-raised"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(2, Math.round((entry.bytes / maxCategoryBytes) * 100))}%` }}
                    />
                  </div>
                </li>
              ))}
            {categories.every((entry) => entry.files === 0) ? (
              <li className="text-xs text-muted">No files yet.</li>
            ) : null}
          </ul>
        </Card>

        <Card>
          <CardHeading
            icon={<Trash2 className="size-4" />}
            title="Trash and versions"
            hint="Space that is neither deleted for good nor part of your current files"
          />
          <dl className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
              <dt className="text-muted">Trashed files</dt>
              <dd className="font-medium">
                {totals.trashedFiles} · {formatBytes(totals.trashedBytes)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
              <dt className="text-muted">Trashed folders</dt>
              <dd className="font-medium">{totals.trashedFolders}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
              <dt className="text-muted">Stored versions</dt>
              <dd className="font-medium">{totals.versions}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Superseded version bytes</dt>
              <dd className="font-medium">{formatBytes(totals.versionBytes)}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeading
            icon={<Files className="size-4" />}
            title="Largest files"
            hint="Top 10 by logical size"
          />
          {largestFiles.length === 0 ? (
            <p className="text-xs text-muted">No files yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {largestFiles.map((file) => (
                <li key={file.id} className="flex items-center justify-between gap-3 py-2">
                  <a
                    href={`/files?file=${encodeURIComponent(file.id)}`}
                    className="min-w-0 truncate text-xs font-medium hover:text-primary"
                    title={file.name}
                  >
                    {file.name}
                  </a>
                  <span className="shrink-0 text-[11px] text-muted">
                    {formatBytes(file.sizeBytes)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeading
            icon={<Layers className="size-4" />}
            title="Largest folders"
            hint="By the size of the files directly inside"
          />
          {largestFolders.length === 0 ? (
            <p className="text-xs text-muted">No folders with files yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {largestFolders.map((folder) => (
                <li key={folder.id} className="flex items-center justify-between gap-3 py-2">
                  <a
                    href={`/files?folderId=${encodeURIComponent(folder.id)}`}
                    className="min-w-0 truncate text-xs font-medium hover:text-primary"
                    title={folder.name}
                  >
                    {folder.name}
                  </a>
                  <span className="shrink-0 text-[11px] text-muted">
                    {formatBytes(folder.bytes)} · {folder.files}{' '}
                    {folder.files === 1 ? 'file' : 'files'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeading
          icon={<Copy className="size-4" />}
          title="Duplicate candidates"
          hint={
            duplicatedBytes > 0
              ? `${formatBytes(duplicatedBytes)} could be freed by keeping one copy of each`
              : 'Files with identical content, detected from the fingerprint you signed at upload'
          }
        />
        {duplicateGroups.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted">
            No two live files share the same content fingerprint. Because every file is encrypted
            separately, only the client-side fingerprint can reveal duplication — the server never
            sees the plaintext it was computed from.
          </p>
        ) : (
          <ul className="space-y-3">
            {duplicateGroups.map((group) => (
              <li key={group.fingerprint} className="rounded-xl border border-border px-3 py-2.5">
                <p className="text-xs font-medium">
                  {group.files.length} copies of {formatBytes(group.sizeBytes)} ·{' '}
                  <span className="text-muted">{formatBytes(group.wastedBytes)} wasted</span>
                </p>
                <ul className="mt-1.5 space-y-1">
                  {group.files.map((file) => (
                    <li key={file.id} className="flex items-center justify-between gap-3">
                      <a
                        href={`/files?file=${encodeURIComponent(file.id)}`}
                        className="min-w-0 truncate text-[11px] text-muted hover:text-primary"
                        title={file.name}
                      >
                        {file.name}
                      </a>
                      <span className="shrink-0 text-[10px] text-muted">
                        {formatDateTime(file.updatedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Generated {formatDateTime(insights.generatedAt)} from your own database. Figures describe
          logical metadata, not what any provider physically stores.
        </p>
      </Card>
    </div>
  );
}