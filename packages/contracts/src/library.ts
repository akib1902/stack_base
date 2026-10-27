import { Type, type Static } from '@sinclair/typebox';

/**
 * Canonical library categories. This order is what the API returns and what the
 * bento grid renders, so tiles never reshuffle between loads.
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

export const FILE_SORTS = [
  'updated_at',
  'created_at',
  'name_asc',
  'name_desc',
  'size_desc',
  'size_asc',
] as const;

export const FileSortSchema = Type.Union([
  Type.Literal('updated_at'),
  Type.Literal('created_at'),
  Type.Literal('name_asc'),
  Type.Literal('name_desc'),
  Type.Literal('size_desc'),
  Type.Literal('size_asc'),
]);
export type FileSort = Static<typeof FileSortSchema>;

export const DEFAULT_FILE_SORT: FileSort = 'updated_at';

export const TagSummarySchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  colorToken: Type.Union([Type.String(), Type.Null()]),
});
export type TagSummary = Static<typeof TagSummarySchema>;

export const FileSummarySchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  extension: Type.Union([Type.String(), Type.Null()]),
  mimeType: Type.String(),
  sizeBytes: Type.Integer({ minimum: 0 }),
  category: LibraryCategorySchema,
  favorite: Type.Boolean(),
  description: Type.Union([Type.String(), Type.Null()]),
  folderId: Type.Union([Type.String(), Type.Null()]),
  folderName: Type.Union([Type.String(), Type.Null()]),
  /**
   * `pending` means the logical record exists but no encrypted version has been
   * finalized yet. Milestone 2 only manages metadata; the upload pipeline that
   * makes this `ready` arrives with the storage milestone.
   */
  contentStatus: Type.Union([Type.Literal('pending'), Type.Literal('ready')]),
  tags: Type.Array(TagSummarySchema),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});
export type FileSummary = Static<typeof FileSummarySchema>;

export const FileListResponseSchema = Type.Object({
  items: Type.Array(FileSummarySchema),
  total: Type.Integer({ minimum: 0 }),
  limit: Type.Integer({ minimum: 1 }),
  offset: Type.Integer({ minimum: 0 }),
  hasMore: Type.Boolean(),
});
export type FileListResponse = Static<typeof FileListResponseSchema>;

export const FolderSummarySchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  parentFolderId: Type.Union([Type.String(), Type.Null()]),
  fileCount: Type.Integer({ minimum: 0 }),
  folderCount: Type.Integer({ minimum: 0 }),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});
export type FolderSummary = Static<typeof FolderSummarySchema>;

export const FolderListResponseSchema = Type.Object({
  items: Type.Array(FolderSummarySchema),
});
export type FolderListResponse = Static<typeof FolderListResponseSchema>;

export const NAME_MAX_LENGTH = 255;

/** The character set is deliberately permissive; only separators and control characters are rejected. */
export const NAME_PATTERN = '^[^/\\\\\\u0000-\\u001f\\u007f]+$';

export const CreateFolderRequestSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: NAME_MAX_LENGTH, pattern: NAME_PATTERN }),
  parentFolderId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});
export type CreateFolderRequest = Static<typeof CreateFolderRequestSchema>;

export const UpdateFolderRequestSchema = Type.Object({
  name: Type.Optional(
    Type.String({ minLength: 1, maxLength: NAME_MAX_LENGTH, pattern: NAME_PATTERN }),
  ),
  parentFolderId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});
export type UpdateFolderRequest = Static<typeof UpdateFolderRequestSchema>;

export const UpdateFileRequestSchema = Type.Object({
  name: Type.Optional(
    Type.String({ minLength: 1, maxLength: NAME_MAX_LENGTH, pattern: NAME_PATTERN }),
  ),
  folderId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  favorite: Type.Optional(Type.Boolean()),
  description: Type.Optional(Type.Union([Type.String({ maxLength: 2000 }), Type.Null()])),
});
export type UpdateFileRequest = Static<typeof UpdateFileRequestSchema>;

export const BULK_FILE_ACTIONS = ['move', 'favorite', 'unfavorite', 'trash', 'tag', 'untag'] as const;

