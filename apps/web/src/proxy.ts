import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseSessionResponse } from '@stackbase/contracts';
import {
  REFRESH_COOKIE,
  SESSION_COOKIE,
  refreshCookieOptions,
  sessionCookieOptions,
} from '@/lib/auth/cookies';
import { tokenExpiresWithin } from '@/lib/auth/token';

const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '');

function signInRedirect(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL('/sign-in', request.url));
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}

/**
 * Supabase access tokens are short-lived. Refresh them before rendering an app
 * route, then forward the new cookies both to this request's server components
 * and to the browser.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const accessToken = request.cookies.get(SESSION_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!refreshToken || (accessToken && !tokenExpiresWithin(accessToken, 60))) {
    return NextResponse.next();
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/api/v1/auth/supabase/refresh`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Let the page's error boundary surface an API outage; do not destroy a
    // potentially recoverable refresh token because the API is briefly down.
    return NextResponse.next();
  }

  if (upstream.status === 401 || upstream.status === 403) {
    return signInRedirect(request);
  }
  if (!upstream.ok) return NextResponse.next();

  let session: SupabaseSessionResponse;
  try {
    session = (await upstream.json()) as SupabaseSessionResponse;
  } catch {
    return signInRedirect(request);
  }
  if (!session.accessToken || !session.refreshToken || !session.expiresAt) {
    return signInRedirect(request);
  }

  request.cookies.set(SESSION_COOKIE, session.accessToken);
  request.cookies.set(REFRESH_COOKIE, session.refreshToken);
  const headers = new Headers(request.headers);
  headers.set(
    'cookie',
    request.cookies
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join('; '),
  );

  const response = NextResponse.next({ request: { headers } });
  response.cookies.set(
    SESSION_COOKIE,
    session.accessToken,
    sessionCookieOptions(session.expiresAt),
  );
  response.cookies.set(REFRESH_COOKIE, session.refreshToken, refreshCookieOptions());
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|offline.html|sw.js|icons|sign-in|s/).*)',
  ],
};