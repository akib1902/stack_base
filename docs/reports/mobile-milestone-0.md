# Mobile Milestone 0 — integration audit report

**Status:** complete · **Date:** 30 October 2026  
**Scope:** audit only. No Flutter application was scaffolded, as required by the
instruction's "do not immediately build the entire mobile application" rule.

**Decision documents**

- [Mobile architecture and MADR-001…012](../mobile/architecture.md)
- [Verified mobile API contract and gaps](../mobile/api-contract.md)
- [Android/iOS capabilities and permissions](../mobile/platform-capabilities.md)
- [Mobile milestone plan](../mobile/milestone-plan.md)

---

## 1. Summary

The existing StackBase implementation is a viable backend for a Flutter client. The API
already provides the full metadata namespace, owner-scoped authorisation, chunked
encrypted uploads, immutable versions, Trash, share links, storage insights and the
`stackbase/1` vault/file format. No second backend, database or Telegram integration is
needed.

The audit found **one high-severity defect** in the existing web resume path: after a
refresh, the web client starts a new encryption stream but reuses the old server job, so a
job with any previously received chunk fails finalisation with
`UPLOAD_INTEGRITY_FAILED`. I reproduced this against the real Fastify API with a temporary
probe. The mobile design avoids the defect by staging ciphertext on the device; the web
claim still needs a correction or a client fix.

The audit also found that the mobile implementation **cannot start building on this host
yet**: Flutter/Dart are absent, the Android SDK has no NDK, and `make`, CMake, MSVC and the
iOS/Xcode toolchain are missing. Those are execution blockers for Milestone 1, not
architecture blockers.

Three API additions are needed before later mobile milestones: a public client-config
endpoint, an incremental sync cursor, and optimistic concurrency for metadata edits. The
first is required for a one-binary self-hosted beta; the other two are required for the
offline/conflict milestone. All are additive and do not require a schema migration for the
first release.

## 2. Files created or modified

| File | Change | Why |
|---|---|---|
| [docs/mobile/architecture.md](../mobile/architecture.md) | new | Mobile architecture decision record (MADR-001…012), system boundary, Flutter folder structure, package baseline, data flows, testing and security model. |
| [docs/mobile/api-contract.md](../mobile/api-contract.md) | new | Verified 51-route inventory, auth/error semantics, upload/download/crypto contract, mobile gaps G1–G8, incompatibilities I1–I6, contract test plan. |
| [docs/mobile/platform-capabilities.md](../mobile/platform-capabilities.md) | new | Android/iOS permissions, storage access, file-operation matrix, background limits and explicit non-claims. |
| [docs/mobile/milestone-plan.md](../mobile/milestone-plan.md) | new | M1–M8 scope, dependencies, API prerequisites, exit criteria and definition of done. |
| [docs/reports/mobile-milestone-0.md](mobile-milestone-0.md) | new | This report. |
| [README.md](../../README.md) | modified | Added the mobile track, audit status and links; no claim that the app exists. |
| [docs/setup/local-development.md](../setup/local-development.md) | modified | Corrected the documented `MAX_UPLOAD_BYTES` default from 16 GiB to the code's 2 GiB (maximum remains 16 GiB). |
| [apps/api/.env.example](../../apps/api/.env.example) | modified | Clarified the default and maximum upload size. |

No production API, web or database code was changed. A temporary
`apps/api/test/resume-probe.test.ts` was created to reproduce I1, run, and removed; it is
not in the tree.

## 3. What was inspected

| Area | Evidence read |
|---|---|
| Repository layout | `apps/api`, `apps/web`, `packages/contracts`, `supabase/migrations`, `docs` |
| Requirements | `SRS & FDD.md` (scope, A8–A11, C2, C9–C11), `docs/architecture/decisions.md`, `docs/architecture/encryption-format.md` |
| API routes | Every `apps/api/src/modules/**` route registration; 51 routes counted; `app.ts` composition, auth hook, error handler, CORS, rate limits and content-type parser |
| Database | Migrations 0001–0013: profiles/settings, storage connections, folders/files, versions, tags, upload jobs/chunks, shares/audit, indexes, RLS/grants, checks, vaults, share keys |
| Contracts | `packages/contracts/src/{auth,common,encryption,errors,insights,library,lifecycle,setup,shares,storage,uploads}.ts` |
| Cryptography | `apps/web/src/lib/crypto/*`, pinned vectors, web crypto tests, `libsodium-wrappers-sumo 0.8.4` |
| Upload pipeline | `apps/api/src/modules/uploads/repository.ts`, `apps/web/src/features/uploads/{pipeline,transport,upload-context}.tsx`, upload tests |
| Auth | `apps/api/src/security/token.ts`, `apps/api/src/config/env.ts`, dev-auth route, web session/client/proxy code |
| Toolchain | `flutter --version`, `dart --version`, `java -version`, `ANDROID_HOME`, SDK platforms/build-tools/NDK, `make`, `cmake`, `cl`, `ninja`, `adb` |
| Package compatibility | pub.dev package metadata and archives, Flutter stable release JSON, verified on 30 Oct 2026 |

