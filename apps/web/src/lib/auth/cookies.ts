/** Cookie names and options shared by server code and the Next.js proxy. */

export const SESSION_COOKIE = 'stackbase_session';
export const REFRESH_COOKIE = 'stackbase_refresh';
export const REFRESH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function sessionCookieOptions(expiresAt: string) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expiresAt),
  };
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: REFRESH_MAX_AGE_SECONDS,
  };
}