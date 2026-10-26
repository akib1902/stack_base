import { LibraryPage } from '@/features/library/library-page';
import type { RawSearchParams } from '@/features/library/params';

export const metadata = { title: 'Favorites' };

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  return <LibraryPage mode="favorites" searchParams={await searchParams} />;
}
