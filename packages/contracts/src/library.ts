import { Type, type Static } from '@sinclair/typebox';

/**
 * Canonical home-screen categories. Order here is the order the UI renders and
 * the order the API returns, so the bento grid never reshuffles between loads.
 */
export const LIBRARY_CATEGORIES = [
  'images',
  'videos',
  'audio',
  'documents',
  'apks',
  'archives',
  'apps',
  'downloads',
  'other',
] as const;

export const LibraryCategorySchema = Type.Union([
  Type.Literal('images'),
  Type.Literal('videos'),
  Type.Literal('audio'),
  Type.Literal('documents'),
  Type.Literal('apks'),
  Type.Literal('archives'),
  Type.Literal('apps'),
  Type.Literal('downloads'),
  Type.Literal('other'),
]);
export type LibraryCategory = Static<typeof LibraryCategorySchema>;

export const LibraryCategorySummarySchema = Type.Object({
  category: LibraryCategorySchema,
  files: Type.Integer({ minimum: 0 }),
  bytes: Type.Integer({ minimum: 0 }),
});
export type LibraryCategorySummary = Static<typeof LibraryCategorySummarySchema>;

export const LibrarySummaryResponseSchema = Type.Object({
  totals: Type.Object({
    files: Type.Integer({ minimum: 0 }),
    bytes: Type.Integer({ minimum: 0 }),
  }),
  /** Every category is present, including empty ones, with real counts. */
  categories: Type.Array(LibraryCategorySummarySchema),
});
export type LibrarySummaryResponse = Static<typeof LibrarySummaryResponseSchema>;
