import type { FastifyInstance } from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import {
  MutationResponseSchema,
  PurgeTrashResponseSchema,
  TrashListResponseSchema,
} from '@stackbase/contracts';
import type { Config } from '../../config/env';
import type { Db } from '../../database/db';
import { toCount } from '../../database/values';
import { authRequired } from '../../errors';
import { recordAuditEvent } from '../audit/repository';
import { listTrash, restoreFile } from './files-repository';
import { restoreFolder } from './folders-repository';
import { purgeExpiredTrash, purgeTrashedFile, purgeTrashedFolder } from './purge';

const FileParams = Type.Object({ fileId: Type.String({ minLength: 1 }) });
const FolderParams = Type.Object({ folderId: Type.String({ minLength: 1 }) });
type FileParamsType = Static<typeof FileParams>;
type FolderParamsType = Static<typeof FolderParams>;

export function registerTrashRoutes(
  app: FastifyInstance,
  deps: { db: Db; config: Config },
): void {
  app.get(
    '/api/v1/trash',
    {
      preHandler: app.authenticate,
      schema: { response: { 200: TrashListResponseSchema } },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();

      // Retention is enforced when the owner opens Trash. Individual provider
      // failures are skipped and retried on the next visit; the list still loads.
      await purgeExpiredTrash(deps, user.id);

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

  app.post(
    '/api/v1/trash/purge',
    {
      preHandler: app.authenticate,
      schema: { response: { 200: PurgeTrashResponseSchema } },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return purgeExpiredTrash(deps, user.id);
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
      await recordAuditEvent(deps.db, user.id, {
        eventType: 'file.restore',
        resourceType: 'file',
        resourceId: request.params.fileId,
      });
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
      await purgeTrashedFile(deps, user.id, request.params.fileId);
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
      await recordAuditEvent(deps.db, user.id, {
        eventType: 'folder.restore',
        resourceType: 'folder',
        resourceId: request.params.folderId,
      });
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
      const affected = await purgeTrashedFolder(deps, user.id, request.params.folderId);
      return { ok: true as const, affected };
    },
  );
}
