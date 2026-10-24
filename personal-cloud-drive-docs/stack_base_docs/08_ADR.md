# Architecture Decision Records (ADR)

## ADR-001 --- Modular monolith

**Status:** Accepted\
**Decision:** Use Fastify + TypeScript with modules and
service/repository boundaries.\
**Reason:** Lowest operational complexity while preserving testability
and clear domain boundaries.\
**Consequences:** Modules must avoid circular dependencies; split
services only when evidence warrants it.

## ADR-002 --- PostgreSQL metadata source of truth

**Status:** Accepted\
**Decision:** Supabase PostgreSQL owns logical file identity, metadata,
versions, upload sessions, permissions and audit history.\
**Reason:** Transactional integrity and rich query support.\
**Consequences:** Provider state must be reconciled with database state
after partial failures.

## ADR-003 --- Telegram MTProto as bounded primary storage

**Status:** Accepted, subject to proof of concept\
**Decision:** Use a maintained Telegram client/API integration and
enforce a configured maximum file size. No object-storage fallback in
v1.\
**Reason:** Matches project goals while keeping the initial architecture
focused.\
**Consequences:** Provider limits, session security and operational
constraints must be proven before the upload engine is committed.

## ADR-004 --- Client-side content encryption

**Status:** Accepted, cryptographic design requires validation\
**Decision:** Encrypt file contents before upload; server-readable
organization metadata remains available for search.\
**Reason:** Protects content while preserving practical organization.\
**Consequences:** The system is not metadata-private. Key loss may mean
permanent data loss.

## ADR-005 --- Durable upload sessions

**Status:** Accepted\
**Decision:** Persist upload session and per-part state in PostgreSQL;
persist client-side state in IndexedDB.\
**Reason:** Survive refreshes, restarts and transient provider
failures.\
**Consequences:** Application-level resumability cannot guarantee
Telegram temporary parts remain available indefinitely.

## ADR-006 --- Immutable versions

**Status:** Accepted\
**Decision:** Every committed content update creates a new immutable
version. Restore does not overwrite history.\
**Reason:** Auditable recovery and safer retention.\
**Consequences:** Cleanup must account for references from versions and
shares.

## ADR-007 --- Web first, Android later

**Status:** Accepted\
**Decision:** Build the web client first and make API contracts
platform-neutral.\
**Reason:** Validate the hardest backend and security behavior before
adding another client.\
**Consequences:** Android-specific background work and conflict UX are
deferred.

## ADR-008 --- No semantic search in v1

**Status:** Accepted\
**Decision:** Start with metadata search; defer text extraction and
embeddings.\
**Reason:** E2EE complicates server-side indexing and semantic search is
not necessary for the first usable release.\
**Consequences:** Search initially cannot find text inside encrypted
documents.
