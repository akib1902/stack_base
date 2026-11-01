# StackBase Mobile

Android and iOS client for the existing StackBase backend. The Fastify API,
PostgreSQL schema, Supabase Auth integration and `stackbase/1` encryption format
remain authoritative; this app is a first-party client, not a second product.

**Status:** core client implemented — foundation/auth, cloud read cache,
`stackbase/1` crypto, encrypted upload/download, a durable local transfer queue and
an app-managed local file list. Milestones 5–8 (cloud mutations/shares, full SAF
file management, offline sync and release hardening) remain open. See
[Mobile Milestone 3](../../docs/reports/mobile-milestone-3.md),
[Mobile Milestone 4](../../docs/reports/mobile-milestone-4.md) and the
[milestone plan](../../docs/mobile/milestone-plan.md).

## Requirements

- Flutter **3.47.9** and Dart **3.13.7**
- JDK **17–21** for the Android Gradle build. JDK 26 currently fails in the
  Android Gradle Plugin `jlink` transform.
- Android SDK platform 36, build-tools 36, `minSdk 24`
- The Android NDK and `make` for the `sodium` native build
- macOS with Xcode 27 for iOS builds (deployment target 15.0, UIScene lifecycle)
- A Windows C++ toolchain (Visual Studio with `vswhere`) if you want to run the
  Dart VM tests locally; otherwise run the integration suite on Android.

The repository does not commit the SDK. A local Flutter checkout can live under
`.toolchain/`, which is ignored.

## Run

```bash
cd apps/mobile
flutter pub get

# Local API (AUTH_MODE=dev). Android emulator reaches the host at 10.0.2.2.
flutter run \
  --dart-define=API_BASE_URL=http://10.0.2.2:8787 \
  --dart-define=AUTH_MODE=dev
```

For a physical Android device use the host LAN address. For the iOS simulator use
`http://127.0.0.1:8787`. Release builds require HTTPS.

Production-style authentication uses Supabase GoTrue for password sign-in only:

```bash
flutter run \
  --dart-define=API_BASE_URL=https://drive.example.com \
  --dart-define=AUTH_MODE=supabase \
  --dart-define=SUPABASE_URL=https://project.supabase.co \
  --dart-define=SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`AUTH_MODE=auto` (the default) selects Supabase when both Supabase values are
present, otherwise development sessions in debug builds. `AUTH_MODE=dev` is
rejected in release builds. There is no service-role key, Telegram hash or JWT
secret in the app.

## Build and test

```bash
flutter analyze
flutter test

# Optional: real API read smoke test. Start the API with AUTH_MODE=dev.
flutter test test/integration/live_api_test.dart \
  --dart-define=LIVE_API_BASE_URL=http://127.0.0.1:8787

# Optional: real API encrypted upload/download round-trip on Android.
flutter test integration_test/upload_api_test.dart -d emulator-5554 \
  --dart-define=API_BASE_URL=http://10.0.2.2:8787

# Android crypto vectors + web interop fixture.
flutter test \
  integration_test/crypto_vectors_test.dart \
  integration_test/interop_fixture_test.dart \
  -d emulator-5554 --no-uninstall

# Pull the Flutter→web fixture, then verify it with the web libsodium build.
adb exec-out run-as app.stackbase.mobile \
  cat files/interop-flutter-to-web.json > .tmp-flutter-interop.json
node tool/interop/verify_flutter_fixture.mjs .tmp-flutter-interop.json

# Android debug APK
flutter build apk --debug \
  --dart-define=API_BASE_URL=http://10.0.2.2:8787 \
  --dart-define=AUTH_MODE=dev
```

The host `flutter test` command needs Visual Studio/MSVC for the `sodium` build
hook. On this Windows host the native tests are run on Android instead; the test
files are shared.

## Code generation

Freezed and json_serializable models are checked in. Regenerate after changing a
`@freezed` model:

```bash
dart run build_runner build
```

## Structure

```text
lib/
├── app/            # MaterialApp, router, Amber/Graphite themes
├── core/
│   ├── api/        # Dio, auth/retry, upload/version transport
│   ├── auth/       # dev + Supabase repositories, secure storage, controller
│   ├── config/     # validated --dart-define configuration
│   ├── crypto/     # stackbase/1 vault, file format, share capability
│   ├── database/   # per-account metadata cache
│   ├── models/     # contract DTOs
│   └── ui/         # shared cards, states, app bar, formatters
└── features/
    ├── auth/
    ├── home/
    ├── local_files/ # app-managed Documents/StackBase list, upload/share/delete
    ├── cloud_files/ # cached read browser, upload action, download/decrypt
    ├── encryption/  # vault controller and shared unlock prompt
    ├── settings/
    ├── shell/
    └── uploads/     # transfer controller, staging, download, queue sheet
```

## Security model

- Access tokens and development sessions use `flutter_secure_storage` (Android
  Keystore, iOS Keychain). No session token is kept in shared preferences.
- Every account-scoped secure key uses `stackbase.account.<userId>.`; sign-out
  removes the session and the departing account's keys and closes its cache.
- The dev-session route is only constructed in debug builds and the API rejects it
  outside `AUTH_MODE=dev`.
- Android backups are disabled; release builds do not permit cleartext HTTP.
- Vault passphrases and vault keys are never persisted, logged or sent to the API.
  The vault key is held in memory for the session and zeroized on lock/sign-out.
- Uploads stage ciphertext only. Downloads verify length, both SHA-256 values and
  every secretstream tag before writing plaintext.
- The Local tab only lists files StackBase created under its own Documents
  directory; it does not request device-wide storage access.

## Current limits

- Cloud rename/move/tag/favourite/trash, shares, version restore and previews are
  Mobile Milestone 5.
- Android SAF/MediaStore browsing and iOS security-scoped bookmarks are Milestone 6.
- Offline metadata mutations require API gaps G3/G4 and are Milestone 7.
- Android foreground-service uploads, iOS background behavior, accessibility and
  release signing are Milestone 8.
