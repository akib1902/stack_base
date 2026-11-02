import type { preHandlerHookHandler } from 'fastify';
import type { AuthenticatedUser } from '../security/token';

declare module 'fastify' {
  interface FastifyRequest {
    /** Populated only by the authenticate preHandler after token verification. */
    user: AuthenticatedUser | null;
  }

  interface FastifyInstance {
    authenticate: preHandlerHookHandler;
    /** Refuses the request unless profiles.is_admin is true for the token subject. */
    requireAdmin: preHandlerHookHandler;
  }
}
