# Mobile Milestone 1 — foundation, shell and authentication

**Status:** implementation and automated verification complete; on-device and
iOS verification are listed as pending in §5. **Date:** 30 October 2026.

**Scope:** the Flutter client in `apps/mobile/`. The web app, Fastify API,
PostgreSQL schema, Supabase Auth integration, Telegram adapter and `stackbase/1`
format were not changed. No database migration or API endpoint was added.

**Design references:** [Mobile architecture](../mobile/architecture.md),
[API contract](../mobile/api-contract.md),
[platform capabilities](../mobile/platform-capabilities.md),
[milestone plan](../mobile/milestone-plan.md), and the
[audit report](mobile-milestone-0.md).

---

## 1. Summary

The app is now a real, runnable Flutter client rather than a scaffold:

- It validates compile-time configuration before any network or storage call.
- It signs in with the existing Fastify API in `AUTH_MODE=dev`, or with Supabase
  GoTrue email/password in production-style builds.
- It stores session material in the platform keystore, restores it after process
  death, refreshes it once on `401`, and clears it on sign-out.
- It renders the four-tab shell in Amber Minimal and Graphite Terminal, with
  bottom navigation on phones and a navigation rail on tablets.
- Home, Settings and the shell use real `/me`, `/setup/status` and `/health`
  data. Loading, empty, error, offline and session-expired states are visible.
- Cloud, Local and Transfers are labelled as later milestones. They contain no
  fabricated files, fake progress or buttons that pretend an operation happened.

The Android debug APK builds. The Dart analysis is clean and 46 unit/widget tests
pass. A four-case live smoke test against the real local Fastify API also passes.

## 2. Files created or modified

| Area | Files | Change |
|---|---|---|
| Flutter project | `apps/mobile/pubspec.yaml`, `pubspec.lock`, `.metadata`, `analysis_options.yaml`, `README.md` | Flutter 3.47.9 project, exact direct pins, checked-in lockfile, project documentation. |
| Configuration | `lib/core/config/app_config.dart`, `lib/bootstrap.dart`, `lib/main.dart` | Validated `--dart-define` config, Supabase boot, setup/failure screens. |
| HTTP | `lib/core/api/{api_client,api_exception,dev_session_client,dio_factory}.dart` | Dio client, request ids, error envelope mapping, retry policy, single refresh-and-retry. |
| Authentication | `lib/core/auth/{auth_session,auth_repository,dev_auth_repository,supabase_auth_repository,secure_session_store,auth_controller}.dart`, `lib/core/providers.dart` | Dev and Supabase repositories, per-account storage namespaces, session controller, expiry handling. |
| Models | `lib/core/models/{auth_user,user_settings,me_response,setup_status}.dart` plus generated Freezed/json files | Contract DTOs with exact wire enum values. |
| UI system | `lib/app/theme/{tokens,theme,motion,theme_controller}.dart`, `lib/core/ui/**` | Amber/Graphite tokens, Material 3 themes, shared cards, state messages, app bar, formatters. |
| Shell | `lib/app/router/app_router.dart`, `lib/app/app.dart`, `lib/features/shell/presentation/app_shell.dart` | GoRouter graph, auth-stage routing, persistent shell, adaptive rail. |
| Screens | `lib/features/{auth,home,local_files,cloud_files,settings,setup,splash,uploads}/**` | Sign-in, Home bento, honest placeholders, Settings, setup/failure, splash, transfers sheet. |
| Android | `android/app/build.gradle.kts`, manifests, `MainActivity.kt`, launch resources, `gradle.properties` | `app.stackbase.mobile`, min 24 / target+compile 36, INTERNET only, backup disabled, debug-only cleartext, launch colours. |
| iOS | `ios/Runner/Info.plist`, `project.pbxproj`, generated `SceneDelegate.swift` | Bundle `app.stackbase.mobile`, display name, iOS 15 target, UIScene template, local-network ATS exception only. |
| Tests | `test/config`, `test/api`, `test/auth`, `test/app`, `test/integration`, `test/support` | 46 unit/widget tests plus an opt-in 4-case live API suite. |
| Docs | this report, root `README.md`, mobile plan status | Mobile track status and verification evidence. |

No existing web/API source was rewritten. `apps/mobile/` is a new workspace
directory; it has no `package.json` and is not part of the pnpm workspace.

## 3. Features implemented

### Configuration and startup