export const BulkFileActionSchema = Type.Union([
  Type.Literal('move'),
  Type.Literal('favorite'),
  Type.Literal('unfavorite'),
  Type.Literal('trash'),
  Type.Literal('tag'),
  Type.Literal('untag'),
]);
export type BulkFileAction = Static<typeof BulkFileActionSchema>;

export const FileIdsSchema = Type.Array(Type.String({ minLength: 1 }), {
  minItems: 1,
  maxItems: 100,
});

export const BulkFileRequestSchema = Type.Object({
  action: BulkFileActionSchema,
  fileIds: FileIdsSchema,
  folderId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  tagId: Type.Optional(Type.String()),
});
export type BulkFileRequest = Static<typeof BulkFileRequestSchema>;

export const SetFileTagsRequestSchema = Type.Object({
  tagIds: Type.Array(Type.String(), { maxItems: 50 }),
});
export type SetFileTagsRequest = Static<typeof SetFileTagsRequestSchema>;

export const TagListItemSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  colorToken: Type.Union([Type.String(), Type.Null()]),
  fileCount: Type.Integer({ minimum: 0 }),
  createdAt: Type.String(),
});
export type TagListItem = Static<typeof TagListItemSchema>;

export const TagListResponseSchema = Type.Object({
  items: Type.Array(TagListItemSchema),
});
export type TagListResponse = Static<typeof TagListResponseSchema>;

export const CreateTagRequestSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 64 }),
  colorToken: Type.Optional(Type.Union([Type.String({ maxLength: 32 }), Type.Null()])),
});
export type CreateTagRequest = Static<typeof CreateTagRequestSchema>;

export const UpdateTagRequestSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 64 })),
  colorToken: Type.Optional(Type.Union([Type.String({ maxLength: 32 }), Type.Null()])),
});
export type UpdateTagRequest = Static<typeof UpdateTagRequestSchema>;

export const TrashItemSchema = Type.Object({
  kind: Type.Union([Type.Literal('file'), Type.Literal('folder')]),
  id: Type.String(),
  name: Type.String(),
  sizeBytes: Type.Integer({ minimum: 0 }),
  category: Type.Union([LibraryCategorySchema, Type.Null()]),
  parentName: Type.Union([Type.String(), Type.Null()]),
  deletedAt: Type.String(),
  /** Computed from the user's retention setting; automatic purging arrives with the lifecycle milestone. */
  expiresAt: Type.Union([Type.String(), Type.Null()]),
});
export type TrashItem = Static<typeof TrashItemSchema>;

export const TrashListResponseSchema = Type.Object({
  items: Type.Array(TrashItemSchema),
  retentionDays: Type.Integer({ minimum: 0 }),
});
export type TrashListResponse = Static<typeof TrashListResponseSchema>;

export const CategorySummarySchema = Type.Object({
  category: LibraryCategorySchema,
  files: Type.Integer({ minimum: 0 }),
  bytes: Type.Integer({ minimum: 0 }),
});
export type CategorySummary = Static<typeof CategorySummarySchema>;

export const LibrarySummaryResponseSchema = Type.Object({
  totals: Type.Object({
    files: Type.Integer({ minimum: 0 }),
    folders: Type.Integer({ minimum: 0 }),
    bytes: Type.Integer({ minimum: 0 }),
    tags: Type.Integer({ minimum: 0 }),
    trashedFiles: Type.Integer({ minimum: 0 }),
    trashedFolders: Type.Integer({ minimum: 0 }),
  }),
  /** Every category is always present, including empty ones, with real counts. */
  categories: Type.Array(CategorySummarySchema),
  recent: Type.Array(FileSummarySchema),
  largest: Type.Array(FileSummarySchema),
});
export type LibrarySummaryResponse = Static<typeof LibrarySummaryResponseSchema>;

export const SearchResponseSchema = Type.Object({
  query: Type.String(),
  files: Type.Array(FileSummarySchema),
  folders: Type.Array(FolderSummarySchema),
});
export type SearchResponse = Static<typeof SearchResponseSchema>;

export const MutationResponseSchema = Type.Object({
  ok: Type.Literal(true),
  /** Rows actually affected; useful for bulk operations. */
  affected: Type.Integer({ minimum: 0 }),
});
export type MutationResponse = Static<typeof MutationResponseSchema>;
