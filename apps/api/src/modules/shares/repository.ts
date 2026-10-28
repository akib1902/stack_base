import { createHash, randomBytes } from 'node:crypto';
import type {
  CreateShareRequest,
  CreateShareResponse,
  EncryptionManifest,
  PublicShare,
  Share,
  ShareStatus,
  StorageProvider as StorageProviderName,
  WrappedKey,
} from '@stackbase/contracts';
import { EncryptionManifestSchema } from '@stackbase/contracts';
import { Value } from '@sinclair/typebox/value';
import type { Db, Queryable } from '../../database/db';
import { toCount, toIsoString } from '../../database/values';
import { ApiError } from '../../errors';
import type { ProviderReference } from '../../storage/types';
import { recordAuditEvent } from '../audit/repository';

/**
 * Revocable share links (SRS A7). The API stores only a SHA-256 of the raw
 * token and the version's data key wrapped under a share-specific secret. It can
 * therefore serve ciphertext and enforce expiry/revocation/download limits
 * without ever being able to decrypt the shared content.
 */

const SHARE_TOKEN_BYTES = 32;
const SHARE_TOKEN_LENGTH = 43; // base64url of 32 bytes

export const SHARE_TOKEN_PATTERN = '^[A-Za-z0-9_-]{43}$';

const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

const generateToken = (): string => randomBytes(SHARE_TOKEN_BYTES).toString('base64url');

const nullableIso = (value: unknown): string | null =>
  value === null || value === undefined ? null : toIsoString(value);

const parseManifest = (value: unknown): EncryptionManifest => {
  if (!Value.Check(EncryptionManifestSchema, value)) {
    throw new ApiError(
      'STORAGE_RECONCILIATION_REQUIRED',
      409,
      'The stored encryption manifest is invalid.',
    );
  }
  return value as EncryptionManifest;
};

interface OwnerShareRow {
  id: string;
  fileId: string;
  fileName: string;
  versionId: string;
  versionNumber: unknown;
  permission: string;
  createdAt: unknown;
  expiresAt: unknown;
  maxDownloads: unknown;
  downloadCount: unknown;
  revokedAt: unknown;
}

const OWNER_SHARE_SELECT = `
  select s.id,
         v.file_id as "fileId",
         f.name as "fileName",
         s.file_version_id as "versionId",
         v.version_number as "versionNumber",
         s.permission,
         s.created_at as "createdAt",
         s.expires_at as "expiresAt",
         s.max_downloads as "maxDownloads",
         s.download_count as "downloadCount",
         s.revoked_at as "revokedAt"
    from public.shares s
    join public.file_versions v on v.user_id = s.user_id and v.id = s.file_version_id
    join public.files f on f.user_id = v.user_id and f.id = v.file_id
`;

function statusOf(row: OwnerShareRow): ShareStatus {
  if (row.revokedAt !== null && row.revokedAt !== undefined) return 'revoked';
  const expiresAt = row.expiresAt === null || row.expiresAt === undefined
    ? null
    : Date.parse(toIsoString(row.expiresAt));
  if (expiresAt !== null && Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
    return 'expired';
  }
  const maxDownloads = row.maxDownloads === null || row.maxDownloads === undefined
    ? null
    : toCount(row.maxDownloads);
  if (maxDownloads !== null && toCount(row.downloadCount) >= maxDownloads) {
    return 'exhausted';
  }
  return 'active';
}

function mapOwnerShare(row: OwnerShareRow): Share {
  const maxDownloads = row.maxDownloads === null || row.maxDownloads === undefined
    ? null
    : toCount(row.maxDownloads);
  return {
    id: row.id,
    fileId: row.fileId,
    fileName: row.fileName,
    versionId: row.versionId,
    versionNumber: toCount(row.versionNumber),
    permission: 'read',
    createdAt: toIsoString(row.createdAt),
    expiresAt: nullableIso(row.expiresAt),
    maxDownloads,
    downloadCount: toCount(row.downloadCount),
    revokedAt: nullableIso(row.revokedAt),
    status: statusOf(row),
  };
}

function normalizeExpiry(value: string | null | undefined): Date | null {
  if (value === undefined || value === null) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new ApiError('VALIDATION_ERROR', 400, 'The expiration timestamp is not a valid date.');
  }
  if (parsed <= Date.now()) {
    throw new ApiError('VALIDATION_ERROR', 400, 'The expiration must be in the future.');
  }
  return new Date(parsed);
}

