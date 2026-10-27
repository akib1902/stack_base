import { Type, type Static } from '@sinclair/typebox';
import { CategorySummarySchema, LibraryCategorySchema } from './library';

/**
 * Storage insights (FR-10, C4): where the logical bytes actually are. Every
 * number is a real aggregate over the owner's rows — nothing is estimated, and
 * the response explains that logical size can differ from what the provider
 * physically stores.
 */

export const FolderUsageSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  files: Type.Integer({ minimum: 0 }),
  bytes: Type.Integer({ minimum: 0 }),
});
export type FolderUsage = Static<typeof FolderUsageSchema>;

/**
 * The fields an insight list needs; the full file-summary shape is heavier than
 * any view here renders.
 */
export const InsightFileSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  category: Type.Union([LibraryCategorySchema, Type.Null()]),
  sizeBytes: Type.Integer({ minimum: 0 }),
  updatedAt: Type.String(),
});
export type InsightFile = Static<typeof InsightFileSchema>;

/**
 * Files whose client-side SHA-256 of the plaintext matches. Encryption is per
 * file, so only the plaintext fingerprint can reveal duplication — the server
 * never sees the content, only the fingerprint the client declared (A9).
 */
export const DuplicateGroupSchema = Type.Object({
  fingerprint: Type.String(),
  /** Bytes one copy occupies; everything beyond the first copy is wasted. */
  sizeBytes: Type.Integer({ minimum: 0 }),
  wastedBytes: Type.Integer({ minimum: 0 }),
  files: Type.Array(InsightFileSchema),
});
export type DuplicateGroup = Static<typeof DuplicateGroupSchema>;

export const StorageInsightsResponseSchema = Type.Object({
  totals: Type.Object({
    files: Type.Integer({ minimum: 0 }),
    folders: Type.Integer({ minimum: 0 }),
    bytes: Type.Integer({ minimum: 0 }),
    trashedFiles: Type.Integer({ minimum: 0 }),
    trashedFolders: Type.Integer({ minimum: 0 }),
    trashedBytes: Type.Integer({ minimum: 0 }),
    versions: Type.Integer({ minimum: 0 }),
    /** Ciphertext of superseded versions: neither live nor trashed. */
    versionBytes: Type.Integer({ minimum: 0 }),
    tags: Type.Integer({ minimum: 0 }),
  }),
  categories: Type.Array(CategorySummarySchema),
  largestFiles: Type.Array(InsightFileSchema),
  largestFolders: Type.Array(FolderUsageSchema),
  duplicateGroups: Type.Array(DuplicateGroupSchema),
  generatedAt: Type.String(),
});
export type StorageInsightsResponse = Static<typeof StorageInsightsResponseSchema>;