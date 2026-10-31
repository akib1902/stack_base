# StackBase mobile milestone plan

**Status:** Mobile Milestone 2 complete · **Date:** 31 October 2026

This plan follows the instruction's rule: work in milestones, do not rewrite the web app,
do not break API contracts, and report files, features, tests, limitations, security,
outstanding issues and next entry criteria at the end of each milestone.

The architecture and decisions are in [architecture.md](architecture.md); the verified
API contract is in [api-contract.md](api-contract.md); platform access is in
[platform-capabilities.md](platform-capabilities.md).

---

## 1. Sequencing and dependencies

```text
M0 audit (complete)
   │
   ▼
M1 foundation + auth
   │
   ├───────────────► M3 crypto core + interop
   │                     │
   ▼                     ▼
M2 cloud read-only ──► M4 upload/download + queue
                             │
                             ▼
                        M5 cloud operations, previews, shares, pins
                             │
                             ├──────────────► M6 local file manager
                             │
                             ▼
                        M7 offline sync + conflicts
                             │
                             ▼
                        M8 hardening + release
```

M2 and M3 can proceed in parallel once M1 is stable. M4 needs both. M6 is independent of
M7 but shares the local index/storage infrastructure. M7 requires the API prerequisites
listed below; it must not be started with a client-only approximation that pretends to
detect conflicts it cannot see.

## 2. Milestones

### Mobile Milestone 0 — Integration audit ✅

**Status:** complete on 30 October 2026. No mobile application was scaffolded, as the
instruction requires the audit first.

**Deliverables:** verified repository/API/schema/crypto inventory; mobile ADRs and Flutter
structure; package compatibility check; Android/iOS permission matrix; milestone plan;
report with risks and blockers.

**Exit criterion:** the decisions are reviewable, every claimed API behaviour has a source
in the repository, gaps are named, and the toolchain blockers for M1 are explicit.

---

### Mobile Milestone 1 — Foundation, shell and authentication

**Goal:** a real, runnable app shell that signs in against the existing backend and never
shows a fake session.

**Scope**

- Create `apps/mobile/` with Flutter 3.47.9, the feature-first tree and exact pins.
- Android/iOS project configuration: `applicationId`/bundle id, `minSdk 24`,
  `compileSdk`/`targetSdk 36`, iOS 15 deployment target, UIScene-ready template.
- `AppConfig` from `--dart-define`; validate required values at startup with an actionable
  setup screen rather than a crash.
- Dio client, auth interceptor, single-flight refresh, error mapping, request ids.
- `supabase_flutter` GoTrue sign-in/sign-out/session restore with a
  `flutter_secure_storage` `LocalStorage`; debug-only dev-auth path.
- Per-account secure storage namespaces; sign-out clears session, vault key and account
  caches.
- App shell: bottom navigation (Home, Local, Cloud, Settings), transfer affordance,
  light/dark theme from the Amber Minimal/Graphite Terminal tokens, reduced-motion respect.
- Real loading/empty/error/offline/session-expired states for the shell.
- Unit and widget tests; `flutter analyze`; Android debug build.

**API:** existing `POST /dev/session`, `GET /me`, `PATCH /me/settings`,
`GET /setup/status`. No API change required; M1 may use build-time config. G1 is optional
but preferred for a runtime setup screen.

**Exit criteria**

1. A debug Android build runs on an emulator and signs in to a local API in `AUTH_MODE=dev`
   with a real token; the account name and settings come from `/me`.
2. Production-style Supabase sign-in is implemented and unit-tested with a fake GoTrue
   client; it is **not** claimed verified until a real project is connected.
3. Session restore after process death works; an expired/invalid token yields a clean
   sign-in, not a white screen or a retry loop.
4. Sign-out removes the token and vault key; a second account cannot see the first's data.
5. The four-tab shell renders in both themes at 320 dp width and a tablet width, with no
   overflow and no hover-only action.
6. `flutter analyze` and `flutter test` pass; the report lists what could not run (iOS,
   native crypto) honestly.

**Entry criteria:** accepted M0 decisions; Flutter 3.47.9 + Android SDK/NDK + native
build toolchain installed; a local API running; no unresolved decision about auth storage.