async function loadOwnerShare(
  db: Db | Queryable,
  userId: string,
  shareId: string,
): Promise<Share | null> {
  const { rows } = await db.query<OwnerShareRow>(
    `${OWNER_SHARE_SELECT} where s.user_id = $1 and s.id = $2`,
    [userId, shareId],
  );
  return rows[0] ? mapOwnerShare(rows[0]) : null;
}

export async function listShares(
  db: Db,
  userId: string,
  fileId?: string,
): Promise<Share[]> {
  const { rows } = await db.query<OwnerShareRow>(
    `${OWNER_SHARE_SELECT}
      where s.user_id = $1 ${fileId ? 'and v.file_id = $2' : ''}
      order by s.created_at desc`,
    fileId ? [userId, fileId] : [userId],
  );
  return rows.map(mapOwnerShare);
}

export async function createShare(
  db: Db,
  userId: string,
  input: CreateShareRequest,
): Promise<CreateShareResponse> {
  const expiresAt = normalizeExpiry(input.expiresAt);
  const maxDownloads = input.maxDownloads === undefined ? null : input.maxDownloads;

  const target = await db.query<{
    versionNumber: unknown;
    fileName: string;
    storageStatus: string;
  }>(
    `select v.version_number as "versionNumber", f.name as "fileName",
            o.storage_status as "storageStatus"
       from public.file_versions v
       join public.files f on f.user_id = v.user_id and f.id = v.file_id
       join public.storage_objects o on o.user_id = v.user_id and o.id = v.storage_object_id
      where v.user_id = $1 and v.id = $2 and v.file_id = $3
        and f.deleted_at is null`,
    [userId, input.versionId, input.fileId],
  );
  const version = target.rows[0];
  if (!version) {
    throw new ApiError('VERSION_NOT_FOUND', 404, 'That file version does not exist.');
  }
  if (version.storageStatus !== 'available') {
    throw new ApiError(
      'STORAGE_RECONCILIATION_REQUIRED',
      409,
      'This version is not currently available on the storage provider.',
    );
  }

  const token = generateToken();
  const tokenHash = hashToken(token);

  const shareId = await db.transaction(async (tx) => {
    const { rows } = await tx.query<{ id: string }>(
      `insert into public.shares
         (user_id, file_version_id, token_hash, wrapped_key, expires_at, max_downloads)
       values ($1, $2, $3, $4::jsonb, $5, $6)
       returning id`,
      [
        userId,
        input.versionId,
        tokenHash,
        JSON.stringify(input.wrappedKey),
        expiresAt?.toISOString() ?? null,
        maxDownloads,
      ],
    );
    const created = rows[0];
    if (!created) {
      throw new ApiError('INTERNAL_ERROR', 500, 'The share link could not be created.');
    }
    await recordAuditEvent(tx, userId, {
      eventType: 'share.create',
      resourceType: 'share',
      resourceId: created.id,
      metadata: {
        fileId: input.fileId,
        versionId: input.versionId,
        expiresAt: expiresAt?.toISOString() ?? null,
        maxDownloads,
      },
    });
    return created.id;
  });

  const share = await loadOwnerShare(db, userId, shareId);
  if (!share) {
    throw new ApiError('INTERNAL_ERROR', 500, 'The share link could not be loaded.');
  }
  return { share, token };
}

export async function revokeShare(db: Db, userId: string, shareId: string): Promise<Share> {
  const updated = await db.transaction(async (tx) => {
    const { rows } = await tx.query<{ id: string; revokedAt: unknown }>(
      'select id, revoked_at as "revokedAt" from public.shares where user_id = $1 and id = $2',
      [userId, shareId],
    );
    const row = rows[0];
    if (!row) {
      throw new ApiError('SHARE_NOT_FOUND', 404, 'That share link does not exist.');
    }
    if (row.revokedAt === null || row.revokedAt === undefined) {
      await tx.query(
        'update public.shares set revoked_at = now() where user_id = $1 and id = $2',
        [userId, shareId],
      );
      await recordAuditEvent(tx, userId, {
        eventType: 'share.revoke',
        resourceType: 'share',
        resourceId: shareId,
      });
    }
    return true;
  });

  const share = await loadOwnerShare(db, userId, shareId);
  if (!share || !updated) {
    throw new ApiError('SHARE_NOT_FOUND', 404, 'That share link does not exist.');
  }
  return share;
}

// ---------------------------------------------------------------------------
// Public access
// ---------------------------------------------------------------------------

