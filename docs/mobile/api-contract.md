# Verified StackBase API contract for the mobile client

**Status:** Mobile Milestone 0 audit · **Date:** 30 October 2026  
**Source of truth:** the running Fastify route table, `packages/contracts/src/*`, the SQL
migrations and the API's own tests. The older endpoint list in SRS A10 is **not**
authoritative; the differences are listed in [I2](#i2--srs-a10-is-stale-relative-to-the-code).

This document is the contract the Flutter client implements. It deliberately records
what exists today, what mobile needs that does not exist yet, and which existing claims
do not survive verification.

---

## 1. Transport, identity and errors

| Concern | Verified behaviour |
|---|---|
| Base URL | API origin, e.g. `http://127.0.0.1:8787` in development or the deployed HTTPS origin in production. |
| Version prefix | Private endpoints are under `/api/v1`; `/health` is unversioned. |
| Authentication | `Authorization: Bearer <JWT>` on every private route. Identity is always the verified `sub`; no route accepts a user id from the client. |
| Accepted tokens | Dev mode: HS256, issuer `stackbase-dev`, audience `stackbase-api`. Supabase mode: issuer `<SUPABASE_URL>/auth/v1`, audience `authenticated`, verified against JWKS or a legacy HS256 secret. |
| Token constraints | `sub` must be a UUID; `role`, when present, must be `authenticated` (a `service_role` token is rejected); the subject must still exist in `auth.users`, otherwise the request is `401 AUTH_REQUIRED`. |
| Session transport | Native bearer token. The web's httpOnly cookie and Next.js proxy are web-specific and are not used by Flutter. |
| CORS | The API allows `WEB_ORIGIN` only. Native mobile requests normally have no `Origin` header, so CORS does not apply; a Flutter **web** build would need the origin allow-list, which is out of scope. |
| CSRF | Not applicable to a bearer-token native client; no cookie is sent. |
| Response encoding | JSON except chunk upload, ciphertext download and `application/octet-stream` bodies. |
| Caching | The API sets `cache-control: no-store` unless a route overrides it. Mobile must not cache private responses in an HTTP cache. |
| Error envelope | `{ "error": { "code": string, "message": string, "details"?: object } }`. Branch on `code`, never on message text. |
| Rate limits | Global 240 requests/minute per client key; chunk upload 1,200/minute; dev session 20/minute; public share view 60/minute; public share download 30/minute. `429` is `RATE_LIMITED` (Telegram-specific waits use `TELEGRAM_RATE_LIMIT`). |
| Request limits | JSON body limits apply; chunk bodies are capped at `MAX_PLAINTEXT_CHUNK_SIZE + 17 + 1024` bytes. |
| Date format | ISO-8601 strings with `Z` offsets as produced by `toIsoString`. |
| IDs | UUIDs for files/folders/versions/uploads/shares/tags; share tokens are 43-character base64url strings. |
| Base64 | Canonical base64 with padding, exact decoded lengths; the server rejects non-canonical variants. |

Error codes currently defined (`packages/contracts/src/errors.ts`):

```text
AUTH_REQUIRED, FORBIDDEN, VALIDATION_ERROR, FILE_TOO_LARGE,
STORAGE_DISCONNECTED, TELEGRAM_RATE_LIMIT, TELEGRAM_SESSION_EXPIRED,
UPLOAD_SOURCE_REQUIRED, UPLOAD_STATE_CONFLICT, UPLOAD_INTEGRITY_FAILED,
ENCRYPTION_FAILED, DECRYPTION_FAILED, FILE_NOT_FOUND, VERSION_NOT_FOUND,
SHARE_EXPIRED, SHARE_REVOKED, DATABASE_UNAVAILABLE,
STORAGE_RECONCILIATION_REQUIRED, VAULT_ALREADY_EXISTS, TELEGRAM_NOT_CONFIGURED,
UPLOAD_NOT_FOUND, SHARE_NOT_FOUND, SHARE_KEY_UNAVAILABLE, SHARE_FILE_UNAVAILABLE,
SHARE_DOWNLOAD_LIMIT_REACHED, RATE_LIMITED, ROUTE_NOT_FOUND, INTERNAL_ERROR
```

Mobile must map at least:

| Code | Mobile handling |
|---|---|
| `AUTH_REQUIRED` | Refresh once; if refresh fails, clear the session and show sign-in with "session expired". |
| `VALIDATION_ERROR` | Show field-level issues from `details.issues` where present; otherwise a generic form error. |
| `FILE_NOT_FOUND`, `VERSION_NOT_FOUND`, `UPLOAD_NOT_FOUND`, `SHARE_NOT_FOUND` | Remove the stale local row, refresh the list, explain that it no longer exists. |
| `UPLOAD_STATE_CONFLICT` | Re-read the job, reconcile with local queue state, do not blind-retry. |
| `UPLOAD_INTEGRITY_FAILED` | Keep staging only if it is the source of truth; otherwise discard and restart; never mark complete. |
| `FILE_TOO_LARGE` | Show the configured limit; do not offer a retry loop. |
| `STORAGE_DISCONNECTED`, `STORAGE_RECONCILIATION_REQUIRED` | Block uploads, explain that storage needs attention (Telegram link or operator reconciliation). |
| `TELEGRAM_RATE_LIMIT` | Respect `details.retryAfterSeconds` if present; exponential backoff. |
| `RATE_LIMITED` | Back off with jitter; surface a retry affordance. |
| `DATABASE_UNAVAILABLE`, `INTERNAL_ERROR`, network error | Queue/retry where safe; show an offline/service state. |

The API never returns stack traces, provider credentials or key material.

## 2. Endpoint inventory

**51 routes** exist in the audited build. All except `/health`, the dev-session route and
the two public share routes require a bearer token. "Auth" below means bearer unless
stated otherwise.

### 2.1 Identity, setup and encryption

| Method | Path | Auth | Request | Response | Mobile use |
|---|---|---|---|---|---|
| POST | `/api/v1/dev/session` | none, dev only | `{ email }` | `DevSessionResponse` | Debug builds only; absent in production/Supabase mode. |
| GET | `/api/v1/me` | yes | — | `MeResponse` (`user`, `settings`) | Account header, settings defaults. |
| PATCH | `/api/v1/me/settings` | yes | `UserSettingsUpdate` | `UserSettings` | Theme/view/sort/retention/offline preference. |
| GET | `/api/v1/setup/status` | yes | — | `SetupStatusResponse` | Storage/vault readiness; drives upload gating. |
| GET | `/api/v1/encryption/vault` | yes | — | `{ vault: VaultRecord \| null }` | Create/unlock vault. |
| POST | `/api/v1/encryption/vault` | yes | `CreateVaultRequest` | `{ vault: VaultRecord }` | One-time vault creation; 409 `VAULT_ALREADY_EXISTS` afterwards. |
| GET | `/api/v1/audit` | yes | `?limit=1..100` | `AuditListResponse` | Optional activity view; not required for M1–M6. |
| GET | `/health` | none | — | `HealthResponse` | Connectivity/readiness probe; 503 is `degraded`. |

`SetupStatusResponse` includes `storage.provider`, `storage.status`,
`storage.accountIdentifier`, `storage.lastValidatedAt`, `storage.lastErrorCode`,
`encryption.vault` (`not_configured`/`configured`) and live library counts. The mobile app
must gate upload on `encryption.vault == configured` **and** a usable storage connection;
`STORAGE_DISCONNECTED` is a 409 at upload time even if the status looked stale.

### 2.2 Library, folders, tags, trash and search

| Method | Path | Request / query | Response | Notes |
|---|---|---|---|---|
| GET | `/api/v1/library/summary` | — | `LibrarySummaryResponse` | Totals, nine categories (empty ones as zeros), recent 5, largest 5. |
| GET | `/api/v1/insights` | — | `StorageInsightsResponse` | Categories, largest files/folders, duplicate groups by plaintext fingerprint, trash/version bytes. |
| GET | `/api/v1/files` | `q`, `category`, `folderId`, `favorite=true`, `tagId`, `sort`, `limit` 1–100, `offset` | `FileListResponse` (`items`, `total`, `limit`, `offset`, `hasMore`) | `favorite=false` is treated as “no filter”, not “not favourite”. |
| POST | `/api/v1/files/bulk` | `{ action: move\|favorite\|unfavorite\|trash\|tag\|untag, fileIds[1..100], folderId?, tagId? }` | `{ ok: true, affected }` | No bulk copy; no bulk restore. |
| GET | `/api/v1/files/:fileId` | — | `FileSummary` | `contentStatus` is `pending` until a version exists. |
| PATCH | `/api/v1/files/:fileId` | `name?`, `folderId?`, `favorite?`, `description?` | `FileSummary` | No optimistic concurrency yet; see [G4](#g4--optimistic-concurrency). |
| DELETE | `/api/v1/files/:fileId` | — | `{ ok: true, affected }` | Soft delete to Trash. |
| PUT | `/api/v1/files/:fileId/tags` | `{ tagIds: string[] (≤50) }` | `FileSummary` | Replaces the complete tag set (SRS says POST; the implementation is PUT). |
| GET | `/api/v1/search` | `?q=` (≤200) | `SearchResponse` (`files`, `folders`) | Server caps files at 8; folders are name matches. |
| GET | `/api/v1/folders` | — | `{ items: FolderSummary[] }` | Flat list; build the tree client-side. No pagination. |
| POST | `/api/v1/folders` | `{ name, parentFolderId? }` | `FolderSummary` (201) | Name rules from contracts. |
| PATCH | `/api/v1/folders/:folderId` | `{ name?, parentFolderId? }` | `FolderSummary` | Cycle rejection is a server constraint. |
| DELETE | `/api/v1/folders/:folderId` | — | `{ ok: true, affected }` | Recursive soft delete of contained folders/files. |
| GET | `/api/v1/tags` | — | `{ items: TagListItem[] }` | Includes `fileCount`; no pagination. |
| POST | `/api/v1/tags` | `{ name, colorToken? }` | `TagListItem` (201) | Case-insensitive unique name per owner. |
| PATCH | `/api/v1/tags/:tagId` | `{ name?, colorToken? }` | `{ ok, affected }` | Returns a mutation envelope, not the tag. |
| DELETE | `/api/v1/tags/:tagId` | — | `{ ok, affected }` | Removes tag links. |
| GET | `/api/v1/trash` | — | `TrashListResponse` | **Side effect:** purges expired items first; returns `retentionDays`. |
| POST | `/api/v1/trash/purge` | — | `{ purged, skipped }` | Owner-scoped retention purge. |
| POST | `/api/v1/trash/files/:fileId/restore` | — | `{ ok, affected }` | Restores a trashed file. |
| DELETE | `/api/v1/trash/files/:fileId` | — | `{ ok, affected }` | Permanent delete; removes provider objects. Must be confirmed. |
| POST | `/api/v1/trash/folders/:folderId/restore` | — | `{ ok, affected }` | Restores folder and its contents. |
| DELETE | `/api/v1/trash/folders/:folderId` | — | `{ ok, affected }` | Permanent recursive delete. Must be confirmed. |

`FileSummary` fields used by mobile: `id`, `name`, `extension`, `mimeType`, `sizeBytes`
(logical plaintext), `category`, `favorite`, `description`, `folderId`, `folderName`,
`contentStatus` (`pending`/`ready`), `tags[]` (`id`, `name`, `colorToken`), `createdAt`,
`updatedAt`. Categories are the fixed order `images, videos, audio, documents, apks,
archives, apps, downloads, other`.

### 2.3 Uploads and versions

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| POST | `/api/v1/uploads` | `CreateUploadRequest` | `{ upload, file }` | Creates the file row and job; idempotent by key. |
| GET | `/api/v1/uploads` | — | `{ items: UploadJob[] }` | Unfinished jobs, newest first, max 50; triggers stale sweep. |
| GET | `/api/v1/uploads/:uploadId` | — | `UploadJob` | Triggers stale sweep. |
| PUT | `/api/v1/uploads/:uploadId/chunks/:chunkNumber` | raw ciphertext body | `{ upload }` | `content-type: application/octet-stream`; `x-chunk-checksum` required. |
| POST | `/api/v1/uploads/:uploadId/finalize` | `{ ciphertextHash, plaintextFingerprint }` | `{ upload, file, version }` | Idempotent when already completed. |
| POST | `/api/v1/uploads/:uploadId/cancel` | — | `{ upload }` | Deletes staging and the unversioned placeholder file. |
| POST | `/api/v1/uploads/:uploadId/pause` | — | `{ upload }` | Only client-driven states. |
| POST | `/api/v1/uploads/:uploadId/resume` | — | `{ upload }` | **Only `paused`**; moves to `retrying`. |
| POST | `/api/v1/uploads/:uploadId/retry` | — | `{ upload }` | Accepts `failed`, `needs_source_file`, `paused`; increments `retryCount`. |
| GET | `/api/v1/files/:fileId/versions` | — | `{ items: FileVersion[] }` | Includes the full manifest and ciphertext hash per version. |
| GET | `/api/v1/files/:fileId/versions/:versionId/download` | — | ciphertext stream | `application/octet-stream`; headers below. |
| POST | `/api/v1/files/:fileId/versions/:versionId/restore` | — | `{ file, version }` | Appends a new version pointing at the same ciphertext. |

### 2.4 Shares

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| POST | `/api/v1/shares` | yes | `{ fileId, versionId, wrappedKey, expiresAt?, maxDownloads? }` | `{ share, token }` | Raw token returned **once**; only its SHA-256 is stored. |
| GET | `/api/v1/shares` | yes | `?fileId=` | `{ items: Share[] }` | Owner-scoped. |
| POST | `/api/v1/shares/:shareId/revoke` | yes | — | `{ share }` | Revocation is immediate. |
| GET | `/api/v1/public/shares/:token` | none | — | `PublicShare` | Metadata + manifest + share-wrapped key. |
| GET | `/api/v1/public/shares/:token/download` | none | — | ciphertext stream | Enforces expiry, revocation, download limit; rate-limited. |

`wrappedKey` in `CreateShareRequest` is the file version's data key **re-wrapped under a
fresh share secret**, produced on-device. The share secret belongs in the URL fragment
`#<43-char base64url>` and must never be sent to the API. The mobile app builds
`<WEB_PUBLIC_ORIGIN>/s/<token>#<secret>`; the existing web viewer consumes it.

### 2.5 Telegram storage (optional for mobile)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/storage/telegram/authorize` | Start phone/code login; returns `loginId`, `viaApp`. |
| POST | `/api/v1/storage/telegram/verify` | Complete code/password or revalidate the stored session. |
| POST | `/api/v1/storage/telegram/disconnect` | Remove the stored connection. |

These endpoints are fully usable from mobile, but the first release may direct users to
Settings on the web for account linking. The app must still handle
`STORAGE_DISCONNECTED` honestly. No Telegram hash, session string or pending-login state
is ever returned.

## 3. Upload protocol in detail

### 3.1 Create

```json
{
  "idempotencyKey": "uuid-or-stable-key",
  "name": "report.pdf",
  "mimeType": "application/pdf",
  "folderId": null,
  "manifest": {
    "format": "stackbase-file",
    "version": 1,
    "cipher": "xchacha20poly1305-secretstream",
    "chunking": { "plaintextChunkSize": 1048576, "totalChunks": 3 },
    "plaintextSize": 3145728,
    "ciphertextSize": 3145789,
    "streamHeader": "<base64 24 bytes>",
    "wrappedKey": {
      "algorithm": "xsalsa20poly1305",
      "nonce": "<base64 24 bytes>",
      "ciphertext": "<base64 48 bytes>"
    }
  },
  "sourceFingerprint": "<64 lowercase hex>"
}
```

Manifest arithmetic (also enforced client-side before the call):

```text
totalChunks     = max(1, ceil(plaintextSize / plaintextChunkSize))
ciphertextSize  = 24 + plaintextSize + totalChunks * 17
chunkLength(n)  = (n == last ? plaintextSize - (totalChunks-1)*chunkSize : chunkSize) + 17
chunkOffset(n)  = 24 + n * (chunkSize + 17)
```

`plaintextChunkSize` is 65,536–8,388,608 bytes; the web default is 1,048,576. The server
rejects a non-canonical base64 header/key, an inconsistent manifest, a body over
`MAX_UPLOAD_BYTES`, and a user exceeding `MAX_ACTIVE_UPLOADS`.

### 3.2 Chunks

- Body must be exactly the ciphertext chunk, **without** the 24-byte header (the server
  pre-writes the header from the manifest into staging).
- Header `x-chunk-checksum` is lowercase hex SHA-256 of the body. Missing/malformed → 400;
  mismatch → 422 `UPLOAD_INTEGRITY_FAILED`.
- Content type must be `application/octet-stream`; a JSON body is rejected.
- Chunk number is 0-based and must be `< totalChunks`.
- Re-sending the same chunk replaces its staging bytes and metadata; this is safe for a
  retry, but not a way to change the stream.
- The server writes at the deterministic offset and records `upload_chunks`.

### 3.3 State machine and resume semantics

Statuses: `queued`, `preparing`, `encrypting`, `transferring`, `finalizing`, `paused`,
`retrying`, `failed`, `needs_source_file`, `reconciliation_required`, `completed`,
`cancelled`.

- `pause` accepts client-driven statuses and moves to `paused`.
- `resume` accepts **only** `paused` and moves to `retrying`; it does not reopen a
  `needs_source_file` job.
- `retry` accepts `failed`, `needs_source_file` or `paused` and moves to `retrying`;
  this is the correct call after the stale sweep.
- A job untouched for **2 minutes** (15 minutes while `finalizing`) is swept to
  `needs_source_file` (`UPLOAD_SOURCE_REQUIRED`) or `reconciliation_required`
  (`STORAGE_RECONCILIATION_REQUIRED`). The sweep runs on reads of the queue.
- `cancel` deletes staging and the placeholder file when no version exists; it is the
  clean fallback when local staging is gone.
- Finalize requires every chunk; it verifies the assembled SHA-256 and only then creates
  the immutable version.

**Mobile rule:** keep the exact ciphertext staging file. After process death, list jobs,
match by idempotency key, call `retry` if the job is `needs_source_file`/`failed`, and
send only missing chunks. Do not call `resume` for those states.

## 4. Download protocol

`GET /api/v1/files/:fileId/versions/:versionId/download` returns:

```http
content-type: application/octet-stream
content-length: <ciphertextSizeBytes>
x-stackbase-format: stackbase/1
x-stackbase-ciphertext-hash: <sha256 hex>
cache-control: no-store
```

There is **no Range support** in the audited build. Mobile streams to an app-private
temp file, hashes while writing, checks the length and both the header hash and the
manifest's `ciphertextHash`, then decrypts chunk-by-chunk. A mismatch deletes the temp
file and reports `DECRYPTION_FAILED`/`UPLOAD_INTEGRITY_FAILED`-equivalent local copy; it
never yields partial plaintext.

## 5. Cryptography interop

The complete format is in [encryption-format.md](../architecture/encryption-format.md).
The mobile-relevant facts:

| Item | Value |
|---|---|
| Vault KDF | Argon2id13, `opsLimit=3`, `memLimitBytes=64 MiB`, 16-byte salt; parameters stored per vault |
| Key wrapping | XSalsa20-Poly1305 secretbox; 24-byte nonce; 32-byte key + 16-byte tag = 48-byte ciphertext |
| File content | XChaCha20-Poly1305 secretstream; 24-byte header; 17-byte auth overhead per chunk; `MESSAGE` tags except `FINAL` on the last chunk |
| Hashes | SHA-256 lowercase hex over the complete ciphertext (header included) and over the plaintext |
| Manifest | `format: "stackbase-file"`, `version: 1`, `cipher: "xchacha20poly1305-secretstream"`, strict fields |
| Vault record | `format: "stackbase-vault"`, `version: 1`, kdf, wrapped vault key, recovery verifier |
| Share capability | Re-wrap one version's data key under a new 32-byte secret; secret only in URL fragment |
| Vectors | `apps/web/src/lib/crypto/test-vectors.ts` (vault + file); currently TypeScript-only |

Dart implementation notes:

- `sodium 4.1.2+1` (`SodiumSumo`) exposes `crypto_pwhash`, `crypto_secretbox_*` and
  `crypto_secretstream_xchacha20poly1305_*`.
- It does **not** expose `crypto_hash_sha256`; use `crypto`'s chunked SHA-256. The digest
  is byte-identical; the format does not depend on the library that computes it.
- Use `SecretKey`/`SecureKey` scopes and zeroize key material. Do not convert keys to
  `String` or log them.
- The secretstream push transformer emits the header as its first output message, then
  one ciphertext per plaintext push. Tag the final data chunk `FINAL`; do not close the
  sink in a way that appends an extra empty `FINAL` chunk.
- Run Argon2id off the UI isolate and test on a low-RAM device; 64 MiB is a real
  allocation, not a nominal parameter.

## 6. Gaps: what mobile needs that the API does not expose yet

Each gap states the contract we would add, why, and when it becomes a dependency. None
requires a schema migration for M1–M6.

### G1 — Public client configuration

A self-hosted mobile app cannot know the deployment's Supabase URL/key without a manual
prompt. Add:

```http
GET /api/v1/client-config        (public, no bearer)
200 {
  "apiVersion": "v1",
  "auth": {
    "mode": "supabase",
    "supabaseUrl": "https://<ref>.supabase.co",
    "publishableKey": "sb_publishable_..."  // public by design; legacy anon JWT accepted
  },
  "limits": { "maxUploadBytes": 2147483648, "maxActiveUploads": 4 },
  "links": { "webOrigin": "https://stackbase.example" }
}
```

- `auth.mode = "dev"` is returned only by a non-production dev API; release builds must
  reject it.
- Never return `SUPABASE_JWT_SECRET`, Telegram credentials, session keys or service-role
  keys.
- Add `SUPABASE_PUBLISHABLE_KEY` (or reuse an anon key) to the API config; it is public
  client material, not a secret.
- Cache for a short time or `no-store`; it contains public values only.

**Dependency:** M1 may use `--dart-define`; G1 is required before a distributable beta
(M8 entry criterion) and for a one-binary self-hosted setup.

### G2 — Upload limits in configuration

`MAX_UPLOAD_BYTES` and `MAX_ACTIVE_UPLOADS` are enforced server-side but not exposed.
Mobile needs them to preflight free space and cap its queue. Put them in G1's `limits`.
Until then, treat the limits as unknown, catch `FILE_TOO_LARGE`/`UPLOAD_STATE_CONFLICT`,
and avoid hard-coding a limit in the UI.

### G3 — Incremental sync

There is no `updatedSince`, cursor or tombstone endpoint. Mobile can cache full snapshots
from `/files`, `/folders`, `/tags` and `/trash`, but cannot efficiently detect hard
deletions (permanent purge) or changes on a large library. Proposed:

```http
GET /api/v1/sync?since=<opaque-cursor>&limit=500
200 {
  "cursor": "<opaque>",
  "files":   { "upserted": [...FileSummary], "deletedIds": [...] },
  "folders": { "upserted": [...FolderSummary], "deletedIds": [...] },
  "tags":    { "upserted": [...TagListItem], "deletedIds": [...] },
  "hasMore": false
}
```

Cursor must be stable across equal timestamps and include hard-delete tombstones.
**Dependency:** M7 (offline sync/conflicts). M2–M6 use full snapshots with an explicit
freshness label.

### G4 — Optimistic concurrency

`PATCH /files/:id` and `PATCH /folders/:id` are last-write-wins. Mobile's conflict
requirement needs a precondition. Preferred non-breaking form:

```http
PATCH /api/v1/files/:fileId
If-Match: "<updatedAt ISO-8601>"
```

or an optional `expectedUpdatedAt` body field. On mismatch return `409 CONFLICT` with the
current resource; add the stable `CONFLICT` code (do not overload
`UPLOAD_STATE_CONFLICT`). **Dependency:** M7. Until then, mobile re-reads and compares
before mutating; a race remains and must be disclosed in the conflict UI.

### G5 — Language-neutral cryptography vectors

The vectors currently live in TypeScript. Flutter cannot import them, so interoperability
would be asserted against a hand-copied duplicate. Extract a JSON fixture (vault vector,
file ciphertext/plaintext/manifest, tamper cases) under a shared path and make both
`apps/web/test/crypto-vectors.test.ts` and the Flutter crypto tests read it. Any change to
the fixture remains a format change. **Dependency:** M3.

### G6 — Explicit upload restart (optional)

The mobile staging design means a lost staging file is recovered by `cancel` + a new
upload, which deletes the unversioned placeholder. An explicit
`POST /api/v1/uploads/:uploadId/restart` with a new manifest would avoid a new idempotency
key and make “restart this upload” atomic. It is not required for M4 because cancel+new
works; if added, it must reset `upload_chunks`, staging and `upload_jobs.manifest` in one
transaction. **Dependency:** none; candidate for M4 polish.

### G7 — Resumable downloads (optional)

Downloads have no `Range`/`Accept-Ranges` support. A 2 GiB download over a flaky mobile
connection must restart. Add byte-range support with the same integrity verification (the
client still verifies the whole hash). Not required by the mobile instruction; candidate
for a later milestone.

### G8 — Generated Dart DTOs (optional)

The API is TypeBox, not OpenAPI. Dart DTOs will be hand-written with `freezed` and checked
against recorded fixtures. A generated schema would reduce drift but adds tooling; defer
until the DTO surface stabilises.

## 7. Existing incompatibilities and defects

### I1 — Cold-start upload resume mixes two streams

**Severity: high for the web app; mobile avoids it by design.**

Evidence:

- `apps/web/src/features/uploads/pipeline.ts:95` calls `startEncryption` on every
  `runUpload`, which generates a **new random data key and stream header**.
- `apps/api/src/modules/uploads/repository.ts:319` (`respondWithExisting`) matches a
  replayed idempotency key by size/chunk count/fingerprint only. It does not compare
  `streamHeader`/`wrappedKey`, and it returns the old `receivedChunkNumbers`.
- The web pipeline then skips those chunks and encrypts the rest under the new stream
  (`pipeline.ts:133-151`).

Reproduction against the real API (temporary probe, removed after the audit): a
200,000-byte source with four 64 KiB chunks; chunk 0 sent under header A; replay
`POST /uploads` with the same key but header B returned **200** with
`receivedChunkNumbers: [0]`; chunks 1–3 sent under B; finalize with B's hash returned
**422 `UPLOAD_INTEGRITY_FAILED`**. The staged stream was A0 + B1..B3.

Consequences:

- “Refresh and resume” only succeeds when **zero** chunks had arrived before the refresh
  (the reported manual test used `0 of 1 chunks already stored`). With any stored chunk,
  finalization fails.
- After the 2-minute stale sweep, the job becomes `needs_source_file`; the web's reselect
  path calls `resume` (`upload-context.tsx:485`), which only accepts `paused`, so it also
  fails to reopen the job.
- The Milestone 4 claim that interrupted uploads resume needs correction, or the web
  client needs a fix.

Recommended web fix (not done in M0): persist the exact ciphertext/staging bytes in the
browser (IndexedDB) and continue the same stream, **or** make the API reset the job when a
replayed key carries a different manifest and the client resends from chunk 0. Mobile does
the former on the device (MADR-007), so it does not depend on this fix.

### I2 — SRS A10 is stale relative to the code

| SRS A10 says | Actual implementation |
|---|---|
| `POST /api/v1/files` | Not registered; uploads create file rows. |
| `POST /api/v1/files/:fileId/tags` | `PUT /api/v1/files/:fileId/tags`. |
| `POST /api/v1/trash/:fileId/restore` | `POST /api/v1/trash/files/:fileId/restore`. |
| `DELETE /api/v1/trash/:fileId/permanent` | `DELETE /api/v1/trash/files/:fileId`. |
| No vault, settings update, summary, insights, audit, uploads list/get, cancel or public download | Implemented (ADR-014/018/019). |
| No folder trash/purge routes | Implemented under `/trash/folders/...` and `POST /trash/purge`. |

Mobile follows the actual routes. The SRS should be corrected in a documentation pass; it
is not safe to implement the stale list.

### I3 — Documented upload default differs from the code

`docs/setup/local-development.md` lists `MAX_UPLOAD_BYTES` default `17179869184`
(16 GiB). `apps/api/src/config/env.ts:233-235` defaults to `2 * 1024 ** 3` (2 GiB), with a
16 GiB maximum. The app must not assume 16 GiB. This audit corrects the setup table and
notes the discrepancy; the code is authoritative.

### I4 — Production web sign-in is still missing

`POST /api/v1/dev/session` is not registered when `AUTH_MODE=supabase` or in production
(`apps/api/src/app.ts:219-221`). The web sign-in screen still posts only to that route.
Mobile does not inherit the cookie problem because it talks to Supabase Auth directly, but
the product still needs a Supabase project and a working sign-in path for the web. This is
an external release blocker, not a mobile API incompatibility.

### I5 — No client-config endpoint

See [G1](#g1--public-client-configuration). Until it exists, the app is build-time
configured and cannot be installed once and pointed at an arbitrary self-hosted server.

### I6 — Minor semantics that surprise clients

- `GET /files?favorite=false` does not filter to non-favourites; omit the parameter.
- `GET /trash` performs an opportunistic purge; a read can change data.
- Rate limits are per client key/IP; a mobile carrier NAT can share a limit.
- `POST /tags` and `POST /folders` return **201**, not 200; treat any 2xx as success.
- `PATCH /tags/:id` returns a mutation envelope, not the updated tag; re-read tags.
- The upload job does not return its manifest; mobile must persist the manifest locally
  (it already has it from the encryption pass).

## 8. Contract test plan

1. **Route table assertion:** a test enumerates every authenticated route and asserts an
   anonymous call returns 401, as the existing security sweep does.
2. **DTO fixtures:** record real responses for `me`, `files`, `folders`, `tags`,
   `library/summary`, `insights`, `setup/status`, `versions`, `uploads`, `shares` and
   decode them in Dart tests. Fail on unknown enum values rather than silently mapping to
   `other` (except forward-compatible categories if explicitly chosen).
3. **Upload contract:** create → chunk → finalize against the local API with a real
   ciphertext stream; verify exact chunk lengths, checksum rejection, resume after a
   simulated process restart, and 422 on a mixed manifest.
4. **Crypto interop:** web encrypt → Flutter decrypt and Flutter encrypt → web decrypt
   using the shared JSON vectors (G5).
5. **Auth matrix:** valid token, expired token, wrong audience/issuer, `service_role`,
   unknown subject (must be 401, not 500), two-account isolation.
6. **Offline/conflict:** cached read, reconnect, stale `updatedAt` conflict; assert no
   silent overwrite.

## 9. References

- Contracts: `packages/contracts/src/{auth,common,encryption,errors,insights,library,lifecycle,setup,shares,storage,uploads}.ts`
- Routes: `apps/api/src/modules/**/*-routes.ts`, `apps/api/src/modules/uploads/{routes,version-routes}.ts`
- Upload state machine: `apps/api/src/modules/uploads/repository.ts`
- Web crypto: `apps/web/src/lib/crypto/*`, vectors in `apps/web/src/lib/crypto/test-vectors.ts`
- Format: [encryption-format.md](../architecture/encryption-format.md)
- Architecture decisions: [architecture.md](architecture.md), [shared ADRs](../architecture/decisions.md)