- `API_BASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
  `WEB_PUBLIC_ORIGIN` and `AUTH_MODE` are read from `--dart-define`.
- Absolute http(s) URLs only; credentials, query strings and fragments are
  rejected. Release builds require HTTPS. `AUTH_MODE=dev` is rejected in release
  builds. `auto` chooses Supabase when both values are present, otherwise dev
  sessions only in debug.
- An invalid configuration renders the setup screen with the exact problems and
  a copyable development command. It does not crash, create a fake session or
  contact the network.
- A valid configuration whose Supabase initialization throws renders a startup
  failure screen without printing the key.

### API and auth

- Dio connects to the existing `/api/v1` base, preserving a self-hosted path
  prefix. Each request carries a request id and a non-secret client marker.
- `AuthInterceptor` attaches the bearer token, performs one refresh on
  `401 AUTH_REQUIRED`, and retries with the exact accepted token. A second 401
  reports expiry once; it cannot loop.
- Idempotent GET/HEAD requests retry transport errors, 429 and 5xx with
  exponential backoff plus jitter. POST/PATCH are never blindly retried.
- Server error envelopes map to stable codes and user messages. Transport
  failures become `NETWORK_UNAVAILABLE`, `TIMEOUT` or `TLS_ERROR`.
- Supabase password sign-in uses GoTrue only; no database or storage API is
  called. Session JSON is persisted through a custom `LocalStorage` backed by
  `flutter_secure_storage` (Android Keystore, iOS Keychain
  `first_unlock_this_device`, non-synchronising).
- Development sign-in calls the existing `POST /api/v1/dev/session` and persists
  only in debug builds. The repository refuses construction in release builds.
- Sign-out clears the session, the vault key namespace and every account-scoped
  key. Switching directly between accounts also clears the previous namespace.
- `GET /me`, `PATCH /me/settings`, `GET /setup/status` and `/health` are wired.

### Shell and screens

- Four destinations: Home, Local, Cloud and Settings. Phones use
  `NavigationBar`; widths ≥ 720 dp use `NavigationRail` (extended ≥ 1080 dp).
- Home shows the account, real library counts, storage provider/status, vault
  status and API health. Each card has loading, error and empty behaviour.
- Settings shows the account, appearance, server health, storage/vault status,
  app version, auth mode and sign-out. The theme choice is saved on the device
  and PATCHed to the account default; a failed PATCH is explained while the
  local choice remains.
- A persistent app-bar transfer action opens a real sheet whose empty state says
  transfers are not enabled in this build.
- 320 dp and tablet widths have no overflow; the transfer/settings actions are
  reachable by touch, not hover.
- Page transitions and theme animation are removed when the platform requests
  reduced motion; the shell adds no decorative animation.
- Offline and unreachable-API banners are based on the platform interface state
  and the real health endpoint, not on fabricated connectivity.

## 4. Tests executed and results

All commands were run from `apps/mobile` with Flutter 3.47.9 / Dart 3.13.7.

| Check | Command | Result |
|---|---|---|
| Static analysis | `flutter analyze` | **No issues found** |
| Unit/widget suite | `flutter test` | **46 passed** |
| Live API smoke test | `flutter test test/integration/live_api_test.dart --dart-define=LIVE_API_BASE_URL=http://127.0.0.1:8787` | **4 passed** against the real Fastify API |
| Android debug build | `flutter build apk --debug --dart-define=API_BASE_URL=http://10.0.2.2:8787 --dart-define=AUTH_MODE=dev` | **Built** `app-debug.apk` (171 MB debug) |

The live suite issued a real dev session, read `/me`, read `/setup/status`, wrote
and re-read the account theme preference, and confirmed that an anonymous client
receives `401 AUTH_REQUIRED`. The API was started with its normal development
configuration and stopped afterwards.

The APK manifest was inspected with `aapt2`:

```text
package: app.stackbase.mobile
minSdkVersion: 24
targetSdkVersion: 36
compileSdkVersion: 36
uses-permission: android.permission.INTERNET
uses-permission: android.permission.ACCESS_NETWORK_STATE
```

The second permission is contributed by `connectivity_plus`; there are no
storage, package, install or notification permissions in this milestone.

Normal-suite coverage includes:

- configuration validation (missing values, HTTPS, release/dev rejection,
  path prefixes, credentials, web-origin paths);
- error-envelope parsing and every mapped transport/status branch used by the UI;
- auth refresh-and-retry, refresh-loop prevention, skip-auth on the dev route,
  and GET-only retry;
- Supabase repository session mapping, invalid-password mapping, single-flight
  refresh, sign-out cleanup and rejected-refresh cleanup using a mock GoTrue
  client;
