# Database Schema Documentation

## 1. Principles

-   Logical files, immutable versions, physical objects and upload
    sessions are separate entities.
-   Every owned record must be scoped to the owner.
-   Metadata is server-readable by design; file bytes remain encrypted.
-   Use UUIDs for internal identifiers.
-   Use `timestamptz` for timestamps and `bigint` for byte sizes.
-   Use migrations, constraints and transactions rather than relying
    only on application checks.

## 2. Tables

### profiles

`id UUID PK REFERENCES auth.users(id)`, `display_name TEXT`,
`settings JSONB`, `created_at`, `updated_at`.

### folders

`id UUID PK`, `owner_id UUID`, `parent_id UUID NULL`, `name TEXT`,
`created_at`, `updated_at`, `deleted_at NULL`. - Parent must belong to
same owner. - Prevent self-parenting and cycles. - Decide and enforce
whether active folder names are unique per parent.

### files

`id UUID PK`, `owner_id UUID`, `folder_id UUID NULL`, `name TEXT`,
`mime_type TEXT`, `size_bytes BIGINT`, `status`,
`current_version_id UUID NULL`, `created_at`, `updated_at`,
`deleted_at`. - Stable logical identity across rename, move and version
creation. - Current version must belong to this file.

### file_versions

`id UUID PK`, `file_id UUID`, `version_number INT`, `size_bytes BIGINT`,
`ciphertext_size_bytes BIGINT`, `content_hash BYTEA NULL`,
`manifest_ciphertext BYTEA`, `wrapped_dek BYTEA`, `crypto_version INT`,
`manifest_format_version INT`, `crypto_algorithm TEXT`,
`key_envelope_version INT`, `created_at`, `created_by UUID`,
`committed_at`. - Unique `(file_id, version_number)`. - Committed
versions are immutable. - Avoid exposing plaintext hashes if equality
leakage is unacceptable.

### storage_objects

`id UUID PK`, `provider TEXT`, `provider_object_key TEXT`,
`provider_file_id TEXT NULL`, `ciphertext_hash BYTEA`,
`ciphertext_size_bytes BIGINT`, `status`, `created_at`, `verified_at`,
`last_verified_at`, `deletion_after`. - Unique
`(provider, provider_object_key)`. - Store stable identifiers, not
temporary download URLs. - Treat provider references as sensitive
operational metadata.

### version_parts

`version_id UUID`, `part_index INT`, `storage_object_id UUID`,
`plaintext_size_bytes BIGINT`, `ciphertext_size_bytes BIGINT`,
`ciphertext_hash BYTEA`. - Primary key `(version_id, part_index)`. -
Part ordering and cryptographic metadata must agree with the
authenticated manifest.

### tags

`id UUID PK`, `owner_id UUID`, `name TEXT`, `normalized_name TEXT`,
`color TEXT NULL`, `created_at`. - Unique `(owner_id, normalized_name)`.

### file_tags

`file_id UUID`, `tag_id UUID`, `created_at`. - Primary key
`(file_id, tag_id)`. - Enforce same-owner relationship.

### upload_sessions

`id UUID PK`, `owner_id UUID`, `file_id UUID NULL`,
`target_folder_id UUID NULL`, `idempotency_key TEXT`,
`request_fingerprint BYTEA`, `original_name TEXT`,
`expected_size_bytes BIGINT`, `expected_part_count INT`, `status`,
`completed_parts INT`, `created_at`, `expires_at`, `last_activity_at`,
`lease_expires_at`, `attempt_count`, `last_error_code`,
`finalized_at`. - Unique `(owner_id, idempotency_key)`. - Reject reuse
of a key with a different request fingerprint. - Enforce legal state
transitions.

### upload_parts

`upload_session_id UUID`, `part_index INT`,
`expected_size_bytes BIGINT`, `expected_ciphertext_hash BYTEA NULL`,
`status`, `storage_object_id UUID NULL`, `attempt_count INT`,
`last_error_code TEXT NULL`, `updated_at`. - Primary key
`(upload_session_id, part_index)`. - Only mark stored after provider
acknowledgment and required verification.

### share_links

`id UUID PK`, `owner_id UUID`, `file_id UUID`, `version_id UUID NULL`,
`token_hash BYTEA UNIQUE`, `permissions TEXT`, `expires_at`,
`max_downloads BIGINT NULL`, `download_count BIGINT`,
`password_hash TEXT NULL`, `revoked_at`, `created_at`. - Store token
hashes, not raw tokens. - Pin a version when sharing must refer to exact
content. - Enforce download limits atomically.

### audit_events

`id UUID PK`, `owner_id UUID`, `actor_type TEXT`, `action TEXT`,
`entity_type TEXT`, `entity_id UUID NULL`, `request_id UUID NULL`,
`metadata JSONB`, `created_at`. - Append-only at application level. -
Never include secrets, keys, raw share tokens or file contents.

### sync_operations

`id UUID PK`, `owner_id UUID`, `device_id UUID NULL`,
`operation_id UUID`, `entity_type TEXT`, `entity_id UUID NULL`,
`operation_type TEXT`, `base_revision BIGINT NULL`,
`result_revision BIGINT NULL`, `payload JSONB`, `status`,
`conflict_status`, `created_at`, `processed_at`. - Unique
`(owner_id, operation_id)`. - Initially support only API readiness;
Android sync is deferred.

### device_sessions

Track registered devices, last-seen time, revocation state and
synchronization cursor. Do not use device IDs as authentication secrets.

### account_key_envelopes

Store versioned encrypted account-key/recovery envelopes and non-secret
algorithm/KDF metadata. Never store plaintext keys or recovery phrases.

### storage_object_references

Track each logical reference to a physical object, including reference
type and ID. The system must transactionally maintain these references
and verify their target entity exists.

### job_outbox

Persist post-transaction work with event type, aggregate ID, payload,
status, attempts, availability time, lease and processed time. Workers
must claim jobs safely and execute idempotently.

## 3. Recommended indexes

-   Files `(owner_id, folder_id, updated_at DESC)`.
-   Files active/trash lookup.
-   Versions `(file_id, version_number DESC)`.
-   Tags `(owner_id, normalized_name)`.
-   Uploads `(owner_id, status)` and expiry.
-   Shares by owner and expiry.
-   Storage objects by status and verification time.
-   Outbox by availability time for pending jobs.
-   References by storage object ID.

## 4. Required integrity rules

1.  File/folder/tag/share ownership relationships must be enforced.
2.  Folder moves cannot create cycles.
3.  A current version must belong to the same file.
4.  Committed version content metadata cannot be mutated.
5.  Part indices are unique within a version/session.
6.  Finalization and current-version pointer updates happen in a
    transaction.
7.  Permanent deletion checks references and retention rules.
8.  Share download counters are updated atomically.
9.  The outbox event is inserted in the same transaction as the state
    change that requires it.
10. RLS is enabled on all exposed tables, with explicit grants and
    tested policies.

## 5. Migration order

1.  Profiles and folders.
2.  Files and file versions.
3.  Storage objects and version parts.
4.  Tags and file_tags.
5.  Upload sessions and upload parts.
6.  Shares and audit events.
7.  Object references and outbox.
8.  Device sessions and key envelopes when needed.
9.  Indexes, triggers, RLS policies and integration tests.
