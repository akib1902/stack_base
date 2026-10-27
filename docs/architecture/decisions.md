# Architecture decisions

Decisions taken while implementing Milestone 1, with the deviations from the SRS/FDD
documented explicitly (SRS final rule 14). Each record states the context, the decision
and the consequences.

---

## ADR-001 — Two database drivers: PGlite locally, `pg` for PostgreSQL/Supabase

**Context.** The spec mandates Supabase PostgreSQL. Local development should not require
Docker, a cloud project or credentials, and the RLS policies are only meaningful when
exercised against a real PostgreSQL engine.

**Decision.** All code talks to a small `Db` interface (`src/database/db.ts`):

- `DATABASE_URL` empty ⇒ **PGlite** (PostgreSQL 17 compiled to WebAssembly) persisted at
  `apps/api/.data/pglite`.
- `DATABASE_URL` set ⇒ **`pg`** pool, for PostgreSQL or Supabase.

Migrations, constraints, triggers and policies are identical in both.

**Consequences.** Local development and the whole test suite run with one command and no
external service. PGlite is a single connection, so it is a development and test driver,
not a production one; concurrent production traffic must set `DATABASE_URL`. Query text
uses `$1` placeholders and no driver-specific extensions, so behavior matches.

---

## ADR-002 — Two auth modes, with dev sessions structurally impossible in production

**Context.** The spec fixes Supabase Auth. There is no Supabase project yet, but
authorization must be testable today and must never be weakened later.

**Decision.** `AUTH_MODE` selects the verifier:

- `dev` — HS256 tokens signed with `DEV_AUTH_SECRET`, issued by
  `POST /api/v1/dev/session`, issuer `stackbase-dev`, audience `stackbase-api`.
- `supabase` — verify access tokens from issuer `<SUPABASE_URL>/auth/v1`, audience
  `authenticated`, via remote JWKS or a legacy HS256 secret.

`AUTH_MODE=dev` is rejected outright when `NODE_ENV=production`, and the dev-session
route is additionally not registered for production builds (asserted by a test).

Both modes reject tokens whose `role` claim is anything but `authenticated` (so a
Supabase `service_role` token can never act as an end user) and reject subjects that are
not UUIDs. Identity is always the token subject.

**Consequences.** Deployment requires a Supabase sign-in screen in the web app before
`AUTH_MODE=supabase` is usable end to end; that is a later milestone. Until then the
supported self-hosted path is the documented local mode.

---

## ADR-003 — Ownership-aware schema plus RLS as defense in depth

**Context.** "Do not trust a user ID supplied by the frontend" and "test both allowed and
denied operations" are hard requirements.

**Decision.**

1. Every user-owned table has `user_id`, and every relationship uses a composite foreign
   key `(user_id, other_id)`, so cross-owner references fail at the constraint level.
2. RLS is enabled on every table. User-facing tables get `auth.uid() = user_id` policies
   for the `authenticated` role; `anon` is revoked everywhere.
3. Internal tables — `storage_connections`, `storage_objects`, `upload_jobs`,
   `upload_chunks` — are **server-only**: RLS on, no policy, no grant. Only the API's
   owner-scoped queries reach them.
4. `file_versions` rows are immutable (trigger), `current_version_id` must reference a
   version of the same file and owner (trigger), folder cycles are rejected (trigger).
5. Migration `0010` re-verifies RLS coverage, `anon` privileges and policy presence on
   every migrate run, so the checks cannot silently rot.

**Consequences.** The API does not rely on RLS (it queries with server credentials and
explicit owner filters), but a mistake in a query still cannot leak another tenant's rows
through a client role. `audit_events` is readable by its owner and writable only by the
server.

---

## ADR-004 — Identity rows are provisioned by a trigger, defensively re-checked

**Decision.** A trigger on `auth.users` inserts the matching `profiles` and
`user_settings` rows on sign-up. `GET /api/v1/me` also performs an idempotent
`insert … on conflict do nothing` for both tables if they are missing.

