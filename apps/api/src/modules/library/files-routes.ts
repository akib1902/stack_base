import type { FastifyInstance } from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import {
  BulkFileRequestSchema,
  FileListResponseSchema,
  FileSortSchema,
  FileSummarySchema,
  LibraryCategorySchema,
  MutationResponseSchema,
  SearchResponseSchema,
  SetFileTagsRequestSchema,
  UpdateFileRequestSchema,
} from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { ApiError, authRequired } from '../../errors';
import {
  bulkUpdateFiles,
  getFile,
  listFiles,
  setFileTags,
  trashFile,
  updateFile,
} from './files-repository';
import { searchLibrary } from './summary-repository';
import { recordAuditEvent } from '../audit/repository';

const FileParams = Type.Object({ fileId: Type.String({ minLength: 1 }) });
type FileParamsType = Static<typeof FileParams>;

const FileListQuery = Type.Object({
  q: Type.Optional(Type.String({ maxLength: 200 })),
  category: Type.Optional(LibraryCategorySchema),
  folderId: Type.Optional(Type.String({ maxLength: 36 })),
  favorite: Type.Optional(Type.Union([Type.Literal('true'), Type.Literal('false')])),
  tagId: Type.Optional(Type.String({ maxLength: 36 })),
  sort: Type.Optional(FileSortSchema),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, maximum: 1_000_000 })),
});

export function registerFileRoutes(app: FastifyInstance, deps: { db: Db }): void {
  app.get<{ Querystring: Static<typeof FileListQuery> }>(
    '/api/v1/files',
    {
      preHandler: app.authenticate,
      schema: {
        querystring: FileListQuery,
        response: { 200: FileListResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();

      const query = request.query;
      return listFiles(deps.db, user.id, {
        q: query.q,
        category: query.category,
        folderId: query.folderId,
        favorite: query.favorite === 'true' ? true : undefined,
        tagId: query.tagId,
        sort: query.sort,
        limit: query.limit,
        offset: query.offset,
      });
    },
  );

  // Registered before the parameterised routes so the literal path always wins.
  app.post<{ Body: Static<typeof BulkFileRequestSchema> }>(
    '/api/v1/files/bulk',
    {
      preHandler: app.authenticate,
      schema: {
        body: BulkFileRequestSchema,
        response: { 200: MutationResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      const affected = await bulkUpdateFiles(deps.db, user.id, request.body);
      if (request.body.action === 'trash' && affected > 0) {
        await recordAuditEvent(deps.db, user.id, {
          eventType: 'file.trash',
          resourceType: 'file',
          metadata: { files: affected, bulk: true },
        });
      }
      return { ok: true as const, affected };
    },
  );

  app.get<{ Params: FileParamsType }>(
    '/api/v1/files/:fileId',
    {
      preHandler: app.authenticate,
      schema: {
        params: FileParams,
        response: { 200: FileSummarySchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      const file = await getFile(deps.db, user.id, request.params.fileId);
      if (!file) {
        throw new ApiError('FILE_NOT_FOUND', 404, 'That file does not exist.');
      }
      return file;
    },
  );

  app.patch<{ Params: FileParamsType; Body: Static<typeof UpdateFileRequestSchema> }>(
    '/api/v1/files/:fileId',
    {
      preHandler: app.authenticate,
      schema: {
        params: FileParams,
        body: UpdateFileRequestSchema,
        response: { 200: FileSummarySchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return updateFile(deps.db, user.id, request.params.fileId, request.body);
    },
  );

  app.delete<{ Params: FileParamsType }>(
    '/api/v1/files/:fileId',
    {
      preHandler: app.authenticate,
      schema: {
        params: FileParams,
        response: { 200: MutationResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      const affected = await trashFile(deps.db, user.id, request.params.fileId);
      if (affected > 0) {
        await recordAuditEvent(deps.db, user.id, {
          eventType: 'file.trash',
          resourceType: 'file',
          resourceId: request.params.fileId,
        });
      }
      return { ok: true as const, affected };
    },
  );

  app.put<{ Params: FileParamsType; Body: Static<typeof SetFileTagsRequestSchema> }>(
    '/api/v1/files/:fileId/tags',
    {
      preHandler: app.authenticate,
      schema: {
        params: FileParams,
        body: SetFileTagsRequestSchema,
        response: { 200: FileSummarySchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return setFileTags(deps.db, user.id, request.params.fileId, request.body.tagIds);
    },
  );

  app.get<{ Querystring: { q: string } }>(
    '/api/v1/search',
    {
      preHandler: app.authenticate,
      schema: {
        querystring: Type.Object({ q: Type.String({ maxLength: 200 }) }),
        response: { 200: SearchResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return searchLibrary(deps.db, user.id, request.query.q);
    },
  );
}
