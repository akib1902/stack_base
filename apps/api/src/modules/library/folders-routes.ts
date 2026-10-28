import type { FastifyInstance } from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import {
  CreateFolderRequestSchema,
  FolderListResponseSchema,
  FolderSummarySchema,
  MutationResponseSchema,
  UpdateFolderRequestSchema,
} from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { authRequired } from '../../errors';
import { recordAuditEvent } from '../audit/repository';
import {
  createFolder,
  listFolders,
  trashFolder,
  updateFolder,
} from './folders-repository';

const FolderParams = Type.Object({ folderId: Type.String({ minLength: 1 }) });
type FolderParamsType = Static<typeof FolderParams>;

export function registerFolderRoutes(app: FastifyInstance, deps: { db: Db }): void {
  app.get(
    '/api/v1/folders',
    {
      preHandler: app.authenticate,
      schema: { response: { 200: FolderListResponseSchema } },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return { items: await listFolders(deps.db, user.id) };
    },
  );

  app.post<{ Body: Static<typeof CreateFolderRequestSchema> }>(
    '/api/v1/folders',
    {
      preHandler: app.authenticate,
      schema: {
        body: CreateFolderRequestSchema,
        response: { 201: FolderSummarySchema },
      },
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) throw authRequired();
      const folder = await createFolder(deps.db, user.id, request.body);
      return reply.status(201).send(folder);
    },
  );

  app.patch<{ Params: FolderParamsType; Body: Static<typeof UpdateFolderRequestSchema> }>(
    '/api/v1/folders/:folderId',
    {
      preHandler: app.authenticate,
      schema: {
        params: FolderParams,
        body: UpdateFolderRequestSchema,
        response: { 200: FolderSummarySchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return updateFolder(deps.db, user.id, request.params.folderId, request.body);
    },
  );

  app.delete<{ Params: FolderParamsType }>(
    '/api/v1/folders/:folderId',
    {
      preHandler: app.authenticate,
      schema: {
        params: FolderParams,
        response: { 200: MutationResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      const result = await trashFolder(deps.db, user.id, request.params.folderId);
      await recordAuditEvent(deps.db, user.id, {
        eventType: 'folder.trash',
        resourceType: 'folder',
        resourceId: request.params.folderId,
        metadata: { folders: result.folders, files: result.files },
      });
      return { ok: true as const, affected: result.folders + result.files };
    },
  );
}
