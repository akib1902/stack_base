# Mobile Milestone 2 — cloud read-only browser and metadata cache

**Status:** implementation and automated verification complete; on-device and iOS
verification remain pending, as listed in §6. **Date:** 31 October 2026.

**Scope:** the Flutter client in `apps/mobile/`. The web app, Fastify API,
PostgreSQL schema, Supabase Auth integration, Telegram adapter and `stackbase/1`
format were not changed. No API endpoint and no database migration was added.

**Design references:** [mobile architecture](../mobile/architecture.md),
[API contract](../mobile/api-contract.md), and the
[milestone plan](../mobile/milestone-plan.md). The M1 report is
[mobile-milestone-1.md](mobile-milestone-1.md).

---

## 1. Summary

The Cloud tab is now a real browser for the shared StackBase namespace instead of a
labelled placeholder:

- It reads the existing endpoints `GET /library/summary`, `GET /folders`, `GET /tags`,
  `GET /files` and `GET /insights` with the M1 authenticated client.
- A refresh pages through `/files` and writes one atomic per-account snapshot to a
  Drift/SQLite database. The UI renders that snapshot immediately on later launches,
  before any network call.
- Search, category, favourite, tag, sort, pagination, folder navigation, grid/list
  switching and the read-only details/insights sheets all run on real server data.
  Nothing is fabricated when the library is empty.
- Every screen states whether it is live or a saved copy, with its sync age. A failed
  refresh keeps the saved copy and explains the failure; it never presents stale data
  as live.
- The cache is one SQLite file per account under application support. The file is
  closed when the account changes, so two accounts cannot read each other's rows.

No encryption, upload, download, share, version or Trash operation was added; the
Cloud tab is deliberately read-only in this milestone and says so.

## 2. Files created or modified

| Area | Files | Change |
|---|---|---|
| DTOs | `lib/core/models/library.dart` plus generated Freezed/json files | `FileSummary`, `FileListResponse`, `FolderSummary`, `TagListItem`, `LibrarySummaryResponse`, `CategorySummary`, `StorageInsightsResponse` and related types matching `packages/contracts`. |
| API client | `lib/core/api/api_client.dart` | `fetchLibrarySummary`, `fetchFolders`, `fetchTags`, `fetchFiles` (typed query parameters, limit/offset), `fetchInsights`. |
| Cache | `lib/core/database/app_database.dart` plus generated Drift file | Per-account SQLite database: cached files, folders, tags, summary and sync metadata; schema version 1. |
| Repository | `lib/features/cloud_files/data/cloud_library_repository.dart` | Complete paged snapshot on refresh, atomic replace, cache read/clear, row↔DTO mapping, corruption handling. |
| State | `lib/features/cloud_files/domain/cloud_query.dart`, `lib/features/cloud_files/presentation/cloud_controller.dart` | `CloudQuery`, pure filter/sort/folder helpers, cache-first controller, pagination, filters, view mode, insights provider. |
| UI | `lib/features/cloud_files/presentation/cloud_screen.dart`, `widgets/cloud_summary.dart`, `widgets/file_views.dart`, `widgets/cloud_sheets.dart` | Cloud tab, freshness/state banners, filters, breadcrumb, summary and recent cards, grid/list files, details and insights sheets. |
| Shared UI | `lib/core/ui/formatters.dart` | `formatRelativeTime` for honest freshness labels. |
| Dependencies | `pubspec.yaml`, `pubspec.lock` | `drift 2.35.3`, `sqlite3 3.8.0`, `path 1.9.1`, `path_provider 2.1.6`, `drift_dev 2.35.2`. No `drift_flutter` (its EOL shims are avoided, per MADR-003). |
| Tests | `test/library/**`, `test/cloud/cloud_screen_test.dart`, `test/support/library_fixtures.dart`, `test/app/app_test.dart`, `test/integration/live_api_test.dart` | 25 new tests, app-shell expectations updated, live suite extended. |
| Docs | this report, `README.md`, `docs/mobile/milestone-plan.md` | Status and evidence. |

`apps/mobile/integration_test/auth_flow_test.dart` also received two analyzer-only
fixes (a doc-comment angle bracket and an unnecessary string escape) so
`flutter analyze` stays at zero issues.

