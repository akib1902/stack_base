import { redirect } from 'next/navigation';
import type { AuthConfigResponse, MeResponse } from '@stackbase/contracts';
import { SignInForm } from '@/features/auth/sign-in-form';
import {
  ApiUnavailableError,
  UnauthenticatedError,
  apiFetch,
  apiFetchPublic,
} from '@/lib/api/client';
import { getSessionToken } from '@/lib/auth/session';

export const metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

function SignInUnavailable({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-[0_1px_2px_rgba(20,16,10,0.04)]">
      <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm font-medium text-error">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{detail}</p>
      <a
        href="/sign-in"
        className="mt-4 inline-flex text-sm font-medium text-primary-ink hover:underline"
      >
        Try again
      </a>
    </div>
  );
}

export default async function SignInPage() {
  let config: AuthConfigResponse;
  try {
    config = await apiFetchPublic<AuthConfigResponse>('/api/v1/auth/config');
  } catch {
    return (
      <SignInUnavailable
        title="The sign-in service is unavailable."
        detail="The API could not be reached. Check the deployment and try again."
      />
    );
  }

  const token = await getSessionToken();
  if (token) {
    try {
      await apiFetch<MeResponse>('/api/v1/me');
      redirect('/');
    } catch (error) {
      if (!(error instanceof UnauthenticatedError)) {
        if (error instanceof ApiUnavailableError) {
          return (
            <SignInUnavailable
              title="The sign-in service is unavailable."
              detail="The API could not be reached. Check the deployment and try again."
            />
          );
        }
        throw error;
      }
    }
  }

  if (config.mode === 'supabase' && !config.supabaseReady) {
    return (
      <SignInUnavailable
        title="Supabase sign-in is not configured."
        detail="The instance owner needs to add the project URL and publishable key in Deployment settings."
      />
    );
  }

  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-[0_1px_2px_rgba(20,16,10,0.04)]">
      <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        {config.mode === 'supabase'
          ? 'Use the email and password for your Supabase account.'
          : 'Open this StackBase instance with your email address.'}
      </p>
      <div className="mt-5">
        <SignInForm mode={config.mode} />
      </div>
      <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted">
        {config.mode === 'supabase'
          ? 'Supabase Auth. Your session is kept in httpOnly cookies; no access token is exposed to browser JavaScript.'
          : 'Development sign-in. Deployments use Supabase Auth; this endpoint is disabled in production.'}
      </p>
    </div>
  );
}
