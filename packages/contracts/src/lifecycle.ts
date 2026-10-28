import { Type, type Static } from '@sinclair/typebox';
import { FileSummarySchema } from './library';
import { FileVersionSchema } from './uploads';

/**
 * Recovery endpoints (SRS B5): restoring a version appends a new immutable
 * version that points at the same stored ciphertext, and retention purges only
 * items the owner can no longer recover.
 */

export const RestoreVersionResponseSchema = Type.Object({
  file: FileSummarySchema,
  version: FileVersionSchema,
});
export type RestoreVersionResponse = Static<typeof RestoreVersionResponseSchema>;

export const PurgeTrashResponseSchema = Type.Object({
  purged: Type.Integer({ minimum: 0 }),
  /** Expired items that could not be removed (provider failure); retryable. */
  skipped: Type.Integer({ minimum: 0 }),
});
export type PurgeTrashResponse = Static<typeof PurgeTrashResponseSchema>;
