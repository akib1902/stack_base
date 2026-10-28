import type { FastifyInstance } from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import { RestoreVersionResponseSchema } from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { authRequired } from '../../errors';
import { restoreFileVersion } from './repository';

const UUID_PATTERN =
  '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

const VersionParams = Type.Object({
  fileId: Type.String({ minLength: 36, maxLength: 36, pattern: UUID_PATTERN }),
  versionId: Type.String({ minLength: 36, maxLength: 36, pattern: UUID_PATTERN }),
});
type VersionParamsType = Static<typeof VersionParams>;

/** Recovery (FR-11): append a new version pointing at an old version's content. */
export function registerVersionRestoreRoutes(
  app: FastifyInstance,
  deps: { db: Db },
): void {
  app.post<{ Params: VersionParamsType }>(
    '/api/v1/files/:fileId/versions/:versionId/restore',
    {
      preHandler: app.authenticate,
      schema: {
        params: VersionParams,
        response: { 200: RestoreVersionResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return restoreFileVersion(
        deps.db,
        user.id,
        request.params.fileId,
        request.params.versionId,
      );
    },
  );
}
