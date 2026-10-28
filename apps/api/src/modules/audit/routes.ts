import type { FastifyInstance } from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import { AuditListResponseSchema } from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { authRequired } from '../../errors';
import { listAuditEvents } from './repository';

const AuditQuery = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
});
type AuditQueryType = Static<typeof AuditQuery>;

/** Owner-scoped read of the append-only trail; writes happen inside actions. */
export function registerAuditRoutes(app: FastifyInstance, deps: { db: Db }): void {
  app.get<{ Querystring: AuditQueryType }>(
    '/api/v1/audit',
    {
      preHandler: app.authenticate,
      schema: {
        querystring: AuditQuery,
        response: { 200: AuditListResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return { items: await listAuditEvents(deps.db, user.id, request.query.limit ?? 25) };
    },
  );
}
