import type { HealthResponse } from '@stackbase/contracts';
import { Activity, Database } from 'lucide-react';
import { Badge, StatusDot } from '@/components/ui/Badge';
import { Card, CardHeading } from '@/components/ui/Card';
import { formatDuration } from '@/lib/utils/format';

export function ServiceStatusCard({
  health,
  className,
}: {
  health: HealthResponse | null;
  className?: string;
}) {
  const apiVariant = health?.status === 'ok' ? 'success' : health ? 'warning' : 'danger';
  const databaseVariant = health?.database === 'ok' ? 'success' : 'danger';

  return (
    <Card className={className}>
      <CardHeading
        icon={<Activity className="size-4" />}
        title="Service status"
        hint="Checked on every page load — nothing is cached or simulated"
      />

      <ul className="space-y-3">
        <li className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm">
            <Activity className="size-4 text-muted" aria-hidden="true" />
            API
          </span>
          <Badge variant={apiVariant}>
            <StatusDot variant={apiVariant} />
            {health ? (health.status === 'ok' ? 'Healthy' : 'Degraded') : 'Unreachable'}
          </Badge>
        </li>
        <li className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm">
            <Database className="size-4 text-muted" aria-hidden="true" />
            Database
          </span>
          <Badge variant={databaseVariant}>
            <StatusDot variant={databaseVariant} />
            {health?.database === 'ok' ? 'Reachable' : 'Unavailable'}
          </Badge>
        </li>
      </ul>

      <div className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted">
        {health ? (
          <>
            API v{health.version} · up {formatDuration(health.uptimeSeconds)}
          </>
        ) : (
          <>Start the API with pnpm dev:api to see live status.</>
        )}
      </div>
    </Card>
  );
}
