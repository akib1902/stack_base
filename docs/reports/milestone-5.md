# Milestone 5 — Recovery and sharing

**Date:** 28 October 2026
**Scope:** SRS Part E, Milestone 5 (version history, Trash and retention, share creation
and revocation, share-specific key transfer, audit events).
Local-first variant retained: everything below runs with the `local` provider and no
external credentials.

**Exit criterion:** *file lifecycle and sharing behavior pass security and recovery
tests.* Met — the API and web suites cover the allowed and denied paths, and the
revocation flow was demonstrated in a browser (see "Manual browser verification").

---

## Implemented behavior

**Version history**

- `GET /api/v1/files/:fileId/versions` lists every stored version with its number,
  size, creation time and whether it is the file's current pointer.
- `POST /api/v1/files/:fileId/versions/:versionId/restore` **appends** a new version
  that points at the same immutable ciphertext and moves `current_version_id` to it.
  Nothing is ever deleted: `file_versions` is immutable by trigger, so a retained
  version keeps its bytes and stays downloadable after a restore. The lookup is
  scoped to the owner and joins files where `deleted_at is null`, so a foreign,
  unknown or trashed version is `VERSION_NOT_FOUND` (404). The UI disables
  **Restore** on the current version; the endpoint itself does not special-case
  it, so a direct API call would append a redundant version with the same content.
- The file details dialog renders the list through `VersionHistory`: the current
  version is labelled *Current* with **Restore** disabled, every other version offers
  **Restore** and **Download**, and a standing note explains that restoring never
  deletes anything.

**Trash and retention**

- `src/modules/library/purge.ts` owns permanent deletion: provider object removal
  first (staged as the source of truth), then the row, so a failed provider call
  leaves a retryable file rather than an orphaned object. Purging a file or folder
  cascades to its versions and storage objects.
- Retention is read from `user_settings.trash_retention_days` per owner, clamped to
  0–3650; **0 means "keep until removed"** and is treated as a deliberate setting,
  not a missing value. The default is 30 days.
