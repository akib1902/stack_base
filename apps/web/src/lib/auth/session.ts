import { cookies } from 'next/headers';
import type { SupabaseSessionResponse } from '@stackbase/contracts';
import {
  REFRESH_COOKIE,
  SESSION_COOKIE,
  refreshCookieOptions,
  sessionCookieOptions,
} from './cookies';

/**
 * The access token lives in an httpOnly cookie so no script (including any
 * preview/third-party code) can read it. It is only ever attached by the server
 * when talking to the API.
 */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionCookie(token: string, expiresAt: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
}

export async function setRefreshCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(REFRESH_COOKIE, token, refreshCookieOptions());
}

export async function setSupabaseSessionCookies(
  session: SupabaseSessionResponse,
): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, session.accessToken, sessionCookieOptions(session.expiresAt));
  store.set(REFRESH_COOKIE, session.refreshToken, refreshCookieOptions());
}

export async function getRefreshToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(REFRESH_COOKIE);
}
