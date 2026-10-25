import type { FastifyInstance } from 'fastify';
import { HealthResponseSchema, type HealthResponse } from '@stackbase/contracts';
import type { Db } from '../../database/db';

export const API_VERSION = '0.1.0';

export function registerHealthRoutes(app: FastifyInstance, deps: { db: Db }): void {
  app.get(
    '/health',
    { schema: { response: { 200: HealthResponseSchema, 503: HealthResponseSchema } } },
    async (_request, reply) => {
      let database: HealthResponse['database'] = 'ok';

      try {
        await deps.db.query('select 1');
      } catch (error) {
        database = 'unavailable';
        app.log.warn({ err: error }, 'health check: database unavailable');
      }

      const body: HealthResponse = {
        status: database === 'ok' ? 'ok' : 'degraded',
        version: API_VERSION,
        uptimeSeconds: Math.floor(process.uptime()),
        database,
      };

      return reply.status(database === 'ok' ? 200 : 503).send(body);
    },
  );
}
