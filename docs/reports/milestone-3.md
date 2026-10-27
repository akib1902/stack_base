# Milestone 3 — Encryption and Telegram storage

**Date:** 27 October 2026
**Scope:** SRS Part E, Milestone 3 (cryptographic format, vault creation and unlocking,
Telegram provider adapter, encrypted uploads and downloads, persisted storage references,
integrity checks and reconciliation). Local-first variant retained: everything below runs
with zero external credentials through the `local` provider; Telegram is configured by
setting three environment variables and linking an account from Settings.

**Exit criterion:** *encrypted end-to-end file storage works with the documented format.*
Met and demonstrated in a browser (see "Manual browser verification").

---

## Implemented behavior

**Format and contracts (`stackbase/1`)**

- `docs/architecture/encryption-format.md` pins the format: Argon2id13 KEK
  (`ops=3`, `mem=64 MiB`, per-vault parameters), a random 32-byte vault key wrapped with
  XSalsa20-Poly1305, a recovery verifier, and per-version data keys wrapped under the vault
  key; content is `crypto_secretstream_xchacha20poly1305` over 1 MiB plaintext chunks
  (24-byte header, 17 bytes of overhead per chunk, last chunk tagged `FINAL`).
- `packages/contracts/src/encryption.ts` and `uploads.ts` carry the schemas **and the chunk
  arithmetic** (`totalChunksFor`, `ciphertextSizeFor`, `ciphertextChunkOffset`,
  `ciphertextChunkLength`) used by the client encryptor, the server validator and the
  staging writer, so the three cannot drift.
- The browser cannot know the final hashes before it has streamed a file in a single pass,
  so `POST /api/v1/uploads` carries an `UploadManifest` without hashes and
  `…/finalize` declares `ciphertextHash` and `plaintextFingerprint`; the server verifies
  the assembled stream against them before any version exists.
- Migration `0012` adds `public.encryption_vaults` (server-only) and generalizes
  `storage_objects` to `provider_reference jsonb` with a `(user_id, provider,
  provider_reference)` unique constraint.

**API (Fastify)**

- `GET|POST /api/v1/encryption/vault` — ciphertext only; `POST` returns `409
  VAULT_ALREADY_EXISTS` instead of silently replacing an inaccessible key.
- `POST /api/v1/storage/telegram/{authorize,verify,disconnect}` — phone → code → optional
  two-step password, plus `{}` as a session health check. Pending logins live in memory
  (TTL 10 min, one per user).
- `POST /api/v1/uploads` (idempotency key ⇒ same job), `GET /api/v1/uploads/:id`,
  `PUT …/chunks/:n` with a required `x-chunk-checksum`, `POST …/finalize`,
  `POST …/cancel`.
- `GET /api/v1/files/:id/versions` and `GET …/versions/:id/download` — the ciphertext
  stream only, with `x-stackbase-ciphertext-hash`; no permanent public URL.
- Integrity is checked three times before a version exists: per-chunk SHA-256 on receipt,
  full-stream SHA-256 after assembly, provider `inspect` after upload. Failures return
  `UPLOAD_INTEGRITY_FAILED` (422).
- Staging is one preallocated positional file per job at `.data/staging/<user>/<job>.part`
  (ADR-017); it is deleted on completion, cancellation and permanent failure. Quotas:
  `MAX_ACTIVE_UPLOADS` (default 4) and `MAX_UPLOAD_BYTES`.
- `pnpm storage:verify [--email|--user] [--dry-run]` re-hashes every stored object, reports
  missing or size-mismatched copies and marks them `missing` for reconciliation.

**Storage providers**

- `apps/api/src/storage` defines the provider contract (`checkConnection`, `upload`,
  `download`, `delete`, `inspect`) with two implementations:
  - **local** — ciphertext under `.data/objects/<userId>/`; rejected when
    `NODE_ENV=production` (ADR-015), so production storage is always the owner's Telegram
    account.
  - **telegram** — MTProto through `teleproto@1.232.0`, objects stored as
    `<storageObjectId>.bin` so user file names never reach Telegram. Session strings are
    sealed with AES-256-GCM under `SESSION_ENCRYPTION_KEY` before storage and are never
    returned, logged or exposed by an endpoint (ADR-016).

**Web (Next.js)**

- `src/lib/crypto` implements the format client-side only, on `libsodium-wrappers-sumo`:
  `vault.ts` (create/unlock, verifier check, data-key wrapping), `file-format.ts`
  (single-pass encryptor with incremental hashing; streaming decryptor that reassembles
  exact chunk boundaries, rejects reordered/truncated/extended streams and verifies the
  recorded SHA-256), `encoding.ts`, `errors.ts` (stable codes + user copy) and committed
  `test-vectors.ts`.
- The vault key is React state in an in-memory provider: no cookie, no storage, no server
  round-trip. Reloading locks the vault — the documented `stackbase/1` trade-off.
- Settings: create/unlock/lock card with a real status badge, and a Telegram connect flow
  (phone → code → password, check connection, disconnect).
- Library: an *Upload* button and a drop target over the file view, gated on the vault
  (unlock dialog when locked, a pointer to Settings when no vault exists), plus a floating
  queue panel with per-file progress, cancel, dismiss and a resume-capable **Retry**.
- Details dialog: *Download & decrypt* streams the ciphertext through the app, verifies it
  chunk by chunk and only then offers the file.