---

### Mobile Milestone 2 — Cloud read-only browser and metadata cache ✅

**Status:** complete on 31 October 2026 — [report](../reports/mobile-milestone-2.md).

**Goal:** browse the real StackBase namespace from the phone, with a trustworthy offline
read cache.

**Scope**

- Dart DTOs for `FileSummary`, `FolderSummary`, `TagListItem`, `LibrarySummary`,
  `StorageInsights`, `SetupStatus`, `MeResponse`; contract fixtures and enum tests.
- Cloud tab: Home bento summary, categories, recent/largest, folder navigation, file
  grid/list, search, filters (category/folder/tag/favourite), sorting, pagination.
- Tags and storage insights read views.
- Drift schema and migrations for cached files/folders/tags/summary, per account.
- Cache-first rendering with a visible freshness timestamp; pull-to-refresh; offline
  banner; stale-data state.
- Empty, partial, permission-denied and database-unavailable states with real next actions.
- Tests: DTO fixtures, repository mapping, Drift migrations/scoping, widget states.

**API:** existing read endpoints in [api-contract.md](api-contract.md#22-library-folders-tags-trash-and-search).
G1 optional; no writes yet.

**Exit criteria**

1. The app shows the same folders/files/tags/counts as the web app for a seeded account.
2. A file created on the web appears after refresh on mobile; no fabricated rows.
3. Airplane mode shows the cached library with a stale banner and no fake “live” state.
4. Pagination stops at `hasMore: false`; search is debounced; category counts come from the
   API, not from client-side guessing.
5. Tests pass; screenshots at phone/tablet widths show no overflow.

**Entry criteria:** M1 green; a seeded account with folders, files and tags; API reachable.

---

### Mobile Milestone 3 — `stackbase/1` crypto core and cross-platform interop

**Goal:** prove the mobile crypto implementation is the same format, not a lookalike.

**Scope**

- `SodiumService` using sumo APIs; secure key wrappers; zeroization; no key logging.
- Vault create/unlock/lock; Argon2id off the UI isolate; recovery verifier; 409 handling.
- File encryption/decryption: secretstream header, chunking, `MESSAGE`/`FINAL` tags,
  wrapped data key, streaming SHA-256, manifest validation, chunk arithmetic.
- Share capability re-wrap (no vault key in the link).
- Shared JSON vectors extracted from the web implementation, plus tamper/reorder/truncate/
  wrong-key/wrong-header cases.
- Node↔Flutter interop harness: web encrypts → Flutter decrypts; Flutter encrypts → web
  decrypts; vault vector unlocks to the pinned key.
- Low-RAM device check for the 64 MiB Argon2id profile and a 1 MiB chunk loop.
- Tests run on the Dart VM and Android; iOS tests are written but can only run on macOS.

**API:** `GET/POST /encryption/vault`. G5 (shared vectors) is a repository change, not an
API change.

**Exit criteria**

1. All shared vault/file vectors pass byte-for-byte in Flutter.
2. Web↔Flutter interop passes in both directions, including a multi-chunk file.
3. A flipped chunk, reordered chunk, truncated stream, wrong header, wrong vault key and
   wrong ciphertext hash all fail before any plaintext is returned.
4. Argon2id completes within a documented time on the lowest supported test device and
   does not block the UI.
5. No plaintext, passphrase or key appears in logs, Drift or temp files.

**Entry criteria:** M1 green; G5 fixture agreed; native `sodium` build works on the host
(Windows needs CMake/MSVC; Android needs NDK + make).

---

### Mobile Milestone 4 — Encrypted upload/download and durable queue

**Goal:** the real end-to-end pipeline, including a process-kill resume.

**Scope**

- Encrypt-to-staging (MADR-007), free-space preflight, manifest persistence, cleanup.
- Upload transport: create, chunk PUT with `x-chunk-checksum`, finalize, cancel, pause,
  resume, retry; exact status mapping; retry with exponential backoff and jitter.
- Queue UI: per-file phase/percent, pause/resume/retry/cancel, completed/failed states,
  "choose source again" only when staging is actually gone.
- Cold-start recovery: list jobs, match staging, `retry` (`needs_source_file`/`failed`),
  send missing chunks; never call `resume` for a swept job.
- Download/decrypt: stream to temp, hash, verify, decrypt, save/export; preview handoff.
- Integrity/error handling: 413/422/409/429/503 and network loss; no false completion.
- Android foreground service baseline with notification; iOS foreground + persisted queue.
- Tests: fake transport, real local API, kill/relaunch, checksum corruption, cancel cleanup.

**API:** existing upload routes. G2 (limits) recommended; G6 optional. No breaking changes.

**Exit criteria**

1. A multi-chunk file uploads, finalizes and appears in both the mobile and web library.
2. Kill the app mid-transfer, relaunch, and resume with the **same** ciphertext stream;
   finalize succeeds and the server hash matches.
3. If staging is deleted, the app offers cancel + restart (not a corrupted resume); the
   old placeholder is cleaned up.
4. A deliberately corrupted chunk or wrong finalize hash produces `UPLOAD_INTEGRITY_FAILED`
   and never a version.
5. Pause/resume/retry/cancel match the state machine; no chunk is sent to a closed job.
6. Download hash/decrypt round-trip matches the original; a tampered download is rejected.
7. Android test passes; iOS limitations are reproduced in the report, not hidden.

**Entry criteria:** M2 and M3 green; a real encrypted version exists in the test account;
Telegram-local provider configured for the API.

---

### Mobile Milestone 5 — Cloud operations, previews, versions, Trash and shares

**Goal:** the Cloud tab is a real file manager, not a read-only gallery.

**Scope**

- Rename, move, favourite/unfavourite, description, tags, bulk actions (move/favourite/
  trash/tag/untag), folder create/rename/move/delete.
- Trash: list, restore file/folder, permanent delete with explicit confirmation, retention
  display, purge.
- Version history and restore; current version marker.
- Previews: images, video, audio, PDF; decrypt locally; temp cleanup; unsupported-type
  fallback with Share/Open.
- Share links: create (choose version, expiry, download limit), list, revoke; copy URL
  with fragment secret; warn that anyone with the link can decrypt; never log the secret.
- Offline pins for cloud files: store ciphertext + manifest, show pin state/size, remove.
- Metadata cache invalidation after mutations; optimistic UI only where rollback is real.

**API:** existing mutations, versions, trash, shares. No new API required. G6 is optional.

**Exit criteria**

1. Rename/move/tag/trash/restore performed on mobile are visible on the web and vice versa.
2. Permanent delete requires an explicit confirmation and removes the expected rows/objects.
3. Version restore appends a new version and leaves old versions immutable.
4. A created share link opens the existing web viewer and decrypts; revoking it fails with
   the documented code; the secret never appears in a request or log.
5. Pinned files preview offline after unlocking; unpinning removes the local ciphertext.
6. Two-account isolation test passes for every new screen.

**Entry criteria:** M4 green; share/version/trash fixtures in the test account.

---

### Mobile Milestone 6 — Local file manager

**Goal:** a native-feeling, permission-honest local manager.

**Scope**

- Android: Photo Picker and permission-gated MediaStore; SAF tree selection with persisted
  grants; list/search/sort/filter/multi-select; rename/move/copy/delete; preview; share;
  storage insights; large files; duplicate candidates; cleanup recommendations.
- iOS: app Documents in Files; document picker import/export; security-scoped bookmarks
  (native module); sandbox search/sort/multi-select/rename/move/copy/delete; preview;
  share; storage insights within accessible scopes.
- Local index in Drift: metadata only, per account; incremental refresh; revoked-grant
  handling.
- Deletion UX: confirmation names the target and recoverability; MediaStore system
  trash/delete requests; no silent permanent deletion.
- Capability-aware UI: unsupported operations are absent or explain the platform limit.
- Tests: permission grant/deny/revoke, SAF tree, file operations, large-file listing,
  duplicate candidates, iOS sandbox.

**API:** none; this milestone is device-local.

**Exit criteria**

1. On Android API 36, a user can grant a SAF tree, browse it, search it, and rename/move/
   copy/delete a file with confirmations; revoking the grant degrades gracefully.
2. Photo Picker import works without broad media permission; enabling full media browse
   requests the correct permission and handles denial/partial access.
3. On iOS, the app can import a document, edit it in the sandbox, export it, and see its
   Documents folder in Files; a bookmark survives relaunch.
4. Storage insights and large-file lists are computed from real accessible data; no
   device-wide claim.
5. No `MANAGE_EXTERNAL_STORAGE`/`QUERY_ALL_PACKAGES`/install permission is present in the
   merged manifest.
6. Tests and the capability matrix in the report match observed behaviour.

**Entry criteria:** M1 and M2 stable; Android test devices/emulator; macOS for iOS; the
platform packages pinned and a native build path proven.

---

### Mobile Milestone 7 — Offline synchronization and conflicts

**Goal:** offline work that reconnects without losing or silently overwriting data.

**Scope**

- Persistent outbox for metadata mutations and uploads; ordering, idempotency keys,
  replay, coalescing, cancellation.
- Connectivity/foreground triggers; visible sync state and last-synced time.
- Pinned-file offline previews; vault-locked offline state; clear explanation.
- Conflict detection using server `updatedAt` and (once shipped) `If-Match`; a conflict
  chooser that keeps server/local/duplicate; audit-friendly outcome.
- Incremental sync cursor and tombstones (G3) for efficient refresh and hard deletes.
- Account switching/sign-out: close DB, drop keys, no cross-account cache.
- Tests: airplane mode, reconnect, concurrent edit, delete-vs-edit, duplicate account
  switch, queue replay after process death.

**API:** G3 and G4 are prerequisites. If they are not shipped, M7 is limited to a
snapshot refresh with a disclosed race; that is not the exit criterion.

**Exit criteria**

1. Create/rename/favourite/tag operations made offline replay exactly once after reconnect.
2. A concurrent server edit produces a visible conflict, not a silent overwrite.
3. A hard-deleted file disappears after sync; no ghost rows.
4. Pinned files preview offline; a locked vault shows a real unlock prompt, not a crash.
5. Two accounts on one device never see each other's cache, queue or pins.
6. Tests cover kill/relaunch during replay.

**Entry criteria:** M4 and M5 green; G3/G4 implemented and contract-tested; conflict UX
approved.

---

### Mobile Milestone 8 — Hardening and release

**Goal:** a release candidate with measured behaviour and honest documentation.

**Scope**

- Accessibility: semantics, focus order, labels, progress announcements, contrast,
  reduced motion, 48 dp/44 pt targets, large text.
- Responsive layouts: phone, tablet, foldable; no overflow at 320 dp.
- Performance: large-file streaming, memory ceilings, chunk/isolate behaviour, image
  thumbnails, cold start, list virtualization; measured, not asserted.
- Security review: token/key storage, logs, backups, screenshots, share URLs, two-account
  isolation, dependency audit, no secrets in the bundle.
- Platform hardening: Android 16 KB pages, target 36, FGS timeout, notification denial;
  iOS 27 UIScene, Keychain accessibility, background suspension.
- Integration suite on Android (and iOS on macOS); crypto interop in CI; API contract tests.
- Documentation: setup, configuration, permissions, limitations, troubleshooting, release
  checklist.
- Signed Android build and an iOS archive (requires macOS); store metadata only when the
  user asks to publish.

**API:** G1/G2 complete before a distributable beta; G3/G4 complete from M7.

**Exit criteria**

1. `flutter analyze`, unit/widget/integration suites pass on the supported matrix, with
   real permission and interruption tests.
2. A release-mode Android build installs and completes sign-in, upload, download, local
   browse and offline resume against a deployed API.
3. The iOS build is produced and checked on a real device on macOS; if that cannot happen,
   the release is explicitly blocked rather than declared green.
4. No known high-severity security issue; secrets absent from logs/bundle/backups.
5. Documentation states the exact supported Android/iOS versions, permissions, background
   limits and known gaps.

**Entry criteria:** all earlier milestones accepted; API prerequisites deployed to the
target environment; a release signing setup and a macOS build host available.

## 3. API prerequisites by milestone

| Milestone | Required | Recommended |
|---|---|---|
| M1 | Existing dev session, `/me`, `/setup/status` | G1 client config |
| M2 | Existing read endpoints | G1, G2 |
| M3 | Vault endpoints | G5 shared vectors |
| M4 | Upload/version endpoints | G2 limits, G6 restart |
| M5 | Mutations, trash, versions, shares | — |
| M6 | None | — |
| M7 | **G3 incremental sync, G4 optimistic concurrency** | — |
| M8 | G1/G2 for runtime configuration | G7 range downloads |

All API additions are additive and documented first in
[api-contract.md](api-contract.md). No migration is expected for G1/G2/G4; G3 may add an
index/cursor column and will be reviewed separately.

## 4. Definition of done for every milestone

Each milestone ends with a report containing:

- Files created or modified (with links).
- Features implemented, and any deliberately not implemented.
- Tests executed and their actual results; checks that could not run and why.
- Platform limitations observed (Android/iOS, permissions, background).
- Security considerations and any new threat surface.
- Outstanding issues, with severity and owner.
- Next milestone entry criteria and any newly discovered blockers.

A milestone is not done because code compiles. It is done when its exit criteria are
demonstrated, the web/API regression suites still pass, and no UI claims a capability that
was not verified.

## 5. Out of scope for this plan

- Flutter web or desktop clients.
- A second backend, direct database access, or direct Telegram MTProto from the device.
- Full-device file access, installed-app enumeration, APK installation, or system cleanup
  automation.
- Passphrase rotation/recovery changes to `stackbase/1` (the existing vault model is used).
- In-app consumption of public share links; the existing web viewer remains the recipient
  experience for the first release.
- Push notifications, semantic/text search, billing or multi-tenant administration.
- App-store publication; the release milestone produces signed artifacts and the checklist,
  and publishing requires separate authorisation.

## 6. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| No Flutter/Dart/NDK/CMake/make; no iOS toolchain on this Windows host | M1 cannot build or test until installed | Treat as the first M1 task; verify `flutter doctor`, `sodium` hooks, Android build and iOS on macOS before writing feature code. |
| `sodium` 4 build hooks on Windows need Git Bash + make; Android needs NDK | Crypto milestone blocked | Install and prove the toolchain with a tiny vector test before M3. |
| API resume defect (I1) | Web claim is wrong; mobile must not copy it | Mobile stages ciphertext (MADR-007); report the web defect; fix web separately. |
| No Supabase project | Production sign-in unverified | M1 tests with fake GoTrue; production verification is an external entry criterion. |
| No client-config endpoint | One binary cannot point at arbitrary servers | Build-time config for M1; implement G1 before beta. |
| No sync/concurrency endpoints | M7 cannot meet conflict requirement | Implement G3/G4 before M7; do not fake conflict detection. |
| Android background limits | Large uploads may pause after 6 h | Durable queue + visible resume; document. |
| iOS background suspension | Uploads stop when backgrounded | Persist queue; foreground resume; no false claims. |
| Local file access narrower than “Files by Google” | User expectation mismatch | Capability-aware copy and matrix; SAF/MediaStore/bookmarks only. |
| 16 KB page size / native libs | Android 15+ install/load failure | Build aligned libs; test on a 16 KB emulator. |
| `material_ui` transition in Flutter 3.47+ | Future migration churn | Stay on core Material for M1–M7; schedule migration at M8. |
| Device compromise / logs | Key or metadata leakage | Secure storage, redaction, no plaintext caches, threat-model review in M8. |

## 7. Status log

| Milestone | Status | Evidence |
|---|---|---|
| M0 — integration audit | **Complete** | [Mobile Milestone 0 report](../reports/mobile-milestone-0.md) |
| M1 — foundation/auth | **Complete** | [Mobile Milestone 1 report](../reports/mobile-milestone-1.md) |
| M2 — cloud read-only | **Complete** | [Mobile Milestone 2 report](../reports/mobile-milestone-2.md) |
| M3 — crypto core | Not started | Depends on M1 and native build |
| M4 — upload/download | Not started | Depends on M2 + M3 |
| M5 — cloud operations | Not started | Depends on M4 |
| M6 — local files | Not started | Depends on M1/M2 |
| M7 — offline sync | Not started | Depends on G3/G4 |
| M8 — release hardening | Not started | Depends on all |
