# Test Plan

## 1. Objectives

Verify correctness, confidentiality, authorization, durability,
integrity, recoverability and predictable behavior under failures.

## 2. Test layers

-   Unit: state machines, validation, retry policies, crypto-format
    helpers and permission decisions.
-   Integration: PostgreSQL constraints, RLS, repositories, provider
    adapter and outbox workers.
-   API: Fastify route contracts, auth, error handling and idempotency.
-   E2E: browser upload/download, refresh recovery, version restore and
    share redemption.
-   Security: IDOR, XSS-sensitive surfaces, secret leakage, token
    enumeration and rate limits.
-   Resilience: network loss, process restarts, provider errors and
    partial commits.

## 3. Core scenarios

### Authentication/authorization

-   Unauthenticated request to private endpoint is rejected.
-   User cannot read/update/delete a file by guessing another owner's
    ID.
-   File cannot be moved into another owner's folder.
-   Tag, share and version references cannot cross owner boundaries.
-   RLS tests cover allowed and denied operations.

### Upload

-   Initiation with a new idempotency key creates one session.
-   Repeated initiation with same key and same fingerprint returns same
    session.
-   Same key with different fingerprint returns conflict.
-   Invalid part index and oversized part are rejected.
-   A part is not acknowledged before required persistence.
-   Retry of identical part is idempotent.
-   Conflicting content for the same part index is rejected.
-   Refresh and restart recover acknowledged part state.
-   Expired Telegram temporary upload state triggers safe re-upload of
    missing parts.
-   Concurrent finalization produces one committed version.
-   Provider success followed by DB failure is reconciled.
-   Permanent provider errors do not retry forever.

### Integrity and encryption

-   Correct key decrypts a valid file.
-   Wrong key fails safely.
-   Modified ciphertext/tag fails authentication.
-   Missing, reordered, duplicated or truncated parts are detected.
-   Manifest/part metadata mismatch prevents completion.
-   Decryption keys never appear in API requests, database plaintext
    fields or logs.
-   File contents are encrypted before provider interaction.

### Versions and trash

-   Every committed upload creates a new version.
-   Committed version metadata cannot be mutated.
-   Restore does not destroy newer versions.
-   Trashed file can be restored during retention.
-   Permanent cleanup waits until no live references or retention
    constraints remain.
-   Failure during cleanup is safely retryable.

### Sharing

-   Valid link grants only its configured permission.
-   Expired and revoked links are rejected.
-   Wrong password is rejected with rate limiting.
-   Concurrent downloads cannot exceed max_downloads.
-   Token values and decryption secrets do not appear in logs.
-   Recipient cannot enumerate other files or provider objects.

### Provider and operations

-   Provider session survives a process restart or requires documented
    re-authentication.
-   Object retrieval works from persisted identifiers.
-   Missing object is detected by reconciliation.
-   Cleanup never deletes an object still referenced by a retained
    version.
-   Job lease expiry permits safe retry.
-   Duplicate outbox delivery does not duplicate side effects.

### UI and usability

-   Upload progress reflects acknowledged work.
-   Pause/resume/retry states are understandable.
-   Large unsupported file is rejected before upload begins.
-   Errors provide a request ID without revealing secrets.
-   Keyboard navigation and responsive layout are checked.

## 4. Release gates

Do not release until: - All critical authorization tests pass. -
Encryption round-trip and tamper tests pass. - Upload idempotency and
recovery tests pass. - Version restoration and cleanup-reference tests
pass. - Share expiry/revocation/limits tests pass. - A metadata backup
and key-recovery drill succeeds.

## 5. Test data

Use synthetic files only. Include zero-byte files if supported, small
files, files around configured part boundaries, maximum-size files,
random binary files and corrupted ciphertext fixtures. Do not use real
sensitive documents in automated logs or shared test environments.
