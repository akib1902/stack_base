import { Type, type Static } from '@sinclair/typebox';
import { WrappedKeySchema } from './encryption';
import { EncryptionManifestSchema } from './uploads';

/**
 * Revocable share links (SRS A7). A share pins one immutable file version and
 * stores only a hash of the raw token plus a data key wrapped under a
 * share-specific secret that travels in the URL fragment. The server can never
 * decrypt the shared content, and the owner's vault key is never involved.
 */

export const SHARE_STATUSES = ['active', 'expired', 'revoked', 'exhausted'] as const;

export const ShareStatusSchema = Type.Union([
  Type.Literal('active'),
  Type.Literal('expired'),
  Type.Literal('revoked'),
  Type.Literal('exhausted'),
]);
export type ShareStatus = Static<typeof ShareStatusSchema>;

export const ShareSchema = Type.Object({
  id: Type.String(),
  fileId: Type.String(),
  fileName: Type.String(),
  versionId: Type.String(),
  versionNumber: Type.Integer({ minimum: 1 }),
  permission: Type.Literal('read'),
  createdAt: Type.String(),
  expiresAt: Type.Union([Type.String(), Type.Null()]),
  maxDownloads: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
  downloadCount: Type.Integer({ minimum: 0 }),
  revokedAt: Type.Union([Type.String(), Type.Null()]),
  status: ShareStatusSchema,
});
export type Share = Static<typeof ShareSchema>;

export const ShareListResponseSchema = Type.Object({
  items: Type.Array(ShareSchema),
});
export type ShareListResponse = Static<typeof ShareListResponseSchema>;

export const ShareListQuerySchema = Type.Object({
  fileId: Type.Optional(Type.String({ maxLength: 36 })),
});
export type ShareListQuery = Static<typeof ShareListQuerySchema>;

export const CreateShareRequestSchema = Type.Object(
  {
    fileId: Type.String({ minLength: 1, maxLength: 36 }),
    versionId: Type.String({ minLength: 1, maxLength: 36 }),
    /** The version's data key, wrapped under the URL-fragment share key. */
    wrappedKey: WrappedKeySchema,
    /** ISO timestamp; omitted or null means the link never expires. */
    expiresAt: Type.Optional(Type.Union([Type.String({ minLength: 10, maxLength: 40 }), Type.Null()])),
    maxDownloads: Type.Optional(
      Type.Union([Type.Integer({ minimum: 1, maximum: 100_000 }), Type.Null()]),
    ),
  },
  { additionalProperties: false },
);
export type CreateShareRequest = Static<typeof CreateShareRequestSchema>;

export const CreateShareResponseSchema = Type.Object({
  share: ShareSchema,
  /**
   * The raw bearer token. Returned exactly once, because only its SHA-256 hash
   * is stored; the client puts it in the link path and keeps the fragment key
   * out of every request.
   */
  token: Type.String({ minLength: 43, maxLength: 43 }),
});
export type CreateShareResponse = Static<typeof CreateShareResponseSchema>;

export const RevokeShareResponseSchema = Type.Object({
  share: ShareSchema,
});
export type RevokeShareResponse = Static<typeof RevokeShareResponseSchema>;

/** Metadata a recipient may see before downloading (SRS A7.2). */
export const PublicShareSchema = Type.Object({
  shareId: Type.String(),
  createdAt: Type.String(),
  expiresAt: Type.Union([Type.String(), Type.Null()]),
  maxDownloads: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
  downloadCount: Type.Integer({ minimum: 0 }),
  /** Null when the share is unlimited. */
  remainingDownloads: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
  permission: Type.Literal('read'),
  fileName: Type.String(),
  mimeType: Type.String(),
  sizeBytes: Type.Integer({ minimum: 0 }),
  versionNumber: Type.Integer({ minimum: 1 }),
  ciphertextSizeBytes: Type.Integer({ minimum: 0 }),
  encryptionFormatVersion: Type.String(),
  manifest: EncryptionManifestSchema,
  wrappedKey: WrappedKeySchema,
});
export type PublicShare = Static<typeof PublicShareSchema>;
