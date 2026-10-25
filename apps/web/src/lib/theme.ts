import { cookies } from 'next/headers';

export type Theme = 'amber' | 'graphite';

const THEME_COOKIE = 'stackbase_theme';
const THEME_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const isTheme = (value: unknown): value is Theme =>
  value === 'amber' || value === 'graphite';

/**
 * Theme is a per-browser preference until account settings sync ships, so a
 * cookie is the source of truth and no flash-of-wrong-theme can occur.
 */
export async function readTheme(): Promise<Theme> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : 'amber';
}

export async function writeTheme(theme: Theme): Promise<void> {
  const store = await cookies();
  store.set(THEME_COOKIE, theme, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: THEME_MAX_AGE_SECONDS,
  });
}