## 3. Features implemented

### Reading and caching

- `GET /files` is paged with `limit=100` until `hasMore` is false. At most 20 pages
  (2,000 files) are cached per sync; if the server still reports more, the snapshot is
  marked **truncated** and the freshness bar says `first N files cached`. It never
  implies the cache is the whole library.
- Folders, tags, summary and files are written in one transaction. A failure before
  the write leaves the previous snapshot untouched.
- The cache stores metadata only: names, sizes, categories, folder references, tags,
  status, timestamps and the summary payload. No content, key, passphrase or token is
  written to Drift.
- A cache payload that no longer parses (unknown enum wire value, malformed JSON) is
  discarded and rebuilt, rather than rendered as truth.
- Freshness comes from the snapshot's own `syncedAt`; pull-to-refresh rebuilds it.

### Cloud tab

- Library card with real server totals (files, folders, bytes, tags), non-zero
  category buckets and the five most recently updated files.
- Folder chips for direct children, a scrollable breadcrumb path, and folder-scoped
  file lists. Search, category, favourite and tag filters combine; the predicate is
  the same one used by the tests.
- Sort menu (last updated, newest, name A–Z/Z–A, largest/smallest), grid/list toggle,
  and 50-file pages with a "Load more (N remaining)" action that stops at the filtered
  total.
- Search is debounced by 300 ms and matches file name, description and tag names.
- File details sheet: size, MIME type, folder, created/updated, description, tags and
  the encrypted-version status. It explicitly states that preview/download arrive with
  the cryptography and transfer milestones and that this build never decrypts content.
- Storage insights sheet: totals, trash/version bytes, per-category usage, largest
  files and folders, and duplicate candidates by plaintext fingerprint. It is fetched
  when opened and is not part of the cached snapshot.
- States: loading, never-synced failure (retry), cached-with-error, empty library, no
  filter matches, empty folder, empty list, and truncated cache. Each has a real next
  action.

### Presentation

- Amber Minimal and Graphite Terminal both use the existing tokens; no new colours
  were invented.
- 320 dp, phone and tablet widths are tested. The layout uses wrapping and horizontal
  scrolling rather than hover-only or fixed-width controls.
- The shell's existing offline banner remains the platform-connectivity signal; the
  Cloud tab adds sync-specific truth (saved copy + timestamp) instead of duplicating
  or contradicting it.

## 4. Tests executed and results

All commands were run from `apps/mobile` with Flutter 3.47.9 / Dart 3.13.7.

| Check | Command | Result |
|---|---|---|
| Static analysis | `flutter analyze` | **No issues found** |
| Full unit/widget suite | `flutter test` | **71 passed, 5 skipped** (the 5 are the opt-in live/device suites) |
| Live API contract | `flutter test test/integration/live_api_test.dart --dart-define=LIVE_API_BASE_URL=http://127.0.0.1:8787` | **5 passed** against the real Fastify API |
| Android debug build | `flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:8787 --dart-define=AUTH_MODE=dev` | **Built** `app-debug.apk` (257,555,892 bytes) |
| SQLite packaging | `unzip -l app-debug.apk` | `libsqlite3.so` present for `arm64-v8a`, `armeabi-v7a`, `x86_64` |
| Manifest | `aapt2 dump badging` | package `app.stackbase.mobile`, target/compile 36, `INTERNET` + `ACCESS_NETWORK_STATE` + the signature-level AndroidX receiver permission; no storage/media permission |

The live suite seeds one folder and one tag for a fresh development identity, then
verifies through the mobile client that `/library/summary` reports them, `/folders` and
`/tags` return them, `/files` honours `limit=10`, and `/insights` agrees with the
summary totals. It also repeats the M1 checks (`/me`, `/setup/status`, settings patch,
anonymous 401).

New normal-suite coverage:

- contract-shaped DTO parsing for files, folders, tags, summary and insights, including
  nullable folder/description/category and all nine categories;
- unknown category values fail parsing instead of inventing a bucket;
- filter/search/sort semantics, folder child selection, cycle-safe breadcrumb paths and
  byte totals;
- repository paging (two pages, offsets 0 and 1), atomic persistence, UTC-normalised
  timestamps, failed-refresh retention, per-account database isolation and `clear()`;
