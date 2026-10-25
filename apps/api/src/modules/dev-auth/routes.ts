import type { FastifyInstance } from 'fastify';
import {
  DevSessionRequestSchema,
  DevSessionResponseSchema,
  type DevSessionRequest,
  type DevSessionResponse,
} from '@stackbase/contracts';
import type { Db } from '../../database/db';
import type { Config } from '../../config/env';
import { issueDevSessionToken } from '../../security/token';

interface DevAuthDeps {
  db: Db;
  auth: Extract<Config['auth'], { mode: 'dev' }>;
}

/**
 * Local-first development sign-in. Registered only when AUTH_MODE=dev and the
 * process is not production; a real deployment uses Supabase Auth.
 */
export function registerDevAuthRoutes(app: FastifyInstance, deps: DevAuthDeps): void {
  app.post(
    '/api/v1/dev/session',
    {
      schema: {
        body: DevSessionRequestSchema,
        response: { 200: DevSessionResponseSchema },
      },
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    async (request) => {
      // The body schema above has already validated this shape at runtime.
      const { email: rawEmail } = request.body as DevSessionRequest;
      const email = rawEmail.trim().toLowerCase();

      const userId = await deps.db.transaction(async (tx) => {
        const existing = await tx.query<{ id: string }>(
          'select id from auth.users where lower(email) = $1',
          [email],
        );
        const found = existing.rows[0];
        if (found) {
          await tx.query('update auth.users set last_sign_in_at = now() where id = $1', [
            found.id,
          ]);
          return found.id;
        }

        const inserted = await tx.query<{ id: string }>(
          'insert into auth.users (email, last_sign_in_at) values ($1, now()) returning id',
          [email],
        );
        const created = inserted.rows[0];
        if (!created) {
          throw new Error('Failed to create development identity.');
        }
        return created.id;
      });

      const { accessToken, expiresAt } = await issueDevSessionToken(deps.auth, {
        userId,
        email,
      });

      const body: DevSessionResponse = {
        accessToken,
        tokenType: 'Bearer',
        expiresAt,
        user: { id: userId, email },
      };
      return body;
    },
  );
}
