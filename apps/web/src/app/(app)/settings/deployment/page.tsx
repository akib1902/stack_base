import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { DeploymentSettingsResponse } from '@stackbase/contracts';
import { ExternalLink, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeading } from '@/components/ui/Card';
import { DeploymentSettingsForm } from '@/features/settings/deployment-settings-form';
import {
  ApiRequestError,
  UnauthenticatedError,
  apiFetch,
} from '@/lib/api/client';

export const metadata = { title: 'Deployment settings' };
export const dynamic = 'force-dynamic';

export default async function DeploymentSettingsPage() {
  let settings: DeploymentSettingsResponse;

  try {
    settings = await apiFetch<DeploymentSettingsResponse>('/api/v1/admin/deployment');
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect('/sign-in');
    }
    // Hide the page's existence from every non-owner account.
    if (error instanceof ApiRequestError && (error.status === 403 || error.status === 404)) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Owner configuration
          </p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight sm:text-3xl">
            Deployment integrations
          </h1>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">
            Configure the Supabase project this API trusts and the Telegram application used for
            encrypted storage. Only the instance owner can open this page.
          </p>
        </div>
        <Badge variant="primary" className="self-start">
          <LockKeyhole className="mr-1 size-3" aria-hidden="true" />
          Owner only
        </Badge>
      </header>

      <div className="rounded-card border border-primary/25 bg-primary/5 p-4">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary-ink" aria-hidden="true" />
          <div className="text-xs leading-relaxed">
            <p className="font-semibold">Secrets are write-only from this screen.</p>
            <p className="mt-1 text-muted">
              Saved values are encrypted with the API&apos;s <code className="font-mono">SETTINGS_ENCRYPTION_KEY</code>{' '}
              before they reach the database. The browser never receives a saved secret back, and
              the API never logs request bodies. This screen is not available to ordinary accounts.
            </p>
          </div>
        </div>
      </div>

      {!settings.secretStorage.configured ? (
        <div
          role="alert"
          className="rounded-card border border-warning/30 bg-warning/10 p-4 text-sm leading-relaxed"
        >
          <p className="font-semibold">Secret storage is not configured.</p>
          <p className="mt-1 text-muted">
            Add a 32-byte base64 <code className="font-mono">SETTINGS_ENCRYPTION_KEY</code> to the
            API environment and restart it before saving a JWT secret, publishable key or Telegram
            API hash. Public values can still be reviewed here.
          </p>
        </div>
      ) : null}

      <DeploymentSettingsForm initial={settings} />

      <Card>
        <CardHeading
          icon={<ShieldCheck className="size-4" />}
          title="Intentionally environment-only"
          hint="Keeping the highest-impact credentials out of every web surface"
        />
        <ul className="space-y-2 text-xs leading-relaxed text-muted">
          <li>
            <strong className="text-foreground">DATABASE_URL</strong> is read before the API can
            reach this database, so it cannot be bootstrapped from a row in that database. Change it
            through the server environment and restart.
          </li>
          <li>
            <strong className="text-foreground">Supabase service_role key</strong> is not used by
            this API. Storing a credential that bypasses row-level security would add risk without
            adding a capability.
          </li>
          <li>
            <strong className="text-foreground">AUTH_MODE</strong> stays in the server environment.
            Switching it from a form can lock out every current session before the matching sign-in
            path is configured.
          </li>
          <li>
            <strong className="text-foreground">SESSION_ENCRYPTION_KEY</strong> stays in the server
            environment because it opens every stored Telegram session. Rotating it is an operator
            migration, not a credential edit.
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-3 text-xs font-medium">
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary-ink hover:underline"
          >
            Supabase dashboard
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
          <a
            href="https://my.telegram.org"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary-ink hover:underline"
          >
            Telegram API credentials
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
          <Link href="/settings" className="text-muted hover:text-foreground hover:underline">
            Back to settings
          </Link>
        </div>
      </Card>
    </div>
  );
}
