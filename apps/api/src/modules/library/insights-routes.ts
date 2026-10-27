import type { FastifyInstance } from 'fastify';
import { StorageInsightsResponseSchema } from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { authRequired } from '../../errors';
import { getStorageInsights } from './insights-repository';

export function registerInsightsRoutes(app: FastifyInstance, deps: { db: Db }): void {
  app.get(
    '/api/v1/insights',
    {
      preHandler: app.authenticate,
      schema: { response: { 200: StorageInsightsResponseSchema } },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return getStorageInsights(deps.db, user.id);
    },
  );
}