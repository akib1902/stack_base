import type { FastifyInstance } from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import { MutationResponseSchema, TrashListResponseSchema } from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { toCount } from '../../database/values';
import { authRequired } from '../../errors';
import { listTrash, purgeFile, restoreFile } from './files-repository';
import { purgeFolder, restoreFolder } from './folders-repository';

const FileParams = Type.Object({ fileId: Type.String({ minLength: 1 }) });
const FolderParams = Type.Object({ folderId: Type.String({ minLength: 1 }) });
type FileParamsType = Static<typeof FileParams>;
type FolderParamsType = Static<typeof FolderParams>;

export function registerTrashRoutes(app: FastifyInstance, deps: { db: Db }): void {
  app.get(
    '/api/v1/trash',
    {
      preHandler: app.authenticate,
      schema: { response: { 200: TrashListResponseSchema } },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();

      const { rows } = await deps.db.query<{ retentionDays: unknown }>(
        'select trash_retention_days as "retentionDays" from public.user_settings where user_id = $1',
        [user.id],
      );
      // Zero is a deliberate setting (keep until manually removed), not a miss.
      const retentionDays =
        rows.length === 0 ? 30 : Math.min(Math.max(toCount(rows[0]?.retentionDays), 0), 3650);

      return {
        items: await listTrash(deps.db, user.id, retentionDays),
        retentionDays,
      };
    },
  );

  app.post<{ Params: FileParamsType }>(
    '/api/v1/trash/files/:fileId/restore',
    {
      preHandler: app.authenticate,
      schema: { params: FileParams, response: { 200: MutationResponseSchema } },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      const affected = await restoreFile(deps.db, user.id, request.params.fileId);
      return { ok: true as const, affected };
    },
  );

  app.delete<{ Params: FileParamsType }>(
    '/api/v1/trash/files/:fileId',
    {
      preHandler: app.authenticate,
      schema: { params: FileParams, response: { 200: MutationResponseSchema } },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      await purgeFile(deps.db, user.id, request.params.fileId);
      return { ok: true as const, affected: 1 };
    },
  );

  app.post<{ Params: FolderParamsType }>(
    '/api/v1/trash/folders/:folderId/restore',
    {
      preHandler: app.authenticate,
      schema: { params: FolderParams, response: { 200: MutationResponseSchema } },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      const affected = await restoreFolder(deps.db, user.id, request.params.folderId);
      return { ok: true as const, affected };
    },
  );

  app.delete<{ Params: FolderParamsType }>(
    '/api/v1/trash/folders/:folderId',
    {
      preHandler: app.authenticate,
      schema: { params: FolderParams, response: { 200: MutationResponseSchema } },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      const affected = await purgeFolder(deps.db, user.id, request.params.folderId);
      return { ok: true as const, affected };
    },
  );
}
