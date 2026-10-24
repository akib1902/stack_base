# Open Decisions and Pre-Development Gates

The broad product architecture is settled. Do not restart broad
planning, but resolve the following high-risk implementation choices as
part of the first development milestones.

## Gate 1 --- Telegram MTProto proof of concept (must pass)

-   Which maintained Node.js MTProto library will be used?
-   Does it support the target runtime and deployment environment?
-   What is the actual maximum upload size and part policy for the
    chosen integration?
-   Can the provider object be retrieved after application restart?
-   What happens when temporary uploaded parts expire?
-   What are the rate limits, concurrency constraints and
    account/session risks?
-   How will the session be stored, backed up and re-authenticated?

**Decision rule:** do not build the full upload manager until a real
encrypted file can be uploaded, retrieved and verified in the target
environment.

## Gate 2 --- Cryptographic format and key recovery (must pass)

-   Choose a maintained cryptographic library.
-   Specify encryption algorithm, nonce strategy, authenticated
    metadata, manifest format and versioning.
-   Specify per-version DEK wrapping and account-key recovery.
-   Decide how key material is delivered to a share recipient.
-   Test tamper detection and recovery.

**Decision rule:** do not call the project production-secure until the
format and recovery process have been reviewed and tested.

## Gate 3 --- File-size policy

Set `MAX_FILE_SIZE_BYTES` from tested provider capabilities, part count,
encryption overhead and operational margin. Reject unsupported files
before upload initiation. Do not advertise unlimited storage.

## Gate 4 --- Share-link security

Decide whether password-protected shares are required in v1. Define how
recipient key material is delivered and how download limits are enforced
atomically. Revocation cannot erase copies already downloaded.

## Gate 5 --- Deployment and secrets

Choose the hosting environment for the API and persistent Telegram
session. Confirm persistent storage, backups, process restart behavior
and secret management. Avoid serverless execution if it cannot safely
support the chosen MTProto session model.

## Non-blocking decisions

-   Android framework details.
-   Semantic search.
-   Text extraction and document indexing.
-   S3-compatible fallback implementation.
-   Multi-user collaboration.
-   Advanced deduplication.

## Recommended next action

Start Milestone 1 immediately. In parallel, create a small isolated
MTProto proof of concept and a written crypto design. These are the only
meaningful reasons to pause before implementing the full upload engine.
