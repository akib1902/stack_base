'use client';

import { useActionState } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { signInAction } from './actions';
import { initialSignInState } from './sign-in-state';

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialSignInState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          aria-describedby={state.error ? 'signin-error signin-hint' : 'signin-hint'}
          aria-invalid={state.error ? true : undefined}
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted/70 focus-visible:border-primary"
        />
        <p id="signin-hint" className="mt-1.5 text-xs leading-relaxed text-muted">
          Local development identity. Any address creates or resumes an account on
          this machine&apos;s database.
        </p>
      </div>

      <div aria-live="polite">
        {state.error ? (
          <p
            id="signin-error"
            role="alert"
            className="rounded-xl border border-error/25 bg-error/10 px-3 py-2 text-sm text-error"
          >
            {state.error}
          </p>
        ) : null}
      </div>

      <Button className="w-full" disabled={pending}>
        {pending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Signing in…
          </>
        ) : (
          <>
            Continue
            <ArrowRight className="size-4" aria-hidden="true" />
          </>
        )}
      </Button>
    </form>
  );
}