## 4. Reusable implementation

The mobile client should reuse these, not reimplement them:

| Capability | Existing implementation | Mobile use |
|---|---|---|
| Identity/authorisation | `app.authenticate` verifies the bearer token, rejects non-`authenticated` roles, validates UUID subjects, checks the account still exists, and derives the owner from `sub`. | Send the Supabase/dev bearer token; never send a user id. |
| Ownership | SQL owner filters plus composite `(user_id, …)` foreign keys and RLS. | Trust server responses; local cache is scoped per account. |
| Metadata | `/files`, `/folders`, `/tags`, `/search`, `/summary`, `/insights`, `/trash`, `/audit`. | Cloud browser, Home, local cache, insights. |
| Upload state machine | `POST /uploads` → chunks → finalize; pause/resume/retry/cancel; stale sweep; immutable version only after hash verification. | Exact same job lifecycle; stage ciphertext locally so retry is exact. |
| Encryption | `stackbase/1`: Argon2id vault, XSalsa20-Poly1305 wrapping, XChaCha20-Poly1305 secretstream, SHA-256 manifest. | Reimplement byte-for-byte in Dart with `sodium` sumo; no new format. |
| Download | Authenticated ciphertext stream with format/hash headers; client-side decrypt. | Stream, hash, decrypt, preview/export. |
| Versions/Trash | Immutable version history, restore-by-append, soft delete, retention purge, permanent delete. | Cloud actions with confirmations. |
| Shares | One-time token, fragment-wrapped data key, expiry/download limit/revocation. | Create/list/revoke; build the existing web URL. |
| Tests/vectors | Crypto vectors, file-format tests, upload/security/RLS suites. | Shared JSON vectors and contract fixtures for Flutter. |

The web **transport** (httpOnly cookie + Next route handlers) is not reusable; mobile uses
bearer tokens directly, which is the correct native model.

## 5. Verified authentication and database behaviour

- **Token verification:** issuer/audience/algorithms are pinned; `service_role` is
  rejected; a signed token for an identity absent from `auth.users` returns
  `401 AUTH_REQUIRED` (this was fixed in the previous milestone). The dev-session route is
  not registered when `AUTH_MODE=supabase` or `NODE_ENV=production`.
- **Database:** 13 migrations apply from empty; RLS is enabled everywhere; user-facing
  tables use `auth.uid() = user_id`; internal tables have no client grants; lifecycle
  triggers enforce immutable versions, current-version ownership and folder cycles.
- **No mobile schema is required** for M1–M6. Mobile-local tables live in Drift; the
  server remains the source of truth.
- **Production auth gap:** the web app still has no Supabase sign-in screen. Mobile can
  talk to Supabase Auth directly, but a real Supabase project is required to verify that
  path. Until then, only the dev-auth flow is end-to-end testable.

## 6. Mobile-specific API gaps

