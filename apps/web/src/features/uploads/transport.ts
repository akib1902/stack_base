import {
  UPLOAD_CHUNK_CHECKSUM_HEADER,
  UPLOAD_CHUNK_CONTENT_TYPE,
  type CancelUploadResponse,
  type CreateUploadRequest,
  type CreateUploadResponse,
  type FileVersionListResponse,
  type FinalizeUploadRequest,
  type FinalizeUploadResponse,
  type UploadChunkResponse,
} from '@stackbase/contracts';
import { sendJson, sendRaw } from '@/lib/api/browser';
import type { UploadTransport } from './pipeline';

/**
 * Talks to this app's own route handlers (ADR-017), which attach the httpOnly
 * session cookie's token and forward to the API. Chunk bodies stay binary the
 * whole way; only the metadata travels as JSON.
 */
export const uploadTransport: UploadTransport = {
  create: (body: CreateUploadRequest) =>
    sendJson<CreateUploadResponse>('/api/uploads', { method: 'POST', body }),

  async putChunk(uploadId, chunkNumber, data, checksum) {
    const response = await sendRaw(
      `/api/uploads/${encodeURIComponent(uploadId)}/chunks/${chunkNumber}`,
      {
        method: 'PUT',
        headers: {
          'content-type': UPLOAD_CHUNK_CONTENT_TYPE,
          [UPLOAD_CHUNK_CHECKSUM_HEADER]: checksum,
        },
        body: data as unknown as BodyInit,
      },
    );
    return (await response.json()) as UploadChunkResponse;
  },

  finalize: (uploadId: string, body: FinalizeUploadRequest) =>
    sendJson<FinalizeUploadResponse>(`/api/uploads/${encodeURIComponent(uploadId)}/finalize`, {
      method: 'POST',
      body,
    }),

  cancel: (uploadId: string) =>
    sendJson<CancelUploadResponse>(`/api/uploads/${encodeURIComponent(uploadId)}/cancel`, {
      method: 'POST',
    }),

  listVersions: (fileId: string) =>
    sendJson<FileVersionListResponse>(`/api/files/${encodeURIComponent(fileId)}/versions`, {
      method: 'GET',
    }),
};