- `GET /api/v1/trash` runs `purgeExpiredTrash` for the caller before listing, so
  opening Trash enforces retention; individual provider failures are skipped and
  retried on the next visit, and the list still loads. `POST /api/v1/trash/purge`
  exposes the same sweep as an explicit action (the UI's **Purge expired now**).
- Explicit permanence: `DELETE /api/v1/trash/files/:fileId` and
  `DELETE /api/v1/trash/folders/:folderId`, alongside the existing restore routes.
  The list response carries `retentionDays` and each row's expiry date, which the
  Trash view prints as *Expires Nov 27, 2026*.

**Share creation and revocation**

- `POST /api/v1/shares` pins **one immutable version**: `file_version_id` is stored,
  so later uploads and restores never change what an existing link serves. The
  payload carries the wrapped key, an expiry (`1 day`, `7 days`, `30 days`,
  `never`) and an optional download limit.
- The raw token is `randomBytes(32).toString('base64url')` and is returned exactly
  once; only its SHA-256 is stored (`token_hash`). Every public lookup hashes the
  incoming token, so the database never holds a usable secret.
- `POST /api/v1/shares/:shareId/revoke` flips `revoked_at`, and **every** public
  read re-checks revocation, expiry and the download limit — metadata
  (`GET /api/public/shares/:token`) is limited to 60 req/min and the ciphertext
  route (`…/download`) to 30 req/min.
- Refusals are specific and audited: `SHARE_REVOKED` (410), `SHARE_EXPIRED` (410),
  `SHARE_DOWNLOAD_LIMIT_REACHED` (410), `SHARE_KEY_UNAVAILABLE` (409, pre-0013
  rows), unknown or malformed tokens 404 with no audit event (there is no owner to
  attach them to). The download counter is incremented atomically with the limit
  check, so two concurrent downloads cannot overshoot `max_downloads`.

**Share-specific key transfer (A7.2)**

- Migration `0013_share_wrapped_keys.sql` adds a nullable `wrapped_key jsonb` to
  `shares` plus a shape constraint. The browser unwraps the version's data key with
  the vault key and re-wraps it under a fresh random **share key**; only that wrapped
  blob is stored. The share key travels in the URL fragment, which browsers never
  send to the server, so the API serves ciphertext it cannot open and the vault key
  never leaves the owner's device.
- `src/lib/crypto/share.ts` performs the re-wrap and the recipient-side unwrap and
  builds the link from the fragment only; a wrong or malformed fragment secret fails
  decryption instead of falling back to the server.
- The recipient view at `/s/[token]` is read-only: metadata, expiry, download count,
  one **Download & decrypt** button. Ciphertext is fetched, verified chunk by chunk
  and against the recorded SHA-256, decrypted in the tab and saved locally.

**Audit events (FR-13)**

- Append-only rows with `success | failure | denied`, resource type/id and JSON
  metadata, written for share create/download/revoke (including *denied* public
  attempts), trash, purge and version restore. Events never contain raw tokens,
  keys or plaintext.
- `GET /api/v1/audit?limit=` is owner-scoped only; the `/shared` page renders the
  latest 20 as "Recent activity".

**Web surfaces**

- `share-dialog.tsx` (create, copy-once link, per-file list with status, expiry,
  downloads and **Revoke**), `share-list.tsx` + activity feed on `/shared`,
  `public-share-view.tsx` behind `/s/[token]` and its `layout.tsx` (no app shell,
  no authenticated navigation).
- `TrashView` gained retention copy, per-row expiry, **Restore** / **Delete forever**
  and the **Purge expired now** action; `FileDetailsDialog` gained the version
  panel and a **Share link** entry point; `NavLinks` / `MobileNavigation` expose the
  Shared page.
- Next proxy handlers: `/api/shares`, `/api/shares/[shareId]/revoke`,
  `/api/public/shares/[token]`, `/api/public/shares/[token]/download` and
  `/api/files/[fileId]/versions/[versionId]/restore`, forwarding the session token
  like the existing routes.

## Changed files

API: `src/modules/versions/{repository,routes}.ts` (new),
`src/modules/shares/{repository,routes}.ts` (new),
`src/modules/audit/{repository,routes}.ts` (new),
`src/modules/library/purge.ts` (new), `src/modules/library/trash-routes.ts`,
`src/modules/library/{files,folders}-routes.ts`, `src/modules/library/index.ts`,
`src/app.ts`;
`test/shares.test.ts` (new), `test/trash-retention.test.ts` (new),
`test/versions.test.ts` (new), `test/helpers.ts`, `test/library-files.test.ts`.

Web: `src/features/shares/{share-dialog,share-list,public-share-view}.tsx` (new),
`src/features/uploads/{version-history,download-button}.tsx`,
`src/lib/crypto/{share,errors}.ts` (`share.ts` new), `src/lib/api/client.ts`,
`src/lib/utils/save-file.ts`;
`src/app/(app)/shared/page.tsx` (new), `src/app/s/[token]/page.tsx` (new),
`src/app/s/layout.tsx` (new), `src/app/(app)/settings/page.tsx`,
`src/components/layout/{NavLinks,MobileNavigation}.tsx`,
`src/components/library/{FileBrowser,FileDetailsDialog,TrashView}.tsx`;
`src/app/api/shares/route.ts`, `src/app/api/shares/[shareId]/revoke/route.ts`,
`src/app/api/public/shares/[token]/{route.ts,download/route.ts}`,
`src/app/api/files/[fileId]/versions/[versionId]/restore/route.ts` (new);
`test/crypto-share.test.ts` (new).

Contracts: `packages/contracts/src/{shares,audit,lifecycle}.ts` (new),
`errors.ts`, `index.ts`.
Database: `supabase/migrations/0013_share_wrapped_keys.sql` (new).
Docs: this report.

## Tests run

| Suite | Result |
|---|---|
| `apps/api/test/*` (17 files, 152 tests) | pass — including `shares.test.ts` (5: hashed token and owner-only listing, public metadata and ciphertext with atomic download limit, revocation/expiry/unknown token refusals, foreign-user denial, audit after delete) and `trash-retention.test.ts` (4: retention sweep honouring `trash_retention_days`, explicit permanent delete, purge refusal for live items, folder cascade) and `versions.test.ts` (3: append-and-move-pointer restore, foreign denial, audit event) |
| `apps/web/test/*` (10 files, 80 tests) | pass — including `crypto-share.test.ts` (5: re-wrap without exposing the vault key, decrypt with the fragment secret, rejection of a wrong or malformed secret, link built from the fragment only) |
| `pnpm typecheck` | pass — contracts, API, web (the two new test helpers now declare `payload?: object` and `Promise<LightMyRequestResponse>` like the other suites; without that their `inject` overloads resolved to `void & Chain` and `tsc` failed) |
| Manual browser verification | pass (below) |

## Manual browser verification

Against the already-running `pnpm dev:api` (127.0.0.1:8787) and `pnpm dev:web`
(`localhost:3000`) from this session, in a real browser:

1. **Create a share** — from the file's details, the Share dialog pinned
   *Version 1 (current)* with a 7-day expiry and no download limit. The link was
   shown once with its `#`-fragment key and the warning that the key never reaches
   the server; the per-file list showed `active · 0 downloads`.
2. **Recipient, no session** — a fresh incognito tab (no sign-in, no vault) opened
   `/s/<token>#<key>` and got metadata, expiry and **Download & decrypt**. Clicking
   it reported *Saved — check your downloads folder* and the page's own counter
   moved to **1 download**. The decrypted copy is entirely client-side, so it
   survives everything below.
3. **Revoke** — the owner's **Revoke** turned the row to `revoked`, disabled the
   button and recorded the download count.
4. **The link stops working** — reloading the recipient tab rendered *“This link
   was revoked — The owner stopped sharing this file.”* Direct checks confirm the
   enforcement is server-side, not cosmetic: `GET /api/public/shares/<token>` and
   `GET /api/public/shares/<token>/download` both answer **410
   `{"code":"SHARE_REVOKED"}`**, while the page route renders the revoked state.
5. **Version history** — the details dialog listed 1 version marked *Current* with
   **Restore** disabled, plus the standing explanation that restoring appends a new
   version and keeps every earlier one downloadable.
6. **Trash round trip** — *Move to trash* asked for confirmation naming the file;
   Trash listed it with *Expires Nov 27, 2026*, **Restore**, **Delete forever** and
   **Purge expired now**; restoring emptied Trash and returned the file (with its
   version and its revoked share) to the library.
7. **Audit trail** — `/shared` ended with six events in order: created a share
   link, share link downloaded (count 1), revoked a share link, *refused a share
   download (share_revoked)* recorded as **denied**, moved a file to Trash,
   restored a file from Trash — all owner-scoped, none containing a token or key.

## Known limitations

- **"Already-downloaded copies remain" is verified through the app, not the disk.**
  The recipient's post-revoke copy was confirmed by the download confirmation and
  the owner's counter; the file itself sits outside this workspace, so it was not
  re-opened from the filesystem after revocation.
- **Delete forever was not clicked in the browser.** It is covered by
  `trash-retention.test.ts` and `library-files.test.ts`; the pass kept the library's
  only file so the rest of the verification could run.
- **Restoring a non-current version was exercised only through the API suite** — the
  browser file has a single version, so *Restore* is legitimately disabled there.
  Restoring the *current* version is likewise only guarded by the UI: the endpoint
  accepts it and appends a duplicate version (no test covers that path).
- The share list does not live-poll: a download count changes only after the dialog
  or page refreshes (it refreshed on revoke).
- The `/s/[token]` page returns HTTP 200 with a revoked state while the data routes
  return 410; a crawler would see 200 for a dead link. Every one of the three
  responses does carry `cache-control: no-store` (the metadata route also
  `referrer-policy: no-referrer`), so nothing is cached and the fragment never
  leaks through a referrer.
- Audit UI shows the newest 20 events with no pagination, filtering or export.
- Shares have no password or recipient identity — possession of the full URL (with
  the fragment) is the credential, and the fragment must not be leaked by a chat
  client that rewrites links.
- `wrapped_key` is nullable, so rows inserted before 0013 stay unopenable and fail
  with `SHARE_KEY_UNAVAILABLE`; there is no backfill.
- Telegram was not exercised against a real account; the run used the local
  provider, and `STORAGE_PROVIDER=local` remains development-only.
- `README.md` and `docs/setup/local-development.md` still describe Milestone 4:
  neither documents sharing, the audit trail or the version-restore flow yet.

## Next milestone entry criteria (Milestone 6 — PWA and release)

1. Offline metadata: cache a read-only view of the library (files, folders, tags,
   trash) with an explicit stale/offline indicator; encrypted content stays out of
   the cache unless it is already ciphertext-at-rest.
2. PWA manifest and service worker: installable, correct icons/maskable theme,
   precached app shell, and a scoped cache strategy that never caches authenticated
   API responses across users.
3. Queued offline operations and conflict handling: a durable client queue for
   metadata mutations with a defined conflict rule against the server's
   `updatedAt`/version state, plus honest retry and failure reporting.
4. Responsive layouts and accessibility: keyboard-complete flows for upload, share
   and restore; focus order and dialogs already rely on native `<dialog>` — verify
   every new surface, not just the ones built here.
5. Tests: security, integration and end-to-end coverage, including the current
   revocation pass, two-account isolation and a signed-out 401/403 sweep.
6. A clean-deployment validation: fresh clone → install → migrate → seed → build →
   run, documented well enough that an independent developer can operate StackBase
   with their own accounts.

**Exit criterion:** an independent developer can deploy and operate StackBase with
their own accounts.