**Consequences.** No authenticated request can observe a half-provisioned account, and a
Supabase project that already contains users (before these migrations) heals on first
request instead of erroring.

---

## ADR-005 — Theme preference is a cookie until the settings API exists

**Context.** SRS B2 stores `theme` in `user_settings`; A10 defines no settings update
endpoint. Adding an unplanned endpoint would contradict the API contract.

**Decision.** The interface theme is stored in an httpOnly cookie (`stackbase_theme`) and
applied in the root layout, so there is no flash of the wrong theme. The `user_settings.theme`
column remains the account-level default and is rendered read-only on the settings page.

**Consequences.** Theme does not follow a user across browsers yet. When the settings
endpoints land, the cookie becomes a cache in front of the account value.

---

## ADR-006 — Web session handling: httpOnly cookie, server-side API calls

**Context.** The browser must never hold provider credentials, and the current milestone
has no Supabase client to manage sessions.

**Decision.** The web app keeps the access token in an httpOnly, SameSite=Lax cookie and
attaches it server-side in `lib/api/client.ts`. Server components and server actions call
the API directly; no token is embedded in the client bundle or in local storage.

**Consequences.** When Supabase Auth UI ships, this becomes the standard Supabase SSR
cookie session (`@supabase/ssr`) with refresh handling; the API client boundary stays the
same. The API also sets `cache-control: no-store` on every response.

---

## ADR-007 — Error envelope and codes

**Decision.** Every error response is `{ "error": { "code", "message", "details?" } }`
using the SRS A11 codes. Three additional stable codes are used where A11's non-exhaustive
list has no equivalent: `ROUTE_NOT_FOUND` (404), `RATE_LIMITED` (429) and `INTERNAL_ERROR`
(500). Validation failures return `VALIDATION_ERROR` with field paths; database outages map
to `DATABASE_UNAVAILABLE` (503). Stack traces and provider details are never returned.

---

## ADR-008 — RLS tests live with the API suite, not in `supabase/tests`

**Context.** The FDD sketch places database tests in `supabase/tests`. They need the
migration runner, the driver and the test harness, all of which belong to `apps/api`.

**Decision.** `apps/api/test/rls.test.ts` holds the database authorization tests; it reads
`supabase/migrations` directly. `supabase/` stays a pure SQL directory with no Node package.

**Consequences.** One test command, one harness, no duplicated driver setup. The RLS tests
run as the real `authenticated` role with `request.jwt.claims` set the way Supabase does,
so they exercise the policies rather than the API's SQL.

---

## ADR-009 — No client state library yet

**Context.** The FDD prescribes TanStack Query for server state and limited Zustand for
shared UI state. Milestone 1 has no client-side data fetching: every screen is rendered on
the server.

**Decision.** Neither library is installed. Server state is fetched in server components;
interaction state (form pending/error) uses `useActionState`.

**Consequences.** The dependencies arrive with file browsing (Milestone 2), where they are
actually needed; nothing in the current build is dead code.

---

## ADR-010 — `PORT=0` is treated as unset

**Context.** Some toolchains export `PORT=0`, which would bind an ephemeral port that the
web app cannot discover, or fail validation entirely.

**Decision.** `PORT=0` falls back to the documented default (`8787`); any other non-numeric
or out-of-range value is still a configuration error. The API logs the bound address at
startup.

---

## Known gaps at Milestone 1 (deliberate)

*(All of the first three gaps below were closed in Milestone 3 — see ADR-013 through
ADR-018 and the Milestone 3 report.)*

- No Telegram MTProto adapter, session storage or `StorageProvider` implementation.
- No cryptographic format, vault key hierarchy or recovery flow; uploads are disabled.
- No upload jobs, chunk transfer or worker process (schema exists, code does not).
- No file/folder/tag/search routes; the schema is in place for Milestone 2.
- No PWA manifest, service worker, offline queue or Playwright end-to-end suite.
- No Dockerfiles or CI pipeline.

