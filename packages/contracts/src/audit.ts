import { Type, type Static } from '@sinclair/typebox';

/**
 * Append-only audit trail (FR-13). Events never contain raw share tokens,
 * passwords, keys, plaintext or Telegram session material.
 */

export const AUDIT_RESULTS = ['success', 'failure', 'denied'] as const;

export const AuditResultSchema = Type.Union([
  Type.Literal('success'),
  Type.Literal('failure'),
  Type.Literal('denied'),
]);
export type AuditResult = Static<typeof AuditResultSchema>;

export const AuditEventSchema = Type.Object({
  id: Type.String(),
  eventType: Type.String(),
  resourceType: Type.Union([Type.String(), Type.Null()]),
  resourceId: Type.Union([Type.String(), Type.Null()]),
  result: AuditResultSchema,
  metadata: Type.Record(Type.String(), Type.Unknown()),
  createdAt: Type.String(),
});
export type AuditEvent = Static<typeof AuditEventSchema>;

export const AuditListResponseSchema = Type.Object({
  items: Type.Array(AuditEventSchema),
});
export type AuditListResponse = Static<typeof AuditListResponseSchema>;
