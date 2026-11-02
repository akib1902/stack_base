import type { FastifyInstance } from 'fastify';
import type { Static } from '@sinclair/typebox';
import {
  DeploymentSettingsResponseSchema,
  DeploymentSettingsUpdateSchema,
} from '@stackbase/contracts';
import type { Config } from '../../config/env';
import type { Db } from '../../database/db';
import { authRequired } from '../../errors';
import { getDeploymentSettings, updateDeploymentSettings } from './repository';

/**
 * Owner-only integration configuration. `requireAdmin` reads profiles.is_admin
 * from the database on every request; no client-supplied role or email is
 * trusted. GET never returns a secret and PUT only returns the sanitized view.
 */
export function registerDeploymentRoutes(
  app: FastifyInstance,
  deps: { db: Db; config: Config },
): void {
  app.get(
    '/api/v1/admin/deployment',
    {
      preHandler: [app.authenticate, app.requireAdmin],
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
      schema: { response: { 200: DeploymentSettingsResponseSchema } },
    },
    async (request) => {
      if (!request.user) throw authRequired();
      return getDeploymentSettings(deps.db, deps.config);
    },
  );

  app.put<{ Body: Static<typeof DeploymentSettingsUpdateSchema> }>(
    '/api/v1/admin/deployment',
    {
      preHandler: [app.authenticate, app.requireAdmin],
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      schema: {
        body: DeploymentSettingsUpdateSchema,
        response: { 200: DeploymentSettingsResponseSchema },
      },
    },
    async (request) => {
      if (!request.user) throw authRequired();
      return updateDeploymentSettings(deps.db, deps.config, request.user.id, request.body);
    },
  );
}
