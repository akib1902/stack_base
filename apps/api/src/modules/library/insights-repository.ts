import type {
  DuplicateGroup,
  FolderUsage,
  InsightFile,
  LibraryCategory,
  StorageInsightsResponse,
} from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { toCount, toIsoString } from '../../database/values';
import { categoryExpression } from './categories';
import { listFileSummaries } from './files-repository';
import { readCategoryTotals } from './summary-repository';

/**
 * Storage insights (FR-10): logical bytes by category, the biggest files and
 * folders, duplicate candidates and what trash and superseded versions are
 * holding. Everything is an aggregate over the caller's own rows; duplicates
 * are detected from the client-declared plaintext fingerprint, which is the
 * only content-derived value the server ever sees (A9).
 */

interface UsageRow {
  files: unknown;
  folders: unknown;
  bytes: unknown;
  trashedFiles: unknown;
  trashedFolders: unknown;
  trashedBytes: unknown;
  versions: unknown;
  versionBytes: unknown;
  tags: unknown;
}

interface FolderRow {
  id: string;
  name: string;
  files: unknown;
  bytes: unknown;
}

interface DuplicateRow extends InsightFile {
  fingerprint: string;
}

const USAGE_SQL = `
  select
    (select count(*)::int from public.files
      where user_id = $1 and deleted_at is null) as files,
    (select count(*)::int from public.folders
      where user_id = $1 and deleted_at is null) as folders,
    (select coalesce(sum(logical_size_bytes), 0)::bigint from public.files
      where user_id = $1 and deleted_at is null) as bytes,
    (select count(*)::int from public.files
      where user_id = $1 and deleted_at is not null) as "trashedFiles",
    (select count(*)::int from public.folders
      where user_id = $1 and deleted_at is not null) as "trashedFolders",
    (select coalesce(sum(logical_size_bytes), 0)::bigint from public.files
      where user_id = $1 and deleted_at is not null) as "trashedBytes",
    (select count(*)::int from public.file_versions where user_id = $1) as versions,
    (select coalesce(sum(v.size_bytes), 0)::bigint
       from public.file_versions v
       join public.files f on f.id = v.file_id and f.user_id = v.user_id
      where v.user_id = $1 and f.deleted_at is null
        and f.current_version_id is distinct from v.id) as "versionBytes",
    (select count(*)::int from public.tags where user_id = $1) as tags`;

const LARGEST_FOLDERS_SQL = `
  select fo.id, fo.name,
         count(f.id)::int as files,
         coalesce(sum(f.logical_size_bytes), 0)::bigint as bytes
    from public.folders fo
    left join public.files f
      on f.folder_id = fo.id and f.user_id = fo.user_id and f.deleted_at is null
   where fo.user_id = $1 and fo.deleted_at is null
   group by fo.id, fo.name
  having count(f.id) > 0
   order by bytes desc, fo.name asc
   limit 10`;

/** Only fingerprints shared by two or more live files; capped so one bulk copy cannot flood the view. */
const DUPLICATE_SQL = `
  select f.id, f.name, ${categoryExpression('f')} as category,
         f.logical_size_bytes as "sizeBytes",
         f.updated_at as "updatedAt",
         f.content_fingerprint as fingerprint
    from public.files f
   where f.user_id = $1 and f.deleted_at is null
     and f.content_fingerprint is not null
     and f.content_fingerprint in (
       select content_fingerprint from public.files
        where user_id = $1 and deleted_at is null and content_fingerprint is not null
        group by content_fingerprint
       having count(*) > 1
        order by sum(logical_size_bytes) desc
        limit 10
     )
   order by f.content_fingerprint, f.logical_size_bytes desc
   limit 200`;

function groupDuplicates(rows: DuplicateRow[]): DuplicateGroup[] {
  const byFingerprint = new Map<string, InsightFile[]>();
  for (const row of rows) {
    const file: InsightFile = {
      id: row.id,
      name: row.name,
      category: row.category as LibraryCategory | null,
      sizeBytes: toCount(row.sizeBytes),
      updatedAt: toIsoString(row.updatedAt),
    };
    const bucket = byFingerprint.get(row.fingerprint);
    if (bucket) bucket.push(file);
    else byFingerprint.set(row.fingerprint, [file]);
  }

  return [...byFingerprint.entries()]
    .map(([fingerprint, files]) => {
      const sizeBytes = Math.max(...files.map((file) => file.sizeBytes));
      return {
        fingerprint,
        sizeBytes,
        wastedBytes: sizeBytes * Math.max(0, files.length - 1),
        files,
      };
    })
    .sort((a, b) => b.wastedBytes - a.wastedBytes || b.files.length - a.files.length)
    .slice(0, 10);
}

export async function getStorageInsights(db: Db, userId: string): Promise<StorageInsightsResponse> {
  const [usage, categories, largestFiles, folders, duplicates] = await Promise.all([
    db.query<UsageRow>(USAGE_SQL, [userId]),
    readCategoryTotals(db, userId),
    listFileSummaries(db, userId, { sort: 'size_desc', limit: 10 }),
    db.query<FolderRow>(LARGEST_FOLDERS_SQL, [userId]),
    db.query<DuplicateRow>(DUPLICATE_SQL, [userId]),
  ]);

  const totalsRow = usage.rows[0];

  return {
    totals: {
      files: toCount(totalsRow?.files),
      folders: toCount(totalsRow?.folders),
      bytes: toCount(totalsRow?.bytes),
      trashedFiles: toCount(totalsRow?.trashedFiles),
      trashedFolders: toCount(totalsRow?.trashedFolders),
      trashedBytes: toCount(totalsRow?.trashedBytes),
      versions: toCount(totalsRow?.versions),
      versionBytes: toCount(totalsRow?.versionBytes),
      tags: toCount(totalsRow?.tags),
    },
    categories,
    largestFiles: largestFiles.map((file) => ({
      id: file.id,
      name: file.name,
      category: file.category,
      sizeBytes: file.sizeBytes,
      updatedAt: file.updatedAt,
    })),
    largestFolders: folders.rows.map<FolderUsage>((row) => ({
      id: row.id,
      name: row.name,
      files: toCount(row.files),
      bytes: toCount(row.bytes),
    })),
    duplicateGroups: groupDuplicates(duplicates.rows),
    generatedAt: new Date().toISOString(),
  };
}