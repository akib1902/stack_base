import type { FastifyInstance } from 'fastify';
import { SetupStatusResponseSchema } from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { authRequired } from '../../errors';
import { getSetupStatus } from './repository';

export function registerSetupRoutes(app: FastifyInstance, deps: { db: Db }): void {
  app.get(
    '/api/v1/setup/status',
    {
      preHandler: app.authenticate,
      schema: { response: { 200: SetupStatusResponseSchema } },
    },
    async (request) => {
      const user = request.user;
      if (!user) {
        throw authRequired();
      }
      return getSetupStatus(deps.db, user.id);
    },
  );
}
