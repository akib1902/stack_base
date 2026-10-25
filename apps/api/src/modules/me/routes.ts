import type { FastifyInstance } from 'fastify';
import { MeResponseSchema } from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { authRequired } from '../../errors';
import { getMe } from './repository';

export function registerMeRoutes(app: FastifyInstance, deps: { db: Db }): void {
  app.get(
    '/api/v1/me',
    {
      preHandler: app.authenticate,
      schema: { response: { 200: MeResponseSchema } },
    },
    async (request) => {
      const user = request.user;
      if (!user) {
        throw authRequired();
      }
      return getMe(deps.db, user);
    },
  );
}