---

## ADR-011 — Home categories are computed by one SQL expression

*(Restored in Milestone 3; the Milestone 2 commit accidentally dropped this record
although the code it describes is live.)*

**Context.** The FDD requires Bento category cards (Images, Videos, Audio, Documents, APKs,
Archives, Downloads, Other) and states that every count must come from real backend data.
Categories could be derived in TypeScript, in SQL, or stored on the row.

**Decision.** `GET /api/v1/library/summary` returns all nine categories (empty ones as
explicit zeros, in a fixed order) using a single grouped query with a `case` expression
(`apps/api/src/modules/library/categories.ts`). Classification prefers `mime_type` and
falls back to the normalized `extension`; the expression is fixed SQL with only the owner
id parameterized.

**Consequences.** One rule for the dashboard and for later filtering, one round trip, no
per-file loop. Adding a category means changing the expression, the contract union and the
tile metadata together — the compiler and the API test catch a partial change. "Downloads"
is defined as transfer artifacts (`.iso`, `.img`, `.torrent`, `.part`, `.crdownload`, `.bin`)
rather than "anything downloaded", because the browser does not know a file's provenance.

---

## ADR-012 — Frosted surfaces via utility blur, motion as CSS only

*(Restored in Milestone 3 along with ADR-011.)*

**Context.** The FDD asks for Bento layout, selective glassmorphism and short, purposeful
microinteractions, with reduced-motion support and no motion that blocks interaction.

**Decision.** Glass is a composable pair: a `.glass` rule (gradient fill, rim light,
shadow) plus Tailwind `backdrop-blur-xl backdrop-saturate-150` utilities. The blur lives in
the utilities because the CSS minifier dropped `backdrop-filter` from the hand-written rule
— verified in the browser, not assumed. Motion is CSS: a 45 ms-staggered `reveal` entrance,
a 4 px hover lift with a specular sweep, a spring-eased icon chip and a press scale, all
disabled by the existing global `prefers-reduced-motion` block. No animation library, no
client JavaScript for presentation.

**Consequences.** Tiles stay server components and keep working without JavaScript. Hover
transforms are decorative only, so a missed hover never hides functionality.

---

## ADR-013 — Encryption format `stackbase/1`: libsodium secretstream + Argon2id vault

**Context.** SRS A6 selects a reviewed libsodium streaming construction with Argon2id for
passphrase derivation and requires the exact package, parameters and interoperability test
vectors to be pinned before implementation (Milestone 0).

**Decision.** The format is specified in [encryption-format.md](encryption-format.md) and
implemented client-side only, on `libsodium-wrappers-sumo` (pinned in `apps/web`):
Argon2id13 (`ops=3`, `mem=64 MiB`) derives a KEK that wraps a random 32-byte vault key;
each file version gets a random data key wrapped under the vault key; content is encrypted
with `crypto_secretstream_xchacha20poly1305` in 1 MiB chunks (last chunk tagged `FINAL`,
24-byte header, 17-byte per-chunk overhead). Versions persist a versioned JSON manifest
(`file_versions.encryption_manifest`) with the wrapped data key, stream header, sizes and
SHA-256 hashes; the server validates the manifest's structure and consistency but can never
decrypt. Deterministic vectors are committed and asserted by tests.

**Consequences.** The server stays unable to read content, file sizes and chunk counts
remain visible to it (documented), and the per-version wrapped data key leaves room for
share-specific key transfer in Milestone 5 without exposing the vault key. Any format
change requires a version bump; `encryption_format_version` makes the stored version
explicit.

---

## ADR-014 — Vault storage and `/api/v1/encryption/vault` (documented deviation)

