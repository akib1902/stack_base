import type { FastifyInstance } from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import {
  CancelUploadResponseSchema,
  CreateUploadRequestSchema,
  CreateUploadResponseSchema,
  FinalizeUploadRequestSchema,
  FinalizeUploadResponseSchema,
  MAX_PLAINTEXT_CHUNK_SIZE,
  SECRETSTREAM_ABYTES,
  UPLOAD_CHUNK_CHECKSUM_HEADER,
  UploadActionResponseSchema,
  UploadChunkResponseSchema,
  UploadJobSchema,
  UploadListResponseSchema,
} from '@stackbase/contracts';
import type { Config } from '../../config/env';
import type { Db } from '../../database/db';
import { ApiError, authRequired } from '../../errors';
import {
  cancelUpload,
  createUpload,
  finalizeUpload,
  getUpload,
  listUploads,
  pauseUpload,
  receiveChunk,
  resumeUpload,
  retryUpload,
} from './repository';

/**
 * Upload endpoints (A10). The queue is durable: `GET /uploads` restores it
 * after a refresh, pause/resume/retry drive the documented state machine, and
 * this API still only ever sees ciphertext chunks. Replaying an idempotency key
 * returns the same job, and finalizing twice returns the same version.
 */

const UploadParams = Type.Object({ uploadId: Type.String({ minLength: 1, maxLength: 36 }) });
type UploadParamsType = Static<typeof UploadParams>;

const ChunkParams = Type.Object({
  uploadId: Type.String({ minLength: 1, maxLength: 36 }),
  chunkNumber: Type.Integer({ minimum: 0, maximum: 10_000_000 }),
});
type ChunkParamsType = Static<typeof ChunkParams>;

export function registerUploadRoutes(app: FastifyInstance, deps: { db: Db; config: Config }): void {
  app.post<{ Body: Static<typeof CreateUploadRequestSchema> }>(
    '/api/v1/uploads',
    {
      preHandler: app.authenticate,
      schema: {
        body: CreateUploadRequestSchema,
        response: { 200: CreateUploadResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return createUpload(deps, user.id, request.body);
    },
  );

  app.get(
    '/api/v1/uploads',
    {
      preHandler: app.authenticate,
      schema: { response: { 200: UploadListResponseSchema } },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return { items: await listUploads(deps.db, user.id) };
    },
  );

  app.get<{ Params: UploadParamsType }>(
    '/api/v1/uploads/:uploadId',
    {
      preHandler: app.authenticate,
      schema: {
        params: UploadParams,
        response: { 200: UploadJobSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return getUpload(deps.db, user.id, request.params.uploadId);
    },
  );

  app.put<{ Params: ChunkParamsType; Body: Buffer }>(
    '/api/v1/uploads/:uploadId/chunks/:chunkNumber',
    {
      preHandler: app.authenticate,
      // Chunks are ciphertext only and bounded by the pinned maximum chunk size.
      bodyLimit: MAX_PLAINTEXT_CHUNK_SIZE + SECRETSTREAM_ABYTES + 1024,
      config: { rateLimit: { max: 1200, timeWindow: '1 minute' } },
      schema: {
        params: ChunkParams,
        response: { 200: UploadChunkResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      if (!Buffer.isBuffer(request.body)) {
        throw new ApiError(
          'VALIDATION_ERROR',
          400,
          'Chunks must be sent as application/octet-stream bodies.',
        );
      }
      const header = request.headers[UPLOAD_CHUNK_CHECKSUM_HEADER];
      const checksum = Array.isArray(header) ? header[0] : header;
      return receiveChunk(
        deps,
        user.id,
        request.params.uploadId,
        request.params.chunkNumber,
        request.body,
        checksum,
      );
    },
  );

  app.post<{
    Params: UploadParamsType;
    Body: Static<typeof FinalizeUploadRequestSchema>;
  }>(
    '/api/v1/uploads/:uploadId/finalize',
    {
      preHandler: app.authenticate,
      schema: {
        params: UploadParams,
        body: FinalizeUploadRequestSchema,
        response: { 200: FinalizeUploadResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return finalizeUpload(deps, user.id, request.params.uploadId, request.body);
    },
  );

  app.post<{ Params: UploadParamsType }>(
    '/api/v1/uploads/:uploadId/cancel',
    {
      preHandler: app.authenticate,
      schema: {
        params: UploadParams,
        response: { 200: CancelUploadResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return cancelUpload(deps, user.id, request.params.uploadId);
    },
  );

  for (const [path, action] of [
    ['pause', pauseUpload],
    ['resume', resumeUpload],
    ['retry', retryUpload],
  ] as const) {
    app.post<{ Params: UploadParamsType }>(
      `/api/v1/uploads/:uploadId/${path}`,
      {
        preHandler: app.authenticate,
        schema: {
          params: UploadParams,
          response: { 200: UploadActionResponseSchema },
        },
      },
      async (request) => {
        const user = request.user;
        if (!user) throw authRequired();
        return { upload: await action(deps.db, user.id, request.params.uploadId) };
      },
    );
  }
}
