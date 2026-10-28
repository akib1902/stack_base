import { Readable } from 'node:stream';
import type { FastifyInstance } from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import {
  CreateShareRequestSchema,
  CreateShareResponseSchema,
  PublicShareSchema,
  RevokeShareResponseSchema,
  ShareListQuerySchema,
  ShareListResponseSchema,
} from '@stackbase/contracts';
import type { Config } from '../../config/env';
import type { Db } from '../../database/db';
import { ApiError, authRequired } from '../../errors';
import { mapProviderErrorToApiError, openStorageProvider } from '../../storage/registry';
import {
  SHARE_TOKEN_PATTERN,
  claimShareDownload,
  createShare,
  listShares,
  loadPublicShare,
  recordShareDownloadDenied,
  revokeShare,
} from './repository';

/**
 * Share routes (SRS A10). Owner routes are authenticated; public routes take
 * only the raw token from the path and must still pass expiry, revocation and
 * download-limit checks. The decryption secret travels in the URL fragment and
 * never reaches this server, so neither the API nor its logs can open content.
 */

const ShareParams = Type.Object({
  shareId: Type.String({ minLength: 1, maxLength: 36 }),
});
type ShareParamsType = Static<typeof ShareParams>;

const PublicTokenParams = Type.Object({
  token: Type.String({ minLength: 43, maxLength: 43, pattern: SHARE_TOKEN_PATTERN }),
});
type PublicTokenParamsType = Static<typeof PublicTokenParams>;

export function registerShareRoutes(
  app: FastifyInstance,
  deps: { db: Db; config: Config },
): void {
  app.post<{ Body: Static<typeof CreateShareRequestSchema> }>(
    '/api/v1/shares',
    {
      preHandler: app.authenticate,
      schema: {
        body: CreateShareRequestSchema,
        response: { 200: CreateShareResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return createShare(deps.db, user.id, request.body);
    },
  );

  app.get<{ Querystring: Static<typeof ShareListQuerySchema> }>(
    '/api/v1/shares',
    {
      preHandler: app.authenticate,
      schema: {
        querystring: ShareListQuerySchema,
        response: { 200: ShareListResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return { items: await listShares(deps.db, user.id, request.query.fileId) };
    },
  );

  app.post<{ Params: ShareParamsType }>(
    '/api/v1/shares/:shareId/revoke',
    {
      preHandler: app.authenticate,
      schema: {
        params: ShareParams,
        response: { 200: RevokeShareResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return { share: await revokeShare(deps.db, user.id, request.params.shareId) };
    },
  );

  // -------------------------------------------------------------------------
  // Public access (no session; the token is the capability)
  // -------------------------------------------------------------------------

  app.get<{ Params: PublicTokenParamsType }>(
    '/api/v1/public/shares/:token',
    {
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
      schema: {
        params: PublicTokenParams,
        response: { 200: PublicShareSchema },
      },
    },
    async (request) => {
      const target = await loadPublicShare(deps.db, request.params.token);
      return target.view;
    },
  );

  app.get<{ Params: PublicTokenParamsType }>(
    '/api/v1/public/shares/:token/download',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: { params: PublicTokenParams },
    },
    async (request, reply) => {
      let target;
      try {
        target = await loadPublicShare(deps.db, request.params.token);
      } catch (error) {
        // A refused attempt is audited for the owner, even though no owner
        // session is involved in the request.
        if (error instanceof ApiError) {
          await recordShareDownloadDenied(deps.db, request.params.token, error.code);
        }
        throw error;
      }

      let handle;
      try {
        handle = await openStorageProvider(deps, target.userId, target.provider);
      } catch (error) {
        throw mapProviderErrorToApiError(error);
      }

      try {
        await claimShareDownload(deps.db, target);
      } catch (error) {
        await handle.close();
        throw error;
      }

      const stream = Readable.from(handle.provider.download(target.reference));
      let closed = false;
      const finish = (): void => {
        if (closed) return;
        closed = true;
        void handle.close();
      };
      stream.on('close', finish);
      stream.on('error', finish);

      const { view } = target;
      reply.header('content-type', 'application/octet-stream');
      reply.header('content-length', String(view.ciphertextSizeBytes));
      reply.header('x-stackbase-format', view.encryptionFormatVersion);
      reply.header('x-stackbase-ciphertext-hash', view.manifest.ciphertextHash);
      reply.header('cache-control', 'no-store');
      return reply.send(stream);
    },
  );
}
