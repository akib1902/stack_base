# Milestone 4 — Upload reliability and previews

**Date:** 28 October 2026
**Scope:** SRS Part E, Milestone 4 (persistent upload jobs, chunk tracking with retry and
resume, source-file reselection, image/video/audio/PDF previews and storage insights).
Local-first variant retained: everything below runs with the `local` provider and no
external credentials; Telegram remains a configured alternative.

**Exit criterion:** *interrupted uploads recover safely and previews do not expose file
contents to the server.* Met and demonstrated in a browser (see "Manual browser
verification").

---

## Implemented behavior

**Durable queue (API)**

- `GET /api/v1/uploads` returns every unfinished job, newest first (limit 50), including
  `receivedChunkNumbers` so a resumed client never has to guess what the server holds.
- Reading the queue runs a stale-job sweep: a client-driven job (`queued`, `preparing`,
  `encrypting`, `transferring`, `retrying`) untouched for **2 minutes** becomes
  `needs_source_file`; a stalled `finalizing` job gets **15 minutes** because a provider
  transfer legitimately runs without chunk traffic, then becomes
  `reconciliation_required`. Paused jobs are never swept — pausing is not a crash.
- State machine endpoints: `POST /api/v1/uploads/:id/pause|resume|retry`.
  `pause` accepts any client-driven job; `resume` only accepts `paused` and moves it to
  `retrying`; `retry` accepts `failed`, `needs_source_file` and `paused`, increments
  `retry_count`; `reconciliation_required` is refused with
  `STORAGE_RECONCILIATION_REQUIRED` (409) instead of silently discarding a job that may
  already exist in provider storage; unknown ids are 404 and invalid transitions 409
  `UPLOAD_STATE_CONFLICT`.
- Replaying an idempotency key with a **different** source fingerprint is rejected, so a
  reselected file can never be stitched onto another file's job.
- No migration was needed: `0006_upload_jobs_chunks.sql` already carried `status`,
  `source_fingerprint`, `retry_count` and the chunk bookkeeping.

**Web queue**

- `UploadProvider` restores the queue on mount from `GET /api/uploads`. A refresh cannot
  keep a `File` handle, so each restored row becomes `needs_source_file` with its real
  progress (`receivedChunks / totalChunks`) and a **Choose file** action; paused rows come
  back paused and `reconciliation_required` rows come back non-retryable with an explicit
  reason. Cancelled and completed jobs are excluded.
- Reselection recomputes the source file's SHA-256 in the browser and refuses a different
  file before a single chunk is sent; the server compares its stored fingerprint again
  when the job is replayed.
- **Pause** aborts with reason `pause`, so the pipeline does not cancel the server job;
  **Resume** first flips the server row back to an accepting state and only then queues the
  transfer, so a refused resume cannot send chunks into a closed job; **Cancel** removes
  staging server-side.
- Transient failures (network `TypeError`, HTTP 429, 5xx) retry automatically up to three
  times with exponential backoff (500 ms doubling to 8 s, ±30 % jitter) and the panel shows
  the attempt and countdown. Non-transient failures surface the API's own message and keep
  the job for a manual **Retry**.
- The panel reports server-confirmed progress, not optimistic bytes, and runs one file at a
  time so a batch cannot saturate the connection or a provider's rate limits.

**Previews**

- `previewKindFor` classifies images, video, audio and PDFs from the stored MIME type, then
  falls back to the extension for `application/octet-stream` uploads; everything else gets
  no viewer. `MAX_PREVIEW_BYTES` is 64 MiB, so a huge file stays download-only rather than
  buffering in the tab.
- The file details dialog decrypts the newest available version in the page: the ciphertext
  stream is fetched through this app's route handler, verified chunk by chunk by the
  existing streaming decryptor, assembled into a `Blob` and rendered from an object URL
  that is revoked when the preview changes or unmounts. Images, video, audio and PDFs use
  typed elements (`<img>`, `<video>`, `<audio>`, `<object type="application/pdf">`) with a
  text fallback; nothing is executed and the API never receives or serves plaintext.
- A locked vault shows the unlock action instead of an error; metadata-only files explain
  that no version exists yet.

**Storage insights**

- `GET /api/v1/insights` returns real aggregates over the caller's own rows: live files,
  bytes, folders and tags; trashed files/folders and their bytes; total versions and the
  bytes of superseded versions (current versions and trashed files excluded); category
  totals (the same query the dashboard uses); the ten largest files and folders; and
  duplicate candidates grouped by the client-declared plaintext fingerprint, capped at ten
  groups and 200 rows. Everything is owner-scoped SQL; `generatedAt` records the read.
- The `/insights` page renders stat tiles, category bars, trash/version figures, largest
  files and folders with deep links, and duplicate groups with the bytes that could be
  freed. The sidebar entry is now live; `/uploads` remains announced but disabled.

**Browser proxy (completes ADR-017)**

Two gaps were found by the browser run and fixed:

- `GET /api/uploads` and `POST /api/uploads/:id/pause|resume|retry` had no Next route
  handlers, so queue restore returned 405 and the new actions were unreachable from the
  browser even though the API supported them. The handlers now forward the session
  cookie's token exactly like the existing create/chunk/finalize/cancel routes.
- `apiFetch` declared `content-type: application/json` on every request, including
  bodyless POSTs. Fastify rejects an empty JSON body with 400, which surfaced as a 500 on
  cancel, pause, resume and retry. The header is now sent only when a body exists, so all
  four actions work through the browser.

## Changed files

API: `src/modules/uploads/repository.ts`, `src/modules/uploads/routes.ts`,
`src/modules/library/insights-repository.ts` (new),
`src/modules/library/insights-routes.ts` (new), `src/modules/library/index.ts`,
`src/modules/library/summary-repository.ts`, `src/database/seed-cli.ts`;
`test/uploads-queue.test.ts` (new), `test/insights.test.ts` (new).

Web: `src/features/uploads/upload-context.tsx`, `upload-panel.tsx`, `pipeline.ts`,
`transport.ts`; `src/features/previews/file-preview.tsx` (new), `preview-kind.ts` (new);
`src/app/(app)/insights/page.tsx` (new); `src/components/layout/NavLinks.tsx`,
`src/components/library/FileDetailsDialog.tsx`; `src/lib/crypto/file-format.ts`;
`src/lib/api/client.ts`; `src/app/api/uploads/route.ts` and the new
`src/app/api/uploads/[uploadId]/{pause,resume,retry}/route.ts`;
`test/preview-kind.test.ts` (new), `test/upload-pipeline.test.ts`.

Contracts: `packages/contracts/src/insights.ts` (new), `uploads.ts`, `index.ts`.

Docs: `README.md`, `docs/setup/local-development.md`, `docs/architecture/decisions.md`
(ADR-017 consequence), this report.

## Tests run

| Suite | Result |
|---|---|
| `apps/api/test/*` (14 files, 140 tests) | pass — including `uploads-queue.test.ts` (12: queue list and isolation, cancelled jobs excluded, pause/resume, retry transitions and counting, idempotent fingerprint replay, stale sweep of untouched jobs vs untouched paused jobs, stalled finalize parked for reconciliation) and `insights.test.ts` (6: live/trash/version totals without double counting, category bytes, largest files and folders, duplicate groups, owner isolation, auth required) |
| `apps/web/test/*` (9 files, 75 tests) | pass — including `upload-pipeline.test.ts` (10: order, progress, resume of delivered chunks, completed replay, cancel, pause keeping the job, failure without finalize, backoff bounds, unique idempotency keys, no plaintext in transit) and `preview-kind.test.ts` (4) |
| `pnpm typecheck` | pass — contracts, API, web |
| `pnpm build` | pass — Next 16 production build; the new `GET /api/uploads` and pause/resume/retry handlers register as dynamic routes |
| Manual browser verification | pass (below) |

## Manual browser verification

Against `pnpm dev:api` + `pnpm dev:web` with a fresh development database, in a real
browser at `http://localhost:3000` (Next 16 blocks its dev client assets from other
origins, so `127.0.0.1` leaves the page non-interactive):

1. **Sign in** (dev auth) → dashboard renders live data; the vault reads *Not set up*.
2. **Create a vault** in Settings (Argon2id) → badge moves to *Unlocked*; the stored
   record contains only salt, KDF parameters, wrapped key and verifier.
3. **Upload** a 152-byte PNG through the library's file picker: the queue reports
   encrypting → transferring → verifying → *Encrypted and stored.*; the library shows one
   file, and the stored object is exactly **193 bytes** (24-byte header + 152-byte
   plaintext + 17-byte tag) with **no staging files** left behind.
4. **Preview** — opening the file's details decrypted the stored ciphertext in the tab to
   a `blob:` URL and rendered the image at its real 64×64 size; the dialog states that the
   server never sees the plaintext.
5. **Queue restore** — with the tab reloaded, an unfinished job created for the same
   account appeared in the panel as *"interrupted-notes.txt — 0 of 1 chunks already
   stored. Choose the file again to resume."* with a **Choose file** action and no Retry
   (it is not a retryable state).
6. **Pause / resume / cancel through the browser** — the new proxy routes answered
   `200` with job status `paused` → `retrying` → `cancelled`; after cancelling, a reload
   showed an empty queue, proving cancelled jobs are excluded from the restore.
7. **Storage insights** — one file and 152 B with one stored version; after uploading a
   second copy of the same bytes the page showed 2 files / 304 B and
   *"2 copies of 152 B · 152 B wasted"*, grouped by the client-side plaintext fingerprint.
8. Cross-checks: the queue panel never reported a file as stored before finalize returned,
   and `apps/api/.data/objects/<user>/` contained exactly the two 193-byte ciphertext
   objects.

## Known limitations

- **Telegram was not exercised against a real account in this run.** The adapter remains
  covered by its unit suite; this verification used the development filesystem provider.
- **Source-file reselection after a refresh is by design, not optional.** A browser cannot
  retain a `File` handle across a reload, so a restored job waits for the original file
  (verified by its SHA-256 fingerprint). Pause/resume within the same tab keeps the handle
  and needs no reselection.
- **Previews buffer the decrypted file in memory** (bounded at 64 MiB) and use one object
  URL; there is no range/streamed media playback or thumbnail cache for very large media.
- Jobs run **one at a time**; there is no reordering or per-file priority UI yet.
- Stale thresholds (2 min / 15 min) are fixed in the repository rather than configurable.
- A provider rate-limit response (429) triggers the same exponential backoff as a network
  error, but the panel shows a generic retry message rather than a provider-specific
  flood-wait countdown.
- Insights only **reports** duplicate candidates; there is no "keep one copy" deletion
  action yet.
- No version-history UI, sharing, PWA/offline support or Supabase sign-in screen
  (Milestones 5–6).
- `STORAGE_PROVIDER=local` stays development-only, and PGlite remains a development/test
  driver (`DATABASE_URL` is required for production concurrency).

## Next milestone entry criteria (Milestone 5 — recovery and sharing)

1. Version history: list every version of a file (the read endpoint exists), pin/restore an
   older version as current without deleting ciphertext that retained versions reference,
   and show it in the file details dialog.
2. Trash and retention: a purge path that honors the configured retention and an explicit
   "delete permanently" flow, with restore already covered.
3. Share creation and revocation: owner-scoped share rows and endpoints referencing one
   immutable version, with revocation checked server-side on every access.
4. Share-specific key transfer: wrap the version's data key for a share so a recipient can
   decrypt without ever receiving the vault key, plus the read-only download view.
5. Audit events: append-only records for share create/revoke, trash/purge and version
   restore, readable only by the owner.
6. Tests for both allowed and denied operations, expiry and revocation, and a browser
   pass proving a revoked link stops working while already-downloaded copies remain.
