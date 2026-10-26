import { LibraryPage } from '@/features/library/library-page';
import type { RawSearchParams } from '@/features/library/params';

export const metadata = { title: 'All files' };

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  return <LibraryPage mode="all" searchParams={await searchParams} />;
}
