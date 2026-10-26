import type { FastifyInstance } from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import {
  CreateTagRequestSchema,
  MutationResponseSchema,
  TagListItemSchema,
  TagListResponseSchema,
  UpdateTagRequestSchema,
} from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { authRequired } from '../../errors';
import { createTag, deleteTag, listTags, updateTag } from './tags-repository';

const TagParams = Type.Object({ tagId: Type.String({ minLength: 1 }) });
type TagParamsType = Static<typeof TagParams>;

export function registerTagRoutes(app: FastifyInstance, deps: { db: Db }): void {
  app.get(
    '/api/v1/tags',
    {
      preHandler: app.authenticate,
      schema: { response: { 200: TagListResponseSchema } },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return { items: await listTags(deps.db, user.id) };
    },
  );

  app.post<{ Body: Static<typeof CreateTagRequestSchema> }>(
    '/api/v1/tags',
    {
      preHandler: app.authenticate,
      schema: {
        body: CreateTagRequestSchema,
        response: { 201: TagListItemSchema },
      },
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) throw authRequired();
      const tag = await createTag(deps.db, user.id, request.body);
      return reply.status(201).send(tag);
    },
  );

  app.patch<{ Params: TagParamsType; Body: Static<typeof UpdateTagRequestSchema> }>(
    '/api/v1/tags/:tagId',
    {
      preHandler: app.authenticate,
      schema: {
        params: TagParams,
        body: UpdateTagRequestSchema,
        response: { 200: MutationResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      await updateTag(deps.db, user.id, request.params.tagId, request.body);
      return { ok: true as const, affected: 1 };
    },
  );

  app.delete<{ Params: TagParamsType }>(
    '/api/v1/tags/:tagId',
    {
      preHandler: app.authenticate,
      schema: {
        params: TagParams,
        response: { 200: MutationResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      await deleteTag(deps.db, user.id, request.params.tagId);
      return { ok: true as const, affected: 1 };
    },
  );
}
