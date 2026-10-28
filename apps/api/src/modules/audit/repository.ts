import type { AuditEvent, AuditResult } from '@stackbase/contracts';
import type { Db, Queryable } from '../../database/db';
import { toIsoString } from '../../database/values';

/**
 * Append-only audit trail (FR-13). Callers pass no secrets: no raw share token,
 * password, key, plaintext or Telegram session material ever reaches this
 * module. Writes run inside the caller's transaction where the action and its
 * audit record must succeed or fail together.
 */

export interface AuditInput {
  eventType: string;
  resourceType?: string | null;
  resourceId?: string | null;
  result?: AuditResult;
  metadata?: Record<string, unknown>;
}

export async function recordAuditEvent(
  db: Db | Queryable,
  userId: string,
  input: AuditInput,
): Promise<void> {
  await db.query(
    `insert into public.audit_events
       (user_id, event_type, resource_type, resource_id, result, event_metadata)
     values ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      userId,
      input.eventType,
      input.resourceType ?? null,
      input.resourceId ?? null,
      input.result ?? 'success',
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}

interface AuditRow {
  id: string;
  eventType: string;
  resourceType: string | null;
  resourceId: string | null;
  result: string;
  metadata: unknown;
  createdAt: unknown;
}

export async function listAuditEvents(
  db: Db,
  userId: string,
  limit: number,
): Promise<AuditEvent[]> {
  const { rows } = await db.query<AuditRow>(
    `select id,
            event_type as "eventType",
            resource_type as "resourceType",
            resource_id as "resourceId",
            result,
            event_metadata as metadata,
            created_at as "createdAt"
       from public.audit_events
      where user_id = $1
      order by created_at desc, id desc
      limit $2`,
    [userId, limit],
  );

  return rows.map((row) => ({
    id: row.id,
    eventType: row.eventType,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    result: row.result as AuditEvent['result'],
    metadata:
      typeof row.metadata === 'object' && row.metadata !== null
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: toIsoString(row.createdAt),
  }));
}
