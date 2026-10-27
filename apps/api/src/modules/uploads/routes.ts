import type { FastifyInstance } from 'fastify';
import { Type, type Static } from '@sinclair/typebox';
import {
  CancelUploadResponseSchema,
  CreateUploadRequestSchema,
  CreateUploadResponseSchema,
  FinalizeUploadResponseSchema,
  MAX_PLAINTEXT_CHUNK_SIZE,
  SECRETSTREAM_ABYTES,
  UPLOAD_CHUNK_CHECKSUM_HEADER,
  UploadChunkResponseSchema,
  UploadJobSchema,
} from '@stackbase/contracts';
import type { Config } from '../../config/env';
import type { Db } from '../../database/db';
import { ApiError, authRequired } from '../../errors';
import {
  cancelUpload,
  createUpload,
  finalizeUpload,
  getUpload,
  receiveChunk,
} from './repository';

/**
 * Upload endpoints (A10). Resume, retry and pause actions are Milestone 4;
 * this milestone accepts the full chunk set, verifies it end to end and
 * finalizes the immutable version. Replaying an idempotency key returns the
 * same job, and finalizing twice returns the same version.
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

  app.post<{ Params: UploadParamsType }>(
    '/api/v1/uploads/:uploadId/finalize',
    {
      preHandler: app.authenticate,
      schema: {
        params: UploadParams,
        response: { 200: FinalizeUploadResponseSchema },
      },
    },
    async (request) => {
      const user = request.user;
      if (!user) throw authRequired();
      return finalizeUpload(deps, user.id, request.params.uploadId);
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
}
