import { Readable } from 'node:stream';
import type { FastifyInstance } from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import { FileVersionListResponseSchema } from '@stackbase/contracts';
import type { Config } from '../../config/env';
import type { Db } from '../../database/db';
import { ApiError, authRequired } from '../../errors';
import { mapProviderErrorToApiError, openStorageProvider } from '../../storage/registry';
import { listVersions, loadVersionForDownload } from './repository';

/**
 * Version routes: list immutable versions and stream one version's ciphertext
 * (A5.6). The stream is the only way content leaves the server — never a
 * permanent public URL; the browser decrypts what it receives (ADR-017).
 */

const FileParams = Type.Object({ fileId: Type.String({ minLength: 1, maxLength: 36 }) });
type FileParamsType = Static<typeof FileParams>;

const VersionParams = Type.Object({
  fileId: Type.String({ minLength: 1, maxLength: 36 }),
  versionId: Type.String({ minLength: 1, maxLength: 36 }),
});
type VersionParamsType = Static<typeof VersionParams>;

export function registerVersionRoutes(app: FastifyInstance, deps: { db: Db; config: Config }): void {
  app.get<{ Params: FileParamsType }>(
    '/api/v1/files/:fileId/versions',
    {
      preHandler: app.authenticate,
      schema: {
        params: FileParams,
        response: { 200: FileVersionListResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return listVersions(deps.db, user.id, request.params.fileId);
    },
  );

  app.get<{ Params: VersionParamsType }>(
    '/api/v1/files/:fileId/versions/:versionId/download',
    {
      preHandler: app.authenticate,
      schema: { params: VersionParams },
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) throw authRequired();

      const target = await loadVersionForDownload(
        deps.db,
        user.id,
        request.params.fileId,
        request.params.versionId,
      );
      if (!target) {
        throw new ApiError('VERSION_NOT_FOUND', 404, 'That file version does not exist.');
      }

      let handle;
      try {
        handle = await openStorageProvider(deps, user.id, target.provider);
      } catch (error) {
        throw mapProviderErrorToApiError(error);
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

      reply.header('content-type', 'application/octet-stream');
      reply.header('content-length', String(target.version.ciphertextSizeBytes));
      reply.header('x-stackbase-format', target.version.encryptionFormatVersion);
      reply.header('x-stackbase-ciphertext-hash', target.version.ciphertextHash);
      reply.header('cache-control', 'no-store');
      return reply.send(stream);
    },
  );
}
