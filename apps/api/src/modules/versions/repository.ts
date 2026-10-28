import type { RestoreVersionResponse } from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { toCount } from '../../database/values';
import { ApiError } from '../../errors';
import { getFile } from '../library/files-repository';
import { recordAuditEvent } from '../audit/repository';
import { listVersions } from '../uploads/repository';

/**
 * Restoring a version never mutates ciphertext or an existing version row
 * (file_versions is immutable by trigger, SRS B5). It appends a new version that
 * references the *same* storage object and manifest, records which version it
 * came from, and moves the file's current-version pointer to it. Older versions
 * and their provider references are preserved, so shares of them keep working.
 */

interface SourceRow {
  id: string;
  versionNumber: number;
  sizeBytes: unknown;
  ciphertextHash: string;
  plaintextFingerprint: string | null;
  encryptionFormatVersion: string;
  manifest: unknown;
  storageObjectId: string;
  currentVersionId: string | null;
}

interface InsertedRow {
  id: string;
}

export async function restoreFileVersion(
  db: Db,
  userId: string,
  fileId: string,
  versionId: string,
): Promise<RestoreVersionResponse> {
  const restored = await db.transaction(async (tx) => {
    const { rows } = await tx.query<SourceRow>(
      `select
         v.id,
         v.version_number as "versionNumber",
         v.size_bytes as "sizeBytes",
         v.ciphertext_hash as "ciphertextHash",
         v.plaintext_fingerprint as "plaintextFingerprint",
         v.encryption_format_version as "encryptionFormatVersion",
         v.encryption_manifest as manifest,
         v.storage_object_id as "storageObjectId",
         f.current_version_id as "currentVersionId"
       from public.file_versions v
       join public.files f on f.user_id = v.user_id and f.id = v.file_id
      where v.user_id = $1 and v.file_id = $2 and v.id = $3
        and f.deleted_at is null
      for update of f`,
      [userId, fileId, versionId],
    );
    const source = rows[0];
    if (!source) {
      throw new ApiError('VERSION_NOT_FOUND', 404, 'That file version does not exist.');
    }

    const next = await tx.query<{ nextVersion: unknown }>(
      `select coalesce(max(version_number), 0) + 1 as "nextVersion"
         from public.file_versions
        where user_id = $1 and file_id = $2`,
      [userId, fileId],
    );
    const versionNumber = toCount(next.rows[0]?.nextVersion);
    if (versionNumber < 2) {
      throw new ApiError('INTERNAL_ERROR', 500, 'The next version number could not be computed.');
    }

    const inserted = await tx.query<InsertedRow>(
      `insert into public.file_versions
         (user_id, file_id, version_number, size_bytes, ciphertext_hash,
          plaintext_fingerprint, encryption_format_version, encryption_manifest,
          storage_object_id, created_by, restored_from_version_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $1, $10)
       returning id`,
      [
        userId,
        fileId,
        versionNumber,
        toCount(source.sizeBytes),
        source.ciphertextHash,
        source.plaintextFingerprint,
        source.encryptionFormatVersion,
        JSON.stringify(source.manifest),
        source.storageObjectId,
        source.id,
      ],
    );
    const created = inserted.rows[0];
    if (!created) {
      throw new ApiError('INTERNAL_ERROR', 500, 'The restored version could not be created.');
    }

    await tx.query(
      `update public.files
          set current_version_id = $3,
              logical_size_bytes = $4,
              content_fingerprint = $5
        where user_id = $1 and id = $2`,
      [
        userId,
        fileId,
        created.id,
        toCount(source.sizeBytes),
        source.plaintextFingerprint,
      ],
    );

    await recordAuditEvent(tx, userId, {
      eventType: 'version.restore',
      resourceType: 'file_version',
      resourceId: created.id,
      metadata: {
        fileId,
        restoredVersionId: created.id,
        sourceVersionId: source.id,
        versionNumber,
      },
    });

    return created.id;
  });

  const [file, versions] = await Promise.all([
    getFile(db, userId, fileId),
    listVersions(db, userId, fileId),
  ]);
  const version = versions.items.find((item) => item.id === restored);

  if (!file || !version) {
    throw new ApiError('INTERNAL_ERROR', 500, 'The restored version could not be loaded.');
  }

  return { file, version };
}
