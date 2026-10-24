# Personal Cloud Drive --- Project Documentation

**Documentation baseline:** v1.0\
**Status:** Ready to begin implementation, subject to the
pre-development gates below.\
**Architecture:** Web-first, single-user initially, Fastify +
TypeScript, Supabase PostgreSQL, Telegram MTProto storage, client-side
encryption.

## What this project is

A personal file-management application that uses Telegram as its bounded
primary storage provider while the application owns file organization,
metadata search, upload state, version history, trash, sharing and
recovery.

The database stores organization metadata and workflow state. File
contents are encrypted in the client before they are sent to Telegram.

## Documentation index

-   `01_SRS.md` --- Software Requirements Specification and acceptance
    criteria.
-   `02_ARCHITECTURE.md` --- System architecture, component boundaries
    and key flows.
-   `03_DATABASE_SCHEMA.md` --- Entity model, tables, constraints,
    indexes and migration guidance.
-   `04_SECURITY_THREAT_MODEL.md` --- Security boundaries, threats,
    encryption requirements and recovery.
-   `05_API_SPECIFICATION.md` --- Initial REST API contracts and
    behavior.
-   `06_IMPLEMENTATION_BACKLOG.md` --- Ordered milestones, tasks and
    exit gates.
-   `07_TEST_PLAN.md` --- Unit, integration, security, resilience and
    acceptance tests.
-   `08_ADR.md` --- Architecture decision records.
-   `09_RUNBOOK.md` --- Local development, operational checks and
    recovery runbooks.
-   `10_OPEN_DECISIONS.md` --- Items that must be validated before
    committing to production assumptions.

## Important project status

This is an implementation-ready specification baseline, not a claim that
the application is already secure or production-ready. Provider
behavior, encryption format and deployment details must be verified
during implementation.

## Do you need to stop planning?

No more broad planning is necessary. Move into development in this
order:

1.  Build the repository and metadata CRUD foundation.
2.  Prove Telegram MTProto upload and retrieval in the actual intended
    runtime.
3.  Specify and implement a reviewed client-side encryption format and
    recovery workflow.
4.  Build resumable uploads only after the storage and crypto vertical
    slice works.

Do not skip the provider proof or key-recovery design. Those are the two
highest-risk assumptions in this architecture.
