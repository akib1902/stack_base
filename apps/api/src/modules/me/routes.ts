import type { FastifyInstance } from 'fastify';
import type { Static } from '@sinclair/typebox';
import { MeResponseSchema, UserSettingsSchema, UserSettingsUpdateSchema } from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { authRequired } from '../../errors';
import { getMe, updateUserSettings } from './repository';

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

  app.patch<{ Body: Static<typeof UserSettingsUpdateSchema> }>(
    '/api/v1/me/settings',
    {
      preHandler: app.authenticate,
      schema: {
        body: UserSettingsUpdateSchema,
        response: { 200: UserSettingsSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return updateUserSettings(deps.db, user.id, request.body);
    },
  );
}
