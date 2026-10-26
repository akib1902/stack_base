import type { LibraryCategory } from '@stackbase/contracts';

/**
 * Category classification is a single SQL expression so the bento tiles, the
 * category filter and the summary endpoint can never disagree.
 *
 * The expression is fixed SQL built from a caller-supplied alias; no user input
 * is interpolated into it.
 */
export function categoryExpression(alias: string): string {
  const ext = `ltrim(lower(coalesce(${alias}.extension, '')), '.')`;
  const mime = `lower(coalesce(${alias}.mime_type, ''))`;

  return `(
    case
      when ${mime} like 'image/%' then 'images'
      when ${mime} like 'video/%' then 'videos'
      when ${mime} like 'audio/%' then 'audio'
      when ${mime} = 'application/vnd.android.package-archive' or ${ext} = 'apk' then 'apks'
      when ${mime} = 'application/pdf' or ${mime} like 'text/%' then 'documents'
      when ${mime} like 'application/vnd.openxmlformats-officedocument.%'
        or ${mime} like 'application/vnd.oasis.opendocument.%'
        or ${mime} = 'application/msword'
        or ${mime} = 'application/rtf'
        or ${mime} = 'application/epub+zip' then 'documents'
      when ${mime} like 'application/zip' or ${mime} like 'application/x-tar' then 'archives'
      when ${mime} = 'application/x-msdownload' or ${mime} = 'application/x-apple-diskimage' then 'apps'
      when ${ext} in ('zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz', 'zst', 'cab') then 'archives'
      when ${ext} in ('exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm', 'appimage', 'app') then 'apps'
      when ${ext} in ('iso', 'img', 'torrent', 'part', 'crdownload', 'bin') then 'downloads'
      when ${ext} in (
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md',
        'csv', 'tsv', 'rtf', 'odt', 'ods', 'odp', 'epub', 'json', 'xml',
        'yaml', 'yml', 'log'
      ) then 'documents'
      else 'other'
    end
  )`;
}

export interface CategoryAggregate {
  files: number;
  bytes: number;
}

export const EMPTY_CATEGORY: CategoryAggregate = { files: 0, bytes: 0 };

export type CategoryTotals = Record<LibraryCategory, CategoryAggregate>;