- Cloud tab widget states: saved copy after a failed refresh, empty library, grid/list
  switch, folder navigation, 300 ms search debounce with filter clearing, and no
  overflow at 320 dp;
- the four-tab shell still renders the Cloud tab with real data at phone and 320 dp
  widths and Settings still reachable.

## 5. Cache and data model

```text
API (snapshot)                        Device
/folders  /tags  /summary  /files …   ← one transaction → account-<uuid>/library.sqlite
                                       cached_files / cached_folders / cached_tags
                                       cached_summaries (payload + syncedAt + truncated)
```

- One database file per account, created under application support; it is closed when
  the provider is disposed on account change.
- Drift returns local-time `DateTime`s for native SQLite, so the repository converts
  every persisted timestamp back to UTC before constructing a DTO. Tests assert this.
- No incremental cursor exists yet (gap G3), so a refresh is a full snapshot. The UI
  labels its age; it does not pretend to be real-time.

## 6. What could not be verified

| Item | Status | Why / next action |
|---|---|---|
| Android emulator/device run | **Pending** | No emulator image is installed on this Windows host (same limitation as M1). The APK builds with the native SQLite libraries; install and exercise the Cloud tab on a device. |
| iOS build and run | **Not run** | Requires macOS/Xcode 27. The Dart code and Drift schema are platform-independent. |
| Real Supabase project | **Not verified** | M1 status unchanged; the API path is identical once a real token is issued. |
| A file row created by the web app | **Not verified** | Creating a file requires an encrypted version through the upload pipeline (M4). The live suite verifies folders/tags/summary/insights against real rows; file-list mapping is covered by contract fixtures and repository tests. |
| Library larger than 2,000 files | **Not exercised** | The truncation path is unit-covered by design but no fixture exceeds the page cap. |
| On-device Keystore/Keychain | **Not exercised** | Unchanged from M1; session storage already uses the platform keystore. |
| Background refresh / sync | **Out of scope** | M2 refreshes on launch, pull-to-refresh and retry. Persisted sync scheduling is M7. |

## 7. Security considerations

- **No new secrets.** The cache contains metadata only. No file content, plaintext,
  vault key, passphrase, Supabase service key, Telegram hash or session string is
  stored or logged.
- **Account isolation by construction.** Each account has its own SQLite file; the
  provider closes it when the session changes. A repository test proves a second
  database stays empty after the first account syncs.
- **Read-only surface.** No mutation endpoint is called from the Cloud tab in this
  milestone, so there is no optimistic UI that could claim an unverified write.
- **No fabricated statistics.** Every count and byte total is a server aggregate or a
  sum over the synced snapshot; the truncation flag prevents overstating coverage.
- **Corruption fails closed.** Unparseable cached payloads are deleted and rebuilt.
- **Manifest unchanged in substance.** `path_provider`/AndroidX contribute the
  signature-level `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`; no dangerous permission
  was added.

## 8. Outstanding issues

1. Install the debug APK on a device/emulator and repeat: sign in, open Cloud, pull to
   refresh, enable airplane mode, relaunch, confirm the saved copy and timestamp,
   sign out and confirm the second account starts with an empty cache.
2. Verify a real Supabase token against the same read endpoints.
3. Run the repository paging path against a library with more than 100 files (the
   live suite's fresh identity only exercises the empty/small path).
4. Decide whether view mode and sort should persist to the account settings; today
   they are session-local and no settings write is made from this screen.
5. The server has no incremental sync or tombstones (G3); M2 uses full snapshots and
   discloses freshness. M7 still requires G3/G4.
6. A very large library will hit the 2,000-file cache cap; the UI labels it, but a
   future cursor-based sync should remove the cap.

## 9. Next milestone entry criteria

Mobile Milestone 3 (`stackbase/1` crypto core and interop) can begin once:

- the M2 exit path is accepted with device verification tracked;
- the shared vector fixture (G5) is extracted from the web TypeScript vectors into a
  language-neutral JSON file that both test suites read;
- the native `sodium` build is proven on Windows and Android, per the M0 risk table;
- the low-RAM Argon2id profile is available for a documented timing check.

The web app and API remain unchanged by this milestone.
