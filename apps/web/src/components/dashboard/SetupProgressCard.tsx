import Link from 'next/link';
import type { ReactNode } from 'react';
import type { SetupStatusResponse } from '@stackbase/contracts';
import { ArrowRight, Lock, Send, ShieldCheck } from 'lucide-react';
import { Badge, StatusDot } from '@/components/ui/Badge';
import { Card, CardHeading } from '@/components/ui/Card';
import { describeStorage } from '@/features/setup/storage-status';
import { formatDateTime } from '@/lib/utils/format';

function ChecklistRow({
  icon,
  title,
  badge,
  variant,
  children,
}: {
  icon: ReactNode;
  title: string;
  badge: string;
  variant: 'success' | 'muted' | 'warning' | 'danger';
  children: ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface-raised text-foreground/80">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{title}</p>
          <Badge variant={variant}>
            <StatusDot variant={variant} />
            {badge}
          </Badge>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted">{children}</p>
      </div>
    </li>
  );
}

export function SetupProgressCard({
  storage,
  vault,
  className,
}: {
  storage: SetupStatusResponse['storage'];
  vault: SetupStatusResponse['encryption']['vault'];
  className?: string;
}) {
  const storageState = describeStorage(storage);

  return (
    <Card className={className}>
      <CardHeading
        icon={<ShieldCheck className="size-4" />}
        title="Setup"
        hint="What is ready and what still needs configuration"
        action={
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Settings
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        }
      />

      <ul className="divide-y divide-border">
        <ChecklistRow
          icon={<ShieldCheck className="size-4" aria-hidden="true" />}
          title="Account"
          badge="Ready"
          variant="success"
        >
          Signed in with a verified session token. Ownership is enforced on every query.
        </ChecklistRow>

        <ChecklistRow
          icon={<Send className="size-4" aria-hidden="true" />}
          title="Telegram storage"
          badge={storageState.label}
          variant={storageState.variant}
        >
          {storageState.detail}
          {storage.lastValidatedAt ? (
            <> Last validated {formatDateTime(storage.lastValidatedAt)}.</>
          ) : null}
        </ChecklistRow>

        <ChecklistRow
          icon={<Lock className="size-4" aria-hidden="true" />}
          title="Encryption vault"
          badge={vault === 'configured' ? 'Configured' : 'Not set up'}
          variant={vault === 'configured' ? 'success' : 'muted'}
        >
          {vault === 'configured'
            ? 'Files are encrypted in your browser with a passphrase-wrapped vault key. Unlock the vault to upload or download.'
            : 'Create a passphrase-wrapped vault in settings — every upload is encrypted in the browser first, so a vault is required before any file is stored.'}
        </ChecklistRow>
      </ul>
    </Card>
  );
}
