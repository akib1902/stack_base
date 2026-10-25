import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { Config } from './config/env';
import { ApiError, authRequired } from './errors';
import { isDatabaseUnavailable, type Db } from './database/db';
import { createTokenVerifier, readBearerToken } from './security/token';
import { registerHealthRoutes } from './modules/health/routes';
import { registerMeRoutes } from './modules/me/routes';
import { registerSetupRoutes } from './modules/setup/routes';
import { registerLibraryRoutes } from './modules/library/routes';
import { registerDevAuthRoutes } from './modules/dev-auth/routes';

export interface BuildAppOptions {
  config: Config;
  db: Db;
  logger?: boolean;
}

/**
 * Compose the API. Auth verification, ownership scoping and error mapping live
 * here so every route inherits the same guarantees.
 */
export async function buildApp({
  config,
  db,
  logger = true,
}: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      logger === false
        ? false
        : {
            level: config.logLevel,
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'res.headers["set-cookie"]',
              ],
              censor: '[redacted]',
            },
          },
  }).withTypeProvider<TypeBoxTypeProvider>();

  app.decorateRequest('user', null);

  const verifyToken = createTokenVerifier(config.auth);

  app.decorate('authenticate', async (request) => {
    const token = readBearerToken(request.headers.authorization);
    if (!token) {
      throw authRequired('A bearer access token is required.');
    }
    // Identity always comes from the verified token, never from client input.
    request.user = await verifyToken(token);
  });

  await app.register(cors, {
    origin: config.webOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['authorization', 'content-type'],
    maxAge: 600,
  });

  await app.register(rateLimit, {
    max: 240,
    timeWindow: '1 minute',
    errorResponseBuilder: (_request, context) => ({
      error: {
        code: 'RATE_LIMITED' as const,
        message: `Too many requests. Retry in ${context.after}.`,
      },
    }),
  });

  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('referrer-policy', 'no-referrer');
    if (!reply.hasHeader('cache-control')) {
      // Private data: never let intermediaries cache API responses.
      reply.header('cache-control', 'no-store');
    }
    return payload;
  });

  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      });
    }

    if (error.validation) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed.',
          details: {
            issues: error.validation.map((issue) => ({
              path: issue.instancePath || issue.schemaPath,
              message: issue.message,
            })),
          },
        },
      });
    }

    if (error.statusCode === 429) {
      return reply.status(429).send({
        error: { code: 'RATE_LIMITED', message: 'Too many requests.' },
      });
    }

    if (isDatabaseUnavailable(error)) {
      request.log.error({ err: error }, 'database unavailable');
      return reply.status(503).send({
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'The metadata database is unavailable. Try again shortly.',
        },
      });
    }

    request.log.error({ err: error }, 'unhandled request error');
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.status(404).send({
      error: { code: 'ROUTE_NOT_FOUND', message: 'No such endpoint.' },
    }),
  );

  registerHealthRoutes(app, { db });
  registerMeRoutes(app, { db });
  registerSetupRoutes(app, { db });
  registerLibraryRoutes(app, { db });

  // Local development sign-in exists only outside production and only in dev mode.
  if (config.auth.mode === 'dev' && !config.isProduction) {
    registerDevAuthRoutes(app, { db, auth: config.auth });
  }

  return app;
}
