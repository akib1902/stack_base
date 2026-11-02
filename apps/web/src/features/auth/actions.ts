'use server';

import { redirect } from 'next/navigation';
import type {
  AuthConfigResponse,
  DevSessionResponse,
  SupabaseSessionResponse,
} from '@stackbase/contracts';
import {
  ApiRequestError,
  apiFetchPublic,
  apiFetchStream,
} from '@/lib/api/client';
import {
  clearAuthCookies,
  setSessionCookie,
  setSupabaseSessionCookies,
} from '@/lib/auth/session';
import type { SignInState } from './sign-in-state';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNREACHABLE = 'The API is unreachable. Check that it is running and try again.';

export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim();

  if (!EMAIL_PATTERN.test(email)) {
    return { error: 'Enter a valid email address.' };
  }

  let config: AuthConfigResponse;
  try {
    config = await apiFetchPublic<AuthConfigResponse>('/api/v1/auth/config');
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { error: error.message };
    }
    return { error: UNREACHABLE };
  }

  if (config.mode === 'supabase') {
    if (!config.supabaseReady) {
      return {
        error:
          'Supabase sign-in is not configured. The instance owner must add the publishable key in Deployment settings.',
      };
    }
    const password = String(formData.get('password') ?? '');
    if (!password) return { error: 'Enter your password.' };

    let session: SupabaseSessionResponse;
    try {
      session = await apiFetchPublic<SupabaseSessionResponse>(
        '/api/v1/auth/supabase/sign-in',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
      );
    } catch (error) {
      if (error instanceof ApiRequestError) return { error: error.message };
      return { error: UNREACHABLE };
    }

    await setSupabaseSessionCookies(session);
    redirect('/');
  }

  // AUTH_MODE=dev: the API issues a short-lived local session for this email.
  let session: DevSessionResponse;
  try {
    session = await apiFetchPublic<DevSessionResponse>('/api/v1/dev/session', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  } catch (error) {
    if (error instanceof ApiRequestError) return { error: error.message };
    return { error: UNREACHABLE };
  }

  await setSessionCookie(session.accessToken, session.expiresAt);
  redirect('/');
}

export async function signOutAction(): Promise<void> {
  try {
    await apiFetchStream('/api/v1/auth/supabase/sign-out', { method: 'POST' });
  } catch {
    // Local cookie removal is the reliable part of sign-out.
  }
  await clearAuthCookies();
  redirect('/sign-in');
}
