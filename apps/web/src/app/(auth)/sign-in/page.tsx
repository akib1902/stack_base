import { redirect } from 'next/navigation';
import { SignInForm } from '@/features/auth/sign-in-form';
import { getSessionToken } from '@/lib/auth/session';

export const metadata = { title: 'Sign in' };

export default async function SignInPage() {
  const token = await getSessionToken();
  if (token) {
    redirect('/');
  }

  return (
    <div className="rounded-card border border-border bg-surface p-6 shadow-[0_1px_2px_rgba(20,16,10,0.04)]">
      <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Open this StackBase instance with your email address.
      </p>
      <div className="mt-5">
        <SignInForm />
      </div>
      <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted">
        Development sign-in. Deployments use Supabase Auth; this endpoint is disabled in
        production.
      </p>
    </div>
  );
}