interface PublicRow {
  shareId: string;
  userId: string;
  fileId: string;
  versionId: string;
  createdAt: unknown;
  expiresAt: unknown;
  maxDownloads: unknown;
  downloadCount: unknown;
  revokedAt: unknown;
  wrappedKey: unknown;
  fileName: string;
  mimeType: string;
  fileDeletedAt: unknown;
  versionNumber: unknown;
  sizeBytes: unknown;
  encryptionFormatVersion: string;
  manifest: unknown;
  provider: StorageProviderName;
  providerReference: unknown;
  storageStatus: string;
}

export interface PublicShareTarget {
  shareId: string;
  userId: string;
  fileId: string;
  versionId: string;
  provider: StorageProviderName;
  reference: ProviderReference;
  view: PublicShare;
}

function mapPublicShare(row: PublicRow): PublicShare {
  const manifest = parseManifest(row.manifest);
  const maxDownloads = row.maxDownloads === null || row.maxDownloads === undefined
    ? null
    : toCount(row.maxDownloads);
  const downloadCount = toCount(row.downloadCount);
  return {
    shareId: row.shareId,
    createdAt: toIsoString(row.createdAt),
    expiresAt: nullableIso(row.expiresAt),
    maxDownloads,
    downloadCount,
    remainingDownloads:
      maxDownloads === null ? null : Math.max(0, maxDownloads - downloadCount),
    permission: 'read',
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: toCount(row.sizeBytes),
    versionNumber: toCount(row.versionNumber),
    ciphertextSizeBytes: manifest.ciphertextSize,
    encryptionFormatVersion: row.encryptionFormatVersion,
    manifest,
    wrappedKey: row.wrappedKey as WrappedKey,
  };
}

function unavailableReason(row: PublicRow): void {
  if (row.fileDeletedAt !== null && row.fileDeletedAt !== undefined) {
    throw new ApiError(
      'SHARE_FILE_UNAVAILABLE',
      410,
      'The owner removed this file, so the share is no longer available.',
    );
  }
  if (row.revokedAt !== null && row.revokedAt !== undefined) {
    throw new ApiError('SHARE_REVOKED', 410, 'This share link was revoked by its owner.');
  }
  const expiresAt = row.expiresAt === null || row.expiresAt === undefined
    ? null
    : Date.parse(toIsoString(row.expiresAt));
  if (expiresAt !== null && Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
    throw new ApiError('SHARE_EXPIRED', 410, 'This share link has expired.');
  }
  const maxDownloads = row.maxDownloads === null || row.maxDownloads === undefined
    ? null
    : toCount(row.maxDownloads);
  if (maxDownloads !== null && toCount(row.downloadCount) >= maxDownloads) {
    throw new ApiError(
      'SHARE_DOWNLOAD_LIMIT_REACHED',
      410,
      'This share link reached its download limit.',
    );
  }
}

/**
 * Resolve a raw token to its share. Every refusal is an ApiError with a stable
 * code and no metadata about the file, so a recipient cannot probe content they
 * were not granted.
 */
export async function loadPublicShare(
  db: Db,
  token: string,
): Promise<PublicShareTarget> {
  if (token.length !== SHARE_TOKEN_LENGTH) {
    throw new ApiError('SHARE_NOT_FOUND', 404, 'That share link does not exist.');
  }

  const { rows } = await db.query<PublicRow>(
    `select s.id as "shareId",
            s.user_id as "userId",
            v.file_id as "fileId",
            v.id as "versionId",
            s.created_at as "createdAt",
            s.expires_at as "expiresAt",
            s.max_downloads as "maxDownloads",
            s.download_count as "downloadCount",
            s.revoked_at as "revokedAt",
            s.wrapped_key as "wrappedKey",
            f.name as "fileName",
            f.mime_type as "mimeType",
            f.deleted_at as "fileDeletedAt",
            v.version_number as "versionNumber",
            v.size_bytes as "sizeBytes",
            v.encryption_format_version as "encryptionFormatVersion",
            v.encryption_manifest as manifest,
            o.provider,
            o.provider_reference as "providerReference",
            o.storage_status as "storageStatus"
       from public.shares s
       join public.file_versions v on v.user_id = s.user_id and v.id = s.file_version_id
       join public.files f on f.user_id = v.user_id and f.id = v.file_id
       join public.storage_objects o on o.user_id = v.user_id and o.id = v.storage_object_id
      where s.token_hash = $1`,
    [hashToken(token)],
  );

  const row = rows[0];
  if (!row) {
    throw new ApiError('SHARE_NOT_FOUND', 404, 'That share link does not exist.');
  }
  unavailableReason(row);

  if (row.wrappedKey === null || row.wrappedKey === undefined) {
    throw new ApiError(
      'SHARE_KEY_UNAVAILABLE',
      409,
      'This share link predates share-specific key transfer and cannot be opened.',
    );
  }
  if (row.storageStatus !== 'available') {
    throw new ApiError(
      'STORAGE_RECONCILIATION_REQUIRED',
      409,
      'The shared content is not currently available on the storage provider.',
    );
  }
  if (typeof row.providerReference !== 'object' || row.providerReference === null) {
    throw new ApiError(
      'STORAGE_RECONCILIATION_REQUIRED',
      409,
      'The stored object reference is invalid.',
    );
  }

  return {
    shareId: row.shareId,
    userId: row.userId,
    fileId: row.fileId,
    versionId: row.versionId,
    provider: row.provider,
    reference: row.providerReference as ProviderReference,
    view: mapPublicShare(row),
  };
}