**Context.** SRS A6 requires a passphrase-wrapped vault key with recovery verification, and
C4 requires vault status in Settings — but B2 defines no table for it and A10 no endpoint.

**Decision.** New server-only table `public.encryption_vaults` (RLS enabled, no client
grants, like `storage_connections`) holding only non-secret parameters and ciphertext:
KDF algorithm/limits/salt, wrapped vault key (nonce + ciphertext), recovery verifier, format
version. `GET /api/v1/encryption/vault` returns the record (or null) so a client can
unwrap; `POST /api/v1/encryption/vault` creates it once and returns **409
`VAULT_ALREADY_EXISTS`** afterwards — the API never silently replaces an inaccessible vault
key (A6.4). `GET /api/v1/setup/status` gains an `encryption.vault` field
(`not_configured` | `configured`).

**Consequences.** The deviation from A10/B2 is explicit here and in the milestone report.
Passphrase rotation/re-wrapping and share-specific key transfer are Milestone 5 work; the
schema already supports both without re-encrypting file content.

---

## ADR-015 — Provider abstraction with a first-class local development provider

**Context.** A4.2 requires a provider-independent interface; local development and CI must
run without a Telegram account (the Milestone 1 precedent), yet production storage must be
the user's own Telegram account.

**Decision.** `apps/api/src/storage` defines the domain contract
(`StorageProvider`: `checkConnection` / `upload` / `download` / `delete` / `inspect`) with
two implementations:

- **`LocalStorageProvider`** (`STORAGE_PROVIDER=local`, development/test only) — stores
  ciphertext under `apps/api/.data/objects/<userId>/`. `local` is rejected when
  `NODE_ENV=production`, mirroring the `AUTH_MODE=dev` rule, so production is always
  Telegram.
- **`TelegramStorageProvider`** (`STORAGE_PROVIDER=telegram`) — uploads to the user's
  Saved Messages through MTProto and re-downloads through the same session.

Migration `0012` generalizes `storage_objects`: `provider_reference jsonb` becomes the
documented provider-facing reference, the Telegram-specific columns become nullable but are
constrained to remain present for `provider='telegram'`, `provider` may be `'telegram'` or
`'local'`, and a unique constraint covers `(user_id, provider, provider_reference)`. A local
connection row is provisioned lazily for the local provider so upload bookkeeping has a
real `storage_connection_id`.

**Consequences.** Reviewers can exercise the full encrypted pipeline with zero external
credentials; the Telegram path is unit-tested against an injected fake client and needs a
real account for manual verification (documented limitation). The API tailors behavior by
environment variable, never by silent fallback: `telegram` without credentials is a
configuration error at startup.

---

## ADR-016 — Telegram client pinned to `teleproto`; sessions sealed with AES-256-GCM

**Context.** Milestone 0 requires selecting and pinning the Telegram client library. GramJS
(`telegram`) is archived and deprecated; A4.4 requires session material to be stored under
authenticated encryption with a deployment-managed key, and never returned by an endpoint.

**Decision.** Pin `teleproto@1.232.0` (the maintained, largely compatible fork) as an exact
dependency of `apps/api`. Session strings are sealed with AES-256-GCM under
`SESSION_ENCRYPTION_KEY` (32 bytes, base64; required when `STORAGE_PROVIDER=telegram`) in
the format `v1.<base64 nonce>.<base64 ciphertext+tag>`, stored in
`storage_connections.encrypted_session` with `session_key_version = 'v1'`. Login state
(pending `phoneCodeHash`, client instance) lives in memory only, one pending login per
user, TTL 10 minutes. Objects are uploaded as documents named `<storageObjectId>.bin` so
user file names never reach the provider.

**Consequences.** No session string is ever returned, logged or stored in plaintext; losing
`SESSION_ENCRYPTION_KEY` forces a Telegram re-login but never exposes a session. Manual
verification against a real account is required for the network path (see the milestone
report); everything below the network boundary is covered by unit tests.

