import type { FastifyInstance } from 'fastify';
import type { Static } from '@sinclair/typebox';
import { CreateVaultRequestSchema, VaultResponseSchema } from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { authRequired } from '../../errors';
import { createVault, getVault } from './repository';

/**
 * Vault endpoints. The SRS A10 list has no vault route, but A6 requires the
 * wrapped vault key to be retrievable client-side and C4 requires a vault status
 * in Settings; ADR-014 documents the deviation. Ciphertext only, always.
 */
export function registerEncryptionRoutes(app: FastifyInstance, deps: { db: Db }): void {
  app.get(
    '/api/v1/encryption/vault',
    {
      preHandler: app.authenticate,
      schema: { response: { 200: VaultResponseSchema } },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return getVault(deps.db, user.id);
    },
  );

  app.post<{ Body: Static<typeof CreateVaultRequestSchema> }>(
    '/api/v1/encryption/vault',
    {
      preHandler: app.authenticate,
      schema: {
        body: CreateVaultRequestSchema,
        response: { 200: VaultResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return createVault(deps.db, user.id, request.body);
    },
  );
}