Detail and proposed contracts are in
[api-contract.md §6](../mobile/api-contract.md#6-gaps-what-mobile-needs-that-the-api-does-not-expose-yet).

| Gap | Why mobile needs it | Required by |
|---|---|---|
| **G1** Public `GET /api/v1/client-config` (Supabase URL/publishable key, limits, web origin) | A self-hosted app cannot know the deployment's public auth config; a store binary cannot be rebuilt per server. | Distributable beta (M8); optional in M1 |
| **G2** Upload/active limits in config | Preflight free space and cap the queue without hard-coding the server's 2 GiB/4-job defaults. | M4 recommendation |
| **G3** Incremental sync with cursor/tombstones | Efficient offline refresh and hard-delete detection; a full snapshot cannot see purged rows. | M7 |
| **G4** `If-Match`/`expectedUpdatedAt` + `409 CONFLICT` | Real conflict detection; current PATCH is last-write-wins. | M7 |
| **G5** Language-neutral crypto vectors | Flutter cannot import the TypeScript vectors; hand copies are not interop proof. | M3 |
| **G6** Optional explicit upload restart | Atomic restart when local staging is lost; cancel + new upload already works. | M4 polish |
| **G7** Optional Range downloads | Resume a large download; current stream restarts. | Later |
| **G8** Optional generated Dart DTOs | Reduce contract drift; hand-written DTOs + fixtures suffice for now. | Later |

No gap requires changing an existing response shape or error code. G4 adds a new code
rather than overloading `UPLOAD_STATE_CONFLICT`.

## 7. Incompatibilities and defects

### I1 — Cold-start upload resume mixes two streams

**Severity: high for the web app. Mobile avoids it by design.**

The web pipeline calls `startEncryption` on every `runUpload`
(`apps/web/src/features/uploads/pipeline.ts:95`), generating a new data key and 24-byte
stream header. On a replayed idempotency key, the API's `respondWithExisting`
(`apps/api/src/modules/uploads/repository.ts:319`) compares only plaintext size, chunk
size/count and fingerprint; it neither compares `streamHeader`/`wrappedKey` nor resets
staging. It returns the old `receivedChunkNumbers`, and the web pipeline skips them
(`pipeline.ts:133-151`). The resulting staged file is a mix of two secretstreams.

**Reproduction:** a temporary Vitest probe against the real Fastify/PGlite app:

1. 200,000-byte source, 64 KiB chunks (4 chunks).
2. Create with idempotency key `probe-…`, header A; send chunk 0.
3. Replay create with the same key and header B (new nonce/wrapped key, same sizes):
   **200** with `receivedChunkNumbers: [0]`.
4. Send chunks 1–3 under stream B.
5. Finalize with B's ciphertext hash: **422 `UPLOAD_INTEGRITY_FAILED`** — “The assembled
   ciphertext does not match the hash declared by the client.”

**Consequences**

- The web's “refresh and resume” works only when **zero** chunks arrived before the
  refresh. The Milestone 4 manual test saw `0 of 1 chunks already stored`; that is the
  happy path, not the general case.
- After the 2-minute stale sweep, the job becomes `needs_source_file`; the web reselect
  path calls `resume` (`upload-context.tsx:485`), which accepts only `paused`, so it also
  fails to reopen the job.
- The Milestone 4 report's interrupted-upload claim should be corrected, or the web client
  fixed, before it is presented as working.

**Mobile mitigation:** encrypt the complete stream to app-private staging, then upload
the stored bytes. After process death, `retry` reopens a swept job and only missing chunks
are sent (MADR-007). If staging is lost, cancel and start a new upload. The defect is not
inherited.

**Recommended web fix (not done in this audit):** persist the exact ciphertext stream
(IndexedDB/OPFS) and continue it, or make the API reset the job/staging when a replayed key
carries a different manifest and require the client to resend from chunk 0. Either change
needs its own milestone and tests.

### I2 — SRS A10 is stale relative to the code

The SRS lists `POST /files`, `POST /files/:id/tags`, `POST /trash/:id/restore` and
`DELETE /trash/:id/permanent`; the implementation has `PUT /files/:id/tags`,
`/trash/files/:id/...`, `/trash/folders/:id/...` and additional summary/insights/audit/
uploads/vault routes. Mobile follows the actual route table. A documentation pass should
update A10; implementing the stale list would be wrong.

### I3 — Documented upload default differed from the code

`docs/setup/local-development.md` said `MAX_UPLOAD_BYTES` defaults to 16 GiB, while
`apps/api/src/config/env.ts:233-235` defaults to 2 GiB (16 GiB maximum). This audit
corrected the setup table and the `.env.example` comment. Mobile must treat the limit as
server-configured, not hard-coded; G1/G2 expose it.

### I4 — Production web sign-in is still missing

`POST /api/v1/dev/session` is not registered in Supabase mode or production. The web
sign-in screen still posts only there, so the product's production sign-in is incomplete.
Mobile talks to Supabase Auth directly and does not need a new API route, but it cannot be
end-to-end verified without a Supabase project. This remains a release blocker outside the
mobile codebase.

### I5 — No public client-config endpoint

See G1. Until it exists, the app is build-time configured. This is acceptable for M1 but
not for a one-binary self-hosted distribution.

### I6 — Semantics worth encoding in the Dart client

- `favorite=false` means “no filter”, not “not favourite”.
- `GET /trash` purges expired items as a side effect.
- `POST /folders` and `POST /tags` return 201.
- `PATCH /tags/:id` returns a mutation envelope, not the tag.
- `UploadJob` does not include its manifest; the mobile client must persist it with the
  staging file.
- Rate limits are per client key/IP; carrier NAT can share them.

## 8. Architecture decisions

The full records are in [architecture.md §4](../mobile/architecture.md#4-architecture-decisions).
In brief:

| ID | Decision |
|---|---|
| MADR-001 | First-party Flutter client of the existing API; no second backend/DB/Telegram. |
| MADR-002 | Flutter 3.47.9 / Dart 3.13.7; Android 24–36, target 36; iOS 15–27; Xcode 27. |
| MADR-003 | Feature-first; Riverpod 3.4.3, GoRouter 18.1.2, Dio 5.11.1, Drift 2.35.3 + sqlite3 3.8.0, Freezed 4.0.3. |
| MADR-004 | Supabase GoTrue auth via `supabase_flutter`, secure-storage `LocalStorage`, single-flight refresh; dev auth only in debug. |
| MADR-005 | Build-time dart-defines first; public `client-config` endpoint before beta; HTTPS production. |
| MADR-006 | `stackbase/1` with `sodium` sumo; SHA-256 via `crypto` (sodium lacks `crypto_hash_sha256`); no new format. |
| MADR-007 | Encrypt-to-app-private-staging, then chunk-upload; exact cold-start resume; cancel+restart if staging is lost. |
| MADR-008 | Android MediaStore/Photo Picker + SAF; iOS sandbox + document picker/bookmarks; no all-files access. |
| MADR-009 | Per-account Drift cache, ciphertext pins, outbox, explicit conflict UI; no plaintext in shared storage. |
| MADR-010 | Android `dataSync` foreground service; iOS foreground + short grace; no false background promises. |
| MADR-011 | Amber Minimal/Graphite Terminal tokens, Inter, bottom nav/rail, reduced motion, 48 dp/44 pt targets. |
| MADR-012 | Additive API evolution, contract tests, new `CONFLICT` code; no breaking changes. |

## 9. Flutter structure and package baseline

The proposed tree is in [architecture.md §5](../mobile/architecture.md#5-flutter-folder-structure);
the exact package table is in
[architecture.md §6](../mobile/architecture.md#6-package-baseline).

Key verified facts:

- Flutter stable is **3.47.9** (Dart **3.13.7**, released 29 Oct 2026); Android support is
  API 24–37 (CI 24–36); iOS support is 15–27.
- `go_router 18.1.2` requires Flutter 3.44 and `pdfrx 2.11.0` requires 3.47, so the
  baseline cannot be lowered without replacing them.
- `sqlite3_flutter_libs` is **end-of-life** (`0.6.0+eol`); `drift_flutter 0.3.1` still
  depends on it. Use `drift` + `sqlite3 3.8.0` native assets directly.
- `flutter_sodium` is incompatible (Dart <3.0); `sodium_libs` is deprecated. `sodium 4.1.2+1`
  uses Dart build hooks and needs a native toolchain.
- `shared_storage 0.8.1` is incompatible (Dart <3.0). Android SAF is covered by
  `saf_util 3.1.1` + `saf_stream 4.0.3`; iOS bookmarks need a thin native module.
- `http_mock_adapter` is stale (2023); tests should use a fake `HttpClientAdapter`.
- Core Material is retained for M1–M7; the standalone `material_ui`/`cupertino_ui` 1.0
  migration is a release-hardening item.

## 10. Android/iOS permissions summary

Full matrix and rationale: [platform-capabilities.md](../mobile/platform-capabilities.md).

**Android**

- No permission for app-specific storage; Photo Picker for user-selected media; SAF for
  arbitrary documents; no `MANAGE_EXTERNAL_STORAGE`.
- `READ_MEDIA_IMAGES/VIDEO/AUDIO` (API 33+) only if full media browsing is enabled and the
  user grants it; Play policy restricts these, so Photo Picker is the default.
- `POST_NOTIFICATIONS` (API 33+) for transfer notifications; denial must not block the
  transfer, only hide its notification.
- `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_DATA_SYNC` for transfers; Android 15 limits
  `dataSync` to 6 hours in 24.
- No `QUERY_ALL_PACKAGES`, `REQUEST_INSTALL_PACKAGES`, `READ_LOGS` or `USAGE_STATS`.
- Build 16 KB-aligned native libraries; target API 36.

**iOS**

- App sandbox only; Documents exposed via `UIFileSharingEnabled` +
  `LSSupportsOpeningDocumentsInPlace`; external files via `UIDocumentPickerViewController`
  and, if implemented, security-scoped bookmarks.
- PHPicker by default; `NSPhotoLibraryUsageDescription` only for full-library browse,
  `NSPhotoLibraryAddUsageDescription` only for saving.
- No guaranteed background upload; short `beginBackgroundTask` grace, persisted queue,
  foreground resume. `BGTaskScheduler` is best-effort maintenance only.
- iOS 27 requires the UIScene lifecycle; build with Xcode 27 on macOS.
- Keychain session storage should be device-only and not iCloud-synced.

## 11. Tests and checks executed

| Check | Result |
|---|---|
| Repository status before changes | Clean except the untracked `stackbase mobile/` instruction folder. No unrelated modifications. |
| Route inventory | 51 routes counted from `apps/api/src/**`; 47 authenticated (matches the security sweep), 2 public share routes, `/health`, dev-only session. |
| Migration inventory | 13 migrations; no mobile-specific server table required. |
| Flutter/Dart toolchain | `flutter`/`dart`: **command not found**. No mobile build or test was run. |
| Android toolchain | `ANDROID_HOME=C:\Android`; platforms `android-36`; build-tools `36.0.0`; `adb` present; **no NDK**; `make`, `cmake`, `cl`, `ninja` absent. |
| JDK | `java 26`; compatibility with the Android Gradle plugin must be verified before M1. |
| Package compatibility | pub.dev metadata/archives checked for Flutter, Riverpod, GoRouter, Dio, Drift, Freezed, sodium, Supabase, SAF, notifications, media and test packages; constraints recorded in the architecture table. |
| Flutter stable version | `releases_windows.json`: 3.47.9 stable, Dart 3.13.7, released 2026-10-29. |
| I1 reproduction | Temporary Vitest probe against real Fastify/PGlite: replay 200 with `received[0]`; chunks 1–3 accepted; finalize **422 `UPLOAD_INTEGRITY_FAILED`**. Probe removed. |
| Docs links/whitespace | Checked after writing; no broken relative link or trailing-whitespace error reported. |
| Full API/web suites | **Not run in this audit**; no production code changed. The existing suites remain the regression net for M1+. |

The I1 probe is evidence, not a committed regression test. A proper regression test belongs
with the web fix and should assert that a manifest change is either rejected or resets the
job; the current suite does not catch it because its fake transport accepts any manifest.

## 12. Platform limitations

- **iOS cannot be built or tested on this Windows host.** Xcode 27 and macOS are required.
  Any iOS claim in later reports must name the macOS run; otherwise it is a limitation.
- **Native crypto and SQLite builds are blocked** until CMake/MSVC (Windows) and NDK/make
  (Android) are installed. `sodium 4` builds libsodium from source via Dart build hooks;
  `sqlite3 3.x` also uses native assets.
- **Android background transfers are bounded** by the `dataSync` 6-hour/24-hour limit and
  Doze; **iOS has no guaranteed background upload**. The app will show interruption and
  resume, not pretend.
- **Local file access is scoped**: MediaStore/Photo Picker/SAF on Android; sandbox +
  document picker/security-scoped bookmarks on iOS. It is not Files-by-Google parity.
- **Permissions are review-sensitive**: broad media permissions are Play-policy restricted;
  the app defaults to system pickers and explains any broader request.
- **No real Supabase project** is connected; production auth and two-account RLS
  verification against Supabase remain external.

## 13. Security considerations

- The audit introduced no production code or credentials. No secret is written in these
  documents.
- The mobile design keeps access/refresh tokens in platform secure storage, never in
  Drift/logs; the vault key is memory-only and zeroized; plaintext never enters staging,
  pins, backups or the API.
- Per-account database/staging paths and sign-out clearing prevent cross-account reads on
  a shared device.
- Local deletion is always confirmed; Android uses system trash/delete requests where
  required; SAF deletes state their irreversibility.
- Share secrets remain in the URL fragment; the app must not log or send them.
- Background notifications can reveal file names on a lock screen; a privacy setting to
  hide names is a release-hardening item, not silently ignored.
- The I1 defect is an integrity/UX issue, not a confidentiality breach: the server still
  verifies hashes and never sees plaintext.

## 14. Risks and blockers

| Severity | Risk | Mitigation / owner |
|---|---|---|
| **P0** | No Flutter/Dart/NDK/make/CMake/MSVC on the host; JDK 26 may be too new for Gradle/AGP | Install and prove the toolchain before M1; run `flutter doctor`, a `sodium` vector test, an Android build, and a 16 KB emulator check. |
| **P1** | No macOS/Xcode 27 | iOS builds/tests are blocked here; book a macOS host before iOS acceptance. |
| **P1** | Web resume defect I1 | Mobile avoids it; web needs a separate fix and regression test; correct the Milestone 4 claim in the meantime. |
| **P1** | No Supabase project / web sign-in | Mobile implements the flow but production verification waits; web blocker remains. |
| **P1** | G3/G4 missing | Implement before M7; do not fake conflict detection. |
| **P2** | G1 missing | Build-time config for M1; client-config before beta. |
| **P2** | Android background/FGS limits; iOS suspension | Durable queue + visible resume; documented platform limits. |
| **P2** | Local access narrower than user expectations | Capability-aware UI and explicit non-claims. |
| **P2** | 16 KB page-size native libraries | Build aligned; test on a 16 KB emulator. |
| **P3** | `sodium` lacks SHA-256; build hooks add toolchain complexity | Use `package:crypto` SHA-256; prove the hook build before M3. |
| **P3** | DTO drift between TypeScript and Dart | Contract fixtures and enum tests; optional generated DTOs later. |

## 15. Outstanding issues

1. Fix or explicitly retract the web's cold-start resume claim (I1); add a regression test.
2. Update SRS A10 to the actual route table (I2).
3. Decide G1 (public client-config) shape and add `SUPABASE_PUBLISHABLE_KEY` to API config.
4. Implement G3/G4 before M7, with tests for tombstones and conflict responses.
5. Extract shared crypto vectors to JSON (G5) before M3.
6. Install the Flutter/Android native toolchain and verify `sodium` and `sqlite3` builds.
7. Provide a macOS/Xcode 27 host and a real Supabase project for the relevant milestone
   acceptance.
8. Add mobile artifacts to `.gitignore` when the app is scaffolded (`.dart_tool/`, `build/`,
   `.flutter-plugins*`, `android/.gradle/`, `ios/Pods/`, etc.).
9. Decide whether the first release links Telegram from the web only or also implements
   the existing phone/code flow on mobile.
10. Fix the stale `MAX_UPLOAD_BYTES` documentation (done here) and keep future docs tied to
    `env.ts`.

## 16. Next milestone entry criteria

Mobile Milestone 1 may start only when:

1. **These decisions are accepted** (or the open choices are resolved): MADR-001…012,
   especially the client-config approach, staging policy, supported OS matrix and the
   no-all-files-access scope.
2. **The toolchain is installed and proven:** Flutter 3.47.9 / Dart 3.13.7, a Gradle-
   compatible JDK, Android NDK, `make`, CMake/MSVC as needed by `sodium`/`sqlite3`;
   `flutter doctor` is clean for Android; a tiny Flutter test links libsodium and SQLite;
   a debug APK builds; a 16 KB page-size emulator loads it.
3. **The backend is running locally** in `AUTH_MODE=dev`, with a seeded account and the
   existing `pnpm test` suites green.
4. **The iOS acceptance path is known**: a macOS/Xcode 27 host is available, or iOS is
   explicitly deferred with a written limitation.
5. **Production auth expectation is set**: a Supabase project is available for the
   verification milestone, or M1 is explicitly marked "dev-auth verified, Supabase flow
   unverified".
6. **The M1 scope is approved** (shell + auth + theme + error states), with no feature
   creep into Cloud or Local before their milestones.

Once those are met, create `apps/mobile/`, pin the dependencies, and implement M1. Do not
start Cloud/Local work first; the auth/session and account-scoping boundary is the
foundation every later screen depends on.