---

## ADR-017 — Explicit ciphertext staging; browser transfers proxied by Next route handlers

**Context.** B2 warns that Telegram's temporary upload parts are not durable staging and
requires an explicit, documented mechanism. A5.6 requires downloads to stream through the
backend. ADR-006 keeps the session token out of the browser, so the browser cannot call the
API directly.

**Decision.**- Staging is **one preallocated file per upload job** at
  `.data/staging/<userId>/<jobId>.part`. Each chunk is written positionally at its
  deterministic offset (header 24 bytes, chunks of `plaintextChunkSize + 17`), so the staged
  file is already the final ciphertext stream. `upload_chunks` keeps per-chunk metadata
  (checksum, state) only.
- `upload_jobs` gains a validated `manifest jsonb` column holding the manifest exactly as
  the client declared it at create (hashes excluded). A browser that encrypts in a single
  pass cannot know the final hashes before it has streamed the file, so finalize declares
  `ciphertextHash` and `plaintextFingerprint`; the server verifies the assembled stream
  against them and persists the completed manifest on the immutable version. Both pieces
  are stored, so a restart can still finish the job — only the client can produce them.
- Integrity is checked three times before a version exists: per-chunk SHA-256 on receipt,
  full-stream SHA-256 after the last chunk, and a provider `inspect` after upload.
- Quotas: at most `MAX_ACTIVE_UPLOADS` (default 4) unfinished jobs per user, per-job size
  capped by `MAX_UPLOAD_BYTES`; staging is deleted on completion, cancellation and
  permanent failure, and a `storage:verify` CLI sweeps leftovers.
- The browser sends ciphertext through Next route handlers that mirror the API's upload
  and download contracts: `POST /api/uploads`,
  `PUT /api/uploads/:uploadId/chunks/:chunkNumber`, `POST /api/uploads/:uploadId/finalize`,
  `POST /api/uploads/:uploadId/cancel`, `POST /api/encryption/vault`,
  `GET /api/files/:fileId/versions` and
  `GET /api/files/:fileId/versions/:versionId/download`. The handler attaches the httpOnly
  session cookie as a bearer token server-side. No token or session material reaches the
  browser, and the API itself never has to know about cookies.

**Consequences.** Bounded memory on both sides (1 MiB chunks end-to-end). The server disk
holds ciphertext only, briefly, under the documented directory and cleanup rules. Resume
after refresh (Milestone 4) reuses this state: `GET /api/v1/uploads` returns every
unfinished job with its replay key, received chunk numbers and the client-declared
`source_fingerprint`; a job nobody has touched for two minutes (fifteen while
finalizing) is swept to `needs_source_file`, and the browser re-picks the source file,
verifies its fingerprint against the stored one and continues from the chunks that
already arrived.

---

## ADR-018 — Error codes added for storage, uploads and vaults

**Decision.** Three codes extend the SRS A11 list (which is explicitly non-exhaustive):
`VAULT_ALREADY_EXISTS` (409, never silently replace a vault), `TELEGRAM_NOT_CONFIGURED`
(503, the Telegram flow was requested while the deployment is not configured for it) and
`UPLOAD_NOT_FOUND` (404). Transfer failures use the existing codes: chunk checksum or
full-stream hash mismatch and provider size mismatch return `UPLOAD_INTEGRITY_FAILED`
(422), wrong job state returns `UPLOAD_STATE_CONFLICT` (409), quota/size violations return
`FILE_TOO_LARGE` (413), a missing remote object sets `storage_status='missing'` and returns
`STORAGE_RECONCILIATION_REQUIRED` (409), Telegram flood waits map to
`TELEGRAM_RATE_LIMIT` (429) and invalidated sessions map to `TELEGRAM_SESSION_EXPIRED`
(409).

**Consequences.** Clients branch on stable codes; the milestone report lists which codes
appear on which endpoint.
