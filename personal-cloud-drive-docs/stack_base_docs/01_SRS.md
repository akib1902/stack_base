# Software Requirements Specification (SRS)

## 1. Purpose

Define requirements for a web-first personal cloud-drive application
that stores encrypted file contents in Telegram while using Supabase
PostgreSQL for searchable organization metadata and durable application
state.

## 2. Scope

### In scope for the initial release

-   Single-user account with explicit ownership in the schema.
-   Authentication and authorization.
-   Folder hierarchy, file metadata, tags, favorites and filtering.
-   Client-side encryption of file contents.
-   Telegram MTProto storage adapter with an enforced application-level
    file-size limit.
-   Resumable upload sessions, per-part status, retry and integrity
    checks.
-   Immutable file versions, trash, restoration and retention-aware
    cleanup.
-   Revocable share links with expiry and optional password protection.
-   Audit events, reconciliation jobs and operational metrics.

### Deferred

-   Android client.
-   Multi-user collaboration.
-   Semantic search and server-side text extraction.
-   Cross-user deduplication.
-   Microservices and mandatory external queue infrastructure.
-   Alternative storage provider implementation; keep the interface
    extensible but do not implement fallback in v1.

## 3. Users and roles

-   **Owner:** the authenticated account that manages files and
    settings.
-   **Share recipient:** a person holding a valid share capability,
    limited to its permission, expiry and download constraints.
-   **Worker:** a server-side process authorized to perform specific
    background tasks, without access to decryption keys.

## 4. Functional requirements

### FR-01 Authentication

-   Authenticate through Supabase Auth.
-   Validate identity on every protected API request.
-   Derive owner identity from the validated token, never from a
    client-supplied owner ID.
-   Keep privileged Supabase credentials and Telegram session
    credentials server-side.

### FR-02 File and folder management

-   Create, rename, move and soft-delete files and folders.
-   Support nested folders, tags, favorites, recent files and sorting.
-   Preserve stable logical file IDs across moves and versions.
-   Prevent folder cycles and cross-owner relationships.

### FR-03 Metadata search

-   Filter by filename, file type, size, created/modified date, folder
    and tags.
-   Support sorting and pagination.
-   Keep organization metadata server-readable in v1.
-   Defer extracted-text and semantic search.

### FR-04 Encrypted storage

-   Encrypt file contents on the client before upload.
-   Store ciphertext and encrypted manifests in Telegram.
-   Store only required provider references and cryptographic metadata
    in PostgreSQL.
-   Never transmit plaintext decryption keys to the API.
-   Enforce a configured maximum file size based on verified provider
    capabilities.

### FR-05 Resumable upload

-   Create durable upload sessions with an idempotency key and request
    fingerprint.
-   Track every part and its acknowledgment state.
-   Report progress based on acknowledged parts, not bytes merely sent
    by the browser.
-   Retry transient failures with exponential backoff and jitter.
-   Resume after page refresh or application restart.
-   Re-upload missing parts if Telegram's temporary upload state has
    expired.
-   Finalize only after all required parts are verified.
-   Prevent duplicate logical commits.

### FR-06 Version history

-   Create an immutable version for every successful content update.
-   Restore an old version by creating a new current version or a new
    immutable restore event; never overwrite history.
-   Ensure the current-version pointer references a version belonging to
    the same file.
-   Preserve versions referenced by valid shares and retention policies.

### FR-07 Trash and recovery

-   Use soft deletion before permanent deletion.
-   Apply a configurable trash-retention period.
-   Prevent cleanup while any live version, share or operation
    references an object.
-   Record deletion and restoration in the audit trail.

### FR-08 Sharing

-   Generate high-entropy random share tokens.
-   Store token hashes rather than raw bearer tokens.
-   Support expiry, revocation, read-only permissions, optional password
    protection and download limits.
-   Enforce limits atomically.
-   Do not expose Telegram identifiers or permanent provider URLs to
    recipients.
-   Provide a secure way for the recipient to obtain the relevant
    decryption key.

### FR-09 Storage integrity

-   Verify ciphertext-part hashes and authenticated manifest integrity.
-   Detect missing, corrupt, duplicated or reordered parts.
-   Distinguish logical size from ciphertext/provider storage size.
-   Run reconciliation for provider writes that succeeded while the
    database update failed.

### FR-10 Audit and operations

-   Record security-sensitive actions and important lifecycle
    transitions.
-   Redact credentials, raw share tokens, keys and file contents from
    logs.
-   Monitor stuck uploads, failed jobs, missing objects and retry
    exhaustion.

### FR-11 Future Android compatibility

-   Use platform-neutral API contracts.
-   Keep upload state on the server and make client operations
    idempotent.
-   Defer Android implementation until web upload and recovery behavior
    is stable.

## 5. Non-functional requirements

-   Security: TLS, client-side content encryption, owner-scoped
    authorization and least privilege.
-   Reliability: durable state and recovery after process/client
    restarts.
-   Integrity: detect missing, reordered or corrupted parts.
-   Maintainability: migrations, typed contracts, tests and documented
    architecture decisions.
-   Performance: paginated metadata access and indexed common filters.
-   Portability: provider-specific identifiers remain inside the storage
    adapter/domain mapping.
-   Accessibility: keyboard-operable, responsive UI and readable
    contrast.

## 6. Acceptance criteria

1.  A user can sign in and manage folders/files without cross-owner
    access.
2.  A file is encrypted before any storage-provider call.
3.  A stored file can be retrieved and decrypted after a browser refresh
    and API restart.
4.  Repeated upload initiation with the same idempotency key does not
    create duplicate commits.
5.  Corrupt or missing parts prevent finalization.
6.  A previous version can be restored without destroying newer history.
7.  Expired/revoked shares and exhausted download limits are rejected.
8.  Cleanup never deletes objects still referenced by retained versions
    or shares.
9.  Telegram session material and encryption secrets never appear in
    client bundles or logs.
10. The documented backup and key-recovery drill succeeds.

## 7. Assumptions and constraints

-   Telegram is a bounded storage provider, not an unlimited object
    store.
-   Exact upload limits, client-library behavior, account restrictions
    and retrieval behavior must be validated before setting the product
    maximum.
-   Server-readable filenames, tags, dates, sizes and folder
    relationships are intentionally not protected by content E2EE.
-   Browser compromise can expose plaintext while a file is open.
