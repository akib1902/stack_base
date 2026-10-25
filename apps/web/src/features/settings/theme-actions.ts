'use server';

import { revalidatePath } from 'next/cache';
import { isTheme, writeTheme } from '@/lib/theme';

export async function setThemeAction(formData: FormData): Promise<void> {
  const theme = formData.get('theme');
  if (!isTheme(theme)) {
    return;
  }

  await writeTheme(theme);
  // The theme is applied in the root layout, so refresh every route.
  revalidatePath('/', 'layout');
}
