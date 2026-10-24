# High-Level Architecture

## 1. Architectural style

Use a **modular monolith** with Fastify and TypeScript. Keep domain
modules and provider interfaces separate, but do not introduce
microservices for the first release.

## 2. Components

### Web client

-   Next.js, React and TypeScript.
-   File browser, folder tree, metadata search, upload queue, version
    history and sharing UI.
-   Web Workers for CPU-intensive encryption and hashing.
-   IndexedDB for durable upload-session state and acknowledged-part
    information.
-   Never contains Telegram credentials or Supabase service-role
    secrets.

### API

-   Fastify HTTP server.
-   Zod request/response validation.
-   Authentication middleware and owner-scoped authorization.
-   Services for files, folders, uploads, versions, shares, search and
    sync.
-   Repository layer for PostgreSQL.
-   Storage-provider interface and Telegram adapter.
-   Structured logs with sensitive-data redaction.

### PostgreSQL / Supabase

-   Supabase Auth for identity.
-   PostgreSQL for organization metadata, durable upload state,
    versions, provider references, audit events and jobs.
-   Migrations are the source of truth.
-   RLS and explicit grants for every exposed table.

### Telegram adapter

-   Maintained MTProto client library compatible with the chosen server
    runtime.
-   Dedicated storage identity/session.
-   Provider-specific IDs and error mapping.
-   Upload, retrieval, inspect and delete operations.
-   Explicit size and part policy based on verified capabilities.

### Background jobs

-   PostgreSQL-backed job/outbox mechanism for retries, reconciliation,
    abandoned-session cleanup and safe deletion.
-   Jobs must be idempotent, lease/claim protected and retryable.
-   Do not delete referenced objects.

## 3. Core boundaries

-   The database is the source of truth for logical file identity and
    application metadata.
-   Telegram stores encrypted bytes; it is not the application database.
-   The client owns plaintext handling and decryption keys.
-   The API owns authorization and durable workflow state.
-   Storage-provider identifiers must not leak into public domain APIs.

## 4. Main upload flow

1.  Client calculates hashes and encrypts locally.
2.  Client requests upload initiation with an idempotency key.
3.  API validates identity, size policy, destination and request
    fingerprint.
4.  API persists an upload session and expected parts.
5.  Client uploads encrypted parts through the API.
6.  API stores each part through Telegram and persists provider
    references and acknowledgments.
7.  Client requests finalization.
8.  API verifies all parts and commits version metadata transactionally.
9.  API emits a durable outbox event for post-commit work.
10. Client receives a committed version ID.

## 5. Failure handling

-   If provider upload succeeds but the DB write fails, reconciliation
    must discover or safely re-upload the object.
-   If Telegram's temporary upload state expires, missing parts may need
    to be re-uploaded from the client.
-   Finalization must be idempotent.
-   Retry transient failures with exponential backoff and jitter; do not
    retry permanent authentication or validation errors indefinitely.
-   Use leases for workers to prevent duplicate concurrent processing.

## 6. Telegram go/no-go proof

Before building the full upload engine, demonstrate: - The chosen
MTProto library works in the target runtime. - Upload and retrieval work
for representative files within the intended size limit. - Session
persistence and re-authentication are understood. - Concurrent uploads
and rate limits are acceptable. - Provider identifiers can be persisted
and used for retrieval after a restart. - The system can recover from
provider success followed by database failure.

If any requirement fails, reconsider the provider or the maximum
supported file size before continuing.

## 7. Scalability path

Keep `StorageProvider` replaceable. A future S3-compatible adapter can
be added without changing logical file IDs, version IDs or the API
contract. Do not implement this fallback in v1.