- Because the session token is httpOnly (ADR-006), browser-initiated calls go through the
  app's own route handlers (`/api/uploads/…`, `/api/encryption/vault`,
  `/api/files/…`, `/api/storage/telegram`), which attach the token server-side
  (ADR-017).

## Tests run

| Suite | Result |
|---|---|
| `apps/api/test/*` (12 files, 122 tests) | pass — including `uploads.test.ts` (10: end-to-end create → chunks → finalize → immutable version, per-chunk checksums, state conflicts, owner isolation), `encryption-vault.test.ts` (7), `telegram-provider.test.ts`, `storage-local.test.ts`, `storage-session.test.ts`, plus the Milestone 1–2 suites (auth, RLS, library) |
| `apps/web/test/*` (8 files, 69 tests) | pass — `crypto-vectors.test.ts` (15: pinned KEK, wrapped key and verifier, committed single-chunk ciphertext, wrong passphrase/verifier/key, tampered streams, manifest validation), `crypto-file-format.test.ts` (9: layout arithmetic for 0/1/chunk−1/chunk/chunk+1/2×chunk sizes, hashes checked against an independent SHA-256, chunk-bounded reads, reordered/dropped/corrupted chunks), `upload-pipeline.test.ts` (8: create → stream → finalize ordering, resume skips delivered chunks, completed-job replay, cancellation, failure without finalize, no plaintext in transit), plus the Milestone 1–2 web suites |
| `pnpm typecheck` | pass — contracts, API, web |
| `pnpm build` | pass — Next 16 production build; the eight new `/api/*` route handlers register as dynamic routes |
| `pnpm db:migrate` | pass — 12 migrations applied to the local PGlite database; `0010` consistency checks hold |
| Manual browser verification | pass (below) |

One `dashboard-cards.test.tsx` assertion failed once while a full parallel `pnpm test` run
coincided with the working tree being committed (line-ending normalisation touched the
source mid-run). It passes in isolation and in two consecutive full runs afterwards; no
code change was needed, and nothing was skipped to make it pass.

## Manual browser verification

Against `pnpm dev:api` + `pnpm dev:web` on a fresh account, in a real browser:

1. **Sign in** (dev auth) → dashboard and Settings render from live API data.
2. **Create a vault** in Settings → `POST /api/v1/encryption/vault` returned 200, badge
   moved from *Not set up* to *Unlocked*; the stored record contains only salt, KDF
   parameters, wrapped key and verifier.
3. **Locked-gate check** — after a hot reload (key discarded, as designed) a file drop
   opened the unlock dialog instead of uploading; a wrong passphrase produced
   *"That passphrase does not unlock this vault."*; the correct passphrase unlocked.
4. **Upload** a 2,600,000-byte file by dropping it onto the library: 3 chunks
   (1 MiB + 1 MiB + 503,856 bytes), each confirmed by the server, progress reported in
   the queue panel, then *Encrypted and stored.*
5. **Server state** — file `contentStatus: ready`, version 1 with
   `ciphertextSize = 2,600,000 + 3·17 + 24 = 2,600,075`, `storageStatus: available`,
   manifest with a 24-byte header and a 48-byte wrapped key; the stored object on disk is
   exactly 2,600,075 bytes; **zero staging files left behind**.
6. **Download & decrypt** — captured the produced blob and compared it with the original
   payload: **byte-for-byte identical** (2,600,000 bytes, first difference at −1).
7. Cross-checks during the run: `x-chunk-checksum` values match an independent SHA-256 of
   each chunk body (the API rejects a mismatch), and a second upload of the same bytes
   produced an independent job and version.

## Known limitations

- **Telegram was not exercised against a real account in this run.** The adapter is
  unit-tested against an injected fake client (login, code/password, upload, download,
  flood-wait mapping) and the local provider was used for the browser verification;
  manual verification with a real Telegram account remains outstanding and needs
  `STORAGE_PROVIDER=telegram` plus `TELEGRAM_API_ID`/`TELEGRAM_API_HASH`/
  `SESSION_ENCRYPTION_KEY`.
- **Resume/retry UI is Milestone 4.** The server already supports it (idempotency keys and
  `receivedChunkNumbers`, exercised by the tests); the panel exposes *Retry* for a failed
  job but no pause, prioritisation or source-file reselection yet.
- No previews, storage insights, version history UI, sharing or PWA (Milestones 4–6).
- The vault key exists only in the page's memory; there is no passphrase rotation UI yet
  (the format supports re-wrapping without re-encrypting files — Milestone 5).
- Decryption buffers the whole file into a `Blob` before saving; streaming/partial
  decryption arrives with previews.
- Chunk sizes, ciphertext lengths and file names are visible to the server by design
  (documented in the format's limitations section).
- `STORAGE_PROVIDER=local` is development-only and rejected in production; PGlite remains a
  development/test driver.
- No Playwright end-to-end suite, CI pipeline or container images yet; the browser
  verification above was driven interactively.

## Next milestone entry criteria (Milestone 4 — upload reliability and previews)

1. Persistent upload jobs that survive a page reload, with explicit pause/resume/cancel and
   prioritisation in the queue panel.
2. Chunk-level retry with backoff and provider rate-limit (`TELEGRAM_RATE_LIMIT`)
   handling surfaced in the UI.
3. Source-file reselection for jobs stuck in `needs_source_file`, and reconciliation for
   `reconciliation_required` rows via `storage:verify`.
4. Image, video, audio and PDF previews produced without the server ever seeing plaintext
   (client-side decoding from the decrypted stream).
5. Storage insights: per-provider byte totals, object counts and version sizes.