- dev repository persistence, expired-session removal, single-flight reissue,
  sign-out cleanup and debug-only construction;
- account-scoped secure storage isolation and Supabase `LocalStorage` round-trip;
- sign-in success, signed-out gating, expired-session banner, four-tab shell,
  rail layout, dark theme, 320 dp overflow, reduced motion.

## 5. What could not be verified

| Item | Status | Why / next action |
|---|---|---|
| Sign-in on an Android emulator | **Pending** | No emulator/system image was installed on the Windows host at the time of the automated pass. The APK is built and the real API path is exercised from Dart; device verification must be repeated once an emulator is available. |
| iOS build and run | **Not run** | Requires macOS with Xcode 27. The project is configured for iOS 15 and UIScene, but no iOS binary was produced here. |
| Real Supabase project flow | **Not verified** | The Supabase repository is unit-tested against a mock GoTrue client. A real project is required to verify issuer/audience/refresh and callback behaviour. |
| On-device Keystore/Keychain | **Not exercised** | Provider tests use an in-memory secure store. The plugin is configured for Android Keystore and iOS Keychain; a device test must confirm restore, sign-out and key invalidation behaviour. |
| Native crypto and `stackbase/1` interop | **Out of M1 scope** | Arrives in Mobile Milestone 3. This build contains no encryption claims or key handling. |
| Background transfer / iOS suspension | **Out of M1 scope** | Arrives with the transfer milestones; the Transfers sheet says so. |

The host's default JDK 26 fails the Android Gradle Plugin's `jlink` transform.
The APK was built with a local Temurin **JDK 21.0.13**, which is the supported
range for this build. The repository does not hard-code a JDK path.
`kotlin.incremental=false` is set in `android/gradle.properties` because Kotlin
2.4.0's incremental cache can be closed twice when plugin modules compile in
parallel on this host; a clean build then succeeds deterministically.

## 6. Security considerations

- **No secret in the bundle.** Only public values (`API_BASE_URL`,
  `SUPABASE_URL`, publishable key, web origin) are compiled in. Service-role
  credentials, Telegram hashes/session strings and the JWT secret are absent.
- **Tokens are not in shared preferences.** Sessions use the platform keystore;
  the theme preference is the only shared-preferences value.
- **Account isolation.** Account keys are prefixed
  `stackbase.account.<userId>.`; sign-out and direct account switching clear the
  departing namespace. Tests seed two accounts and prove the second survives the
  first's cleanup.
- **Expired sessions fail closed.** A rejected refresh clears local material and
  routes to sign-in with an explanation; no retry loop remains.
- **Least privilege.** Android requests only INTERNET (plus the plugin's
  network-state access), backups are disabled, cleartext is debug-only, and the
  iOS ATS exception is limited to local networking. No storage/media permission
  is requested before the feature that needs it.
- **No fabricated security.** The vault status is read from the server, but the
  app does not claim it can unlock or decrypt yet. No passphrase is requested in
  this milestone.

## 7. Outstanding issues

1. Repeat the Android happy path on an emulator/device: install the debug APK,
   sign in with `AUTH_MODE=dev`, confirm `/me`-backed Home, rotate/restart to
   confirm restore, sign out, then sign in as a second identity and confirm the
   first account's data is not shown.
2. Build and sign in on a macOS/Xcode 27 host; confirm UIScene launch and the
   Keychain namespace on a real iOS device.
3. Connect a real Supabase project and verify issuer, audience, refresh and
   revocation against the running API.
4. Decide whether the first launch should seed the device theme from the
   account's server theme. It deliberately starts in System mode today; explicit
   changes update both the device and the account default.
5. Add a public client-config endpoint (G1) before a distributable self-hosted
   build; M1 correctly uses build-time values instead.
6. Keep the transport refresh semantics under review: a Supabase refresh rejected
   with `AuthException` clears the session, while a transport failure keeps the
   current token and surfaces the offline state.

## 8. Next milestone entry criteria

Mobile Milestone 2 (cloud read-only browser and metadata cache) can begin once:

- the M1 exit path is accepted with the outstanding device/iOS checks tracked;
- a local API is running with a development identity and, ideally, storage
  configured;
- the DTO fixtures for files/folders/tags/summary/insights are added alongside
  the contract tests in `docs/mobile/api-contract.md`;
- the team accepts that M1 has no encryption, upload or local-file capability and
  that no UI claims otherwise.

The web app and API remain unchanged; no migration is required for M2.
