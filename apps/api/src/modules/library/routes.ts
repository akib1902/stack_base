import type { FastifyInstance } from 'fastify';
import { LibrarySummaryResponseSchema } from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { authRequired } from '../../errors';
import { getLibrarySummary } from './repository';

export function registerLibraryRoutes(app: FastifyInstance, deps: { db: Db }): void {
  app.get(
    '/api/v1/library/summary',
    {
      preHandler: app.authenticate,
      schema: { response: { 200: LibrarySummaryResponseSchema } },
    },
    async (request) => {
      const user = request.user;
      if (!user) {
        throw authRequired();
      }
      return getLibrarySummary(deps.db, user.id);
    },
  );
}
