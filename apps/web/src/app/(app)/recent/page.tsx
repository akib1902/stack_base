import { LibraryPage } from '@/features/library/library-page';
import type { RawSearchParams } from '@/features/library/params';

export const metadata = { title: 'Recent' };

export default async function RecentPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  return <LibraryPage mode="recent" searchParams={await searchParams} />;
}