/**
 * Audit a refused public download. The owner is resolved from the token hash so
 * the trail stays owner-scoped; unknown tokens create no event (there is no
 * owner to attach it to). Never accepts or records the raw token.
 */
export async function recordShareDownloadDenied(
  db: Db,
  token: string,
  code: string,
): Promise<void> {
  const { rows } = await db.query<{ userId: string; shareId: string }>(
    'select user_id as "userId", id as "shareId" from public.shares where token_hash = $1',
    [hashToken(token)],
  );
  const row = rows[0];
  if (!row) return;
  await recordAuditEvent(db, row.userId, {
    eventType: 'share.download',
    resourceType: 'share',
    resourceId: row.shareId,
    result: 'denied',
    metadata: { reason: code },
  });
}

/**
 * Atomically claim one download under the share's expiry and limit. The
 * increment and the audit record share one transaction; a denied claim is
 * audited separately, after the failed transaction. A download that fails at
 * the provider after this point still consumes its claim (the attempt happened),
 * which is documented in the milestone report.
 */
export async function claimShareDownload(db: Db, target: PublicShareTarget): Promise<number> {
  const claimed = await db.transaction(async (tx) => {
    const { rows } = await tx.query<{ downloadCount: unknown }>(
      `update public.shares
          set download_count = download_count + 1
        where id = $1
          and revoked_at is null
          and (expires_at is null or expires_at > now())
          and (max_downloads is null or download_count < max_downloads)
        returning download_count as "downloadCount"`,
      [target.shareId],
    );
    const row = rows[0];
    if (!row) return null;

    const downloadCount = toCount(row.downloadCount);
    await recordAuditEvent(tx, target.userId, {
      eventType: 'share.download',
      resourceType: 'share',
      resourceId: target.shareId,
      metadata: {
        fileId: target.fileId,
        versionId: target.versionId,
        downloadCount,
      },
    });
    return downloadCount;
  });

  if (claimed !== null) return claimed;

  const { rows } = await db.query<{
    revokedAt: unknown;
    expiresAt: unknown;
    maxDownloads: unknown;
    downloadCount: unknown;
  }>(
    `select revoked_at as "revokedAt", expires_at as "expiresAt",
            max_downloads as "maxDownloads", download_count as "downloadCount"
       from public.shares where id = $1`,
    [target.shareId],
  );
  const row = rows[0];
  const reason = !row
    ? 'SHARE_NOT_FOUND'
    : row.revokedAt
      ? 'SHARE_REVOKED'
      : row.expiresAt && Date.parse(toIsoString(row.expiresAt)) <= Date.now()
        ? 'SHARE_EXPIRED'
        : 'SHARE_DOWNLOAD_LIMIT_REACHED';

  await recordAuditEvent(db, target.userId, {
    eventType: 'share.download',
    resourceType: 'share',
    resourceId: target.shareId,
    result: 'denied',
    metadata: { reason, fileId: target.fileId, versionId: target.versionId },
  });

  switch (reason) {
    case 'SHARE_NOT_FOUND':
      throw new ApiError('SHARE_NOT_FOUND', 404, 'That share link does not exist.');
    case 'SHARE_REVOKED':
      throw new ApiError('SHARE_REVOKED', 410, 'This share link was revoked by its owner.');
    case 'SHARE_EXPIRED':
      throw new ApiError('SHARE_EXPIRED', 410, 'This share link has expired.');
    default:
      throw new ApiError(
        'SHARE_DOWNLOAD_LIMIT_REACHED',
        410,
        'This share link reached its download limit.',
      );
  }
}
