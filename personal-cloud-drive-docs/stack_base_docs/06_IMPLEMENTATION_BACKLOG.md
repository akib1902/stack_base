# Implementation Backlog

## Guiding rule

Build a complete encrypted upload/download vertical slice before
building advanced features. Validate Telegram and the
encryption/recovery model early. Estimates are rough solo-developer
planning ranges, not commitments.

## Milestone 1 --- Foundation (2--3 days)

-   [ ] Create pnpm monorepo.
-   [ ] Set up Next.js, Fastify and shared TypeScript configuration.
-   [ ] Configure linting, formatting, test runner and environment
    validation.
-   [ ] Add health/readiness endpoints and structured logs.
-   [ ] Set up Supabase development project and migration workflow.
-   [ ] Add README and initial ADRs. **Exit:** clean local setup;
    secrets are not committed.

## Milestone 2 --- Metadata CRUD (4--6 days)

-   [ ] Profiles, folders, files, tags and file_tags.
-   [ ] Ownership constraints and folder-cycle prevention.
-   [ ] Supabase Auth validation and owner-scoped repository.
-   [ ] RLS policies and negative access tests.
-   [ ] File/folder CRUD, search filters, sorting and pagination.
-   [ ] Initial file-browser UI. **Exit:** secure organization of
    metadata without uploads.

## Milestone 3 --- Telegram provider proof (3--5 days)

-   [ ] Select maintained MTProto library compatible with target
    runtime.
-   [ ] Set up dedicated Telegram storage identity.
-   [ ] Implement upload/retrieval/inspection proof of concept.
-   [ ] Validate size limits, concurrent operations, rate limits and
    session persistence.
-   [ ] Test retrieval after API restart and
    provider-success/database-failure recovery.
-   [ ] Set a conservative configured maximum file size. **Exit:**
    provider passes documented go/no-go checks.

## Milestone 4 --- Encryption and recovery (5--8 days)

-   [ ] Specify versioned file format and encrypted manifest.
-   [ ] Implement client key generation, authenticated encryption and
    decryption.
-   [ ] Implement DEK wrapping and recovery design.
-   [ ] Ensure content is encrypted before provider calls.
-   [ ] Verify parts and complete reconstructed content.
-   [ ] Add wrong-key, tamper and recovery tests. **Exit:** end-to-end
    encrypted file round trip succeeds after restart.

## Milestone 5 --- Resumable uploads (6--9 days)

-   [ ] Implement upload_sessions and upload_parts.
-   [ ] Add idempotency keys and request fingerprints.
-   [ ] Persist client state in IndexedDB.
-   [ ] Add part acknowledgments, progress and exponential backoff with
    jitter.
-   [ ] Implement restart recovery and missing-part re-upload.
-   [ ] Implement transactional finalization and immutable version
    creation.
-   [ ] Test duplicate, concurrent, timeout and partial-failure
    scenarios. **Exit:** upload recovery works without duplicate
    commits.

## Milestone 6 --- Versions, trash and sharing (5--8 days)

-   [ ] Implement version listing and restore.
-   [ ] Add soft deletion and trash retention.
-   [ ] Add object references and cleanup safety checks.
-   [ ] Implement token-hash-based sharing and expiry/revocation.
-   [ ] Implement password protection and atomic download limits.
-   [ ] Add audit events and tests. **Exit:** restore and sharing
    policies hold under failure/concurrency.

## Milestone 7 --- Search and storage insights (3--5 days)

-   [ ] Combined metadata filters and efficient pagination.
-   [ ] Usage summaries and large-file views.
-   [ ] Client-side duplicate detection or carefully designed hash
    strategy.
-   [ ] Reconciliation and provider health metrics.
-   [ ] Query/index tuning. **Exit:** common searches and storage
    reports are accurate.

## Milestone 8 --- Hardening (5--8 days)

-   [ ] HTTPS, CSP, CORS, secure session handling and rate limits.
-   [ ] Dependency audit and authorization boundary tests.
-   [ ] Backup restoration and key-recovery drill.
-   [ ] Failure-injection and load tests.
-   [ ] Alerts for failed jobs, missing objects and stalled uploads.
-   [ ] Complete API, threat model, runbook and demo docs. **Exit:**
    documented failure and recovery procedures pass.

## Deferred after v1

-   Android application and offline conflict UI.
-   Full-text document extraction and semantic search.
-   Multi-user collaboration.
-   Cross-user deduplication.
-   Alternative object-storage provider implementation.
-   Microservices and dedicated message broker.
