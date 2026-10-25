'use server';

import { redirect } from 'next/navigation';
import type { DevSessionResponse } from '@stackbase/contracts';
import { ApiRequestError, apiFetchPublic } from '@/lib/api/client';
import { clearSessionCookie, setSessionCookie } from '@/lib/auth/session';
import type { SignInState } from './sign-in-state';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Local development sign-in. The API issues a short-lived session for the email;
 * production deployments use Supabase Auth and never reach this action.
 */
export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim();

  if (!EMAIL_PATTERN.test(email)) {
    return { error: 'Enter a valid email address.' };
  }

  let session: DevSessionResponse;
  try {
    session = await apiFetchPublic<DevSessionResponse>('/api/v1/dev/session', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { error: error.message };
    }
    return {
      error: 'The API is unreachable. Start it with "pnpm dev:api" and try again.',
    };
  }

  await setSessionCookie(session.accessToken, session.expiresAt);
  redirect('/');
}

export async function signOutAction(): Promise<void> {
  await clearSessionCookie();
  redirect('/sign-in');
}
