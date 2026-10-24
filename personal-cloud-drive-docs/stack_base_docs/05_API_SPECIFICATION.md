# REST API Specification --- v1

Base path: `/api/v1`. JSON requests/responses unless an endpoint streams
encrypted bytes. All private routes require authentication. All request
schemas must be validated. The API must not accept arbitrary provider
identifiers as authorization.

## 1. Conventions

-   Use UUIDs for resource IDs.
-   Use UTC ISO-8601 timestamps.
-   Use cursor pagination for large lists.
-   Standard errors: `code`, `message`, `requestId`, optional field
    errors.
-   Never return secrets, Telegram session details or permanent provider
    URLs.
-   Derive owner identity from authenticated context.
-   Require idempotency keys for upload initiation and
    finalization-sensitive operations.

## 2. Endpoints

### Files and folders

-   `GET /files` --- list/filter files; query: `folderId`, `tag`,
    `mimeType`, `minSize`, `maxSize`, `updatedAfter`, `updatedBefore`,
    `sort`, `cursor`, `limit`.
-   `POST /folders` --- create folder.
-   `PATCH /folders/:id` --- rename or move folder.
-   `DELETE /folders/:id` --- soft-delete subject to non-empty-folder
    policy.
-   `GET /files/:id` --- metadata for authorized file.
-   `PATCH /files/:id` --- rename/move/update supported metadata.
-   `DELETE /files/:id` --- move file to trash.
-   `POST /files/:id/restore-trash` --- restore trashed file.

### Uploads

-   `POST /uploads` --- initiate session with idempotency key, name,
    size, destination and declared part plan.
-   `GET /uploads/:id` --- return status and acknowledged parts.
-   `PUT /uploads/:id/parts/:index` --- upload one encrypted part;
    stream body and enforce size limit.
-   `POST /uploads/:id/finalize` --- verify all parts and commit
    version.
-   `POST /uploads/:id/pause` --- pause if supported by the current
    state.
-   `POST /uploads/:id/cancel` --- cancel safely.
-   `POST /uploads/:id/retry` --- retry eligible failed parts.

### Versions and recovery

-   `GET /files/:id/versions` --- list version metadata.
-   `POST /files/:id/restore` --- restore a selected version by creating
    a new version/restore event.
-   `GET /files/:id/download` --- return an authorized download stream
    or short-lived application-mediated retrieval response.

### Tags and search

-   `GET /search` --- server-readable metadata search.
-   `POST /tags` --- create tag.
-   `PUT /files/:id/tags/:tagId` --- attach tag.
-   `DELETE /files/:id/tags/:tagId` --- detach tag.

### Sharing

-   `POST /files/:id/shares` --- create share with permission, expiry,
    optional password, download limit and optional version pin.
-   `DELETE /shares/:id` --- revoke share.
-   `POST /shares/:token/redeem` --- validate token/password and create
    a short-lived access grant where appropriate.
-   `GET /public/shares/:token/metadata` --- expose only permitted
    metadata.
-   `GET /public/shares/:token/content` --- retrieve authorized
    encrypted content through the application.

### Storage and synchronization

-   `GET /storage/summary` --- logical usage, ciphertext usage and
    category summaries.
-   `GET /sync/changes?cursor=...` --- future Android-compatible change
    feed.
-   `POST /sync/operations` --- submit idempotent client operations;
    defer broad offline mutation support until web behavior is stable.

## 3. Upload initiation contract

Request fields: - `name` - `targetFolderId` (nullable) -
`expectedSizeBytes` - `partCount` - `cryptoVersion` -
`manifestFormatVersion` - `idempotencyKey`

The server validates the configured maximum size and part policy. It
calculates or verifies the request fingerprint. Reusing an idempotency
key with different material returns `409 Conflict`.

Response: - `uploadId` - `status` - `partPolicy` - `acknowledgedParts` -
`expiresAt`

Do not trust the client to set `ownerId`, provider status or completion
status.

## 4. Upload part behavior

-   Validate session ownership and state.
-   Validate index and configured part size.
-   Stream to storage without buffering the entire file in memory.
-   Record provider result and checksum.
-   Acknowledge only after the required persistence and integrity
    checks.
-   Return the existing result for a safely repeated part request when
    its fingerprint matches.
-   Reject conflicting reuse of a part index.

## 5. Finalization

Finalization is a transactionally guarded operation: 1. Lock or claim
the session. 2. Verify expected parts are all acknowledged. 3. Verify
recorded sizes and hashes. 4. Insert immutable version and part
relationships. 5. Update the logical file's current-version pointer. 6.
Mark the session completed. 7. Insert any outbox event in the same
transaction. 8. Return the committed version ID.

Provider calls must not be assumed to participate in a PostgreSQL
transaction. Reconciliation is required for provider success followed by
DB failure.

## 6. HTTP status guidance

-   `400` invalid request.
-   `401` unauthenticated.
-   `403` authenticated but unauthorized.
-   `404` missing or deliberately concealed inaccessible resource.
-   `409` idempotency conflict or invalid state transition.
-   `413` size limit exceeded.
-   `422` integrity or validation failure.
-   `429` rate limited.
-   `5xx` unexpected/transient server/provider error.

## 7. API testing

Generate OpenAPI from validated route schemas. Test success, invalid
input, authorization failures, duplicate requests, retries, timeouts and
state-transition errors.
