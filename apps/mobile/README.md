# StackBase Mobile

Android and iOS client for the existing StackBase backend. The Fastify API,
PostgreSQL schema, Supabase Auth integration and `stackbase/1` encryption format
remain authoritative; this app is a first-party client, not a second product.

**Status:** Mobile Milestone 1 — foundation, shell and authentication. See
[Mobile Milestone 1 report](../../docs/reports/mobile-milestone-1.md) and the
[milestone plan](../../docs/mobile/milestone-plan.md).

## Requirements

- Flutter **3.47.9** and Dart **3.13.7**
- JDK **17–21** for the Android Gradle build. JDK 26 currently fails in the
  Android Gradle Plugin `jlink` transform.
- Android SDK platform 36, build-tools 36, `minSdk 24`
- macOS with Xcode 27 for iOS builds (the iOS project is configured for
  deployment target 15.0 and the UIScene lifecycle)

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

# Optional: real API smoke test. Start the API first with AUTH_MODE=dev.
flutter test test/integration/live_api_test.dart \
  --dart-define=LIVE_API_BASE_URL=http://127.0.0.1:8787

# Android debug APK
flutter build apk --debug \
  --dart-define=API_BASE_URL=http://10.0.2.2:8787 \
  --dart-define=AUTH_MODE=dev
```

The live API test creates a fresh development identity in the local database and
is skipped unless `LIVE_API_BASE_URL` is defined.

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
│   ├── api/        # Dio, auth/retry interceptors, error mapping
│   ├── auth/       # dev + Supabase repositories, secure storage, controller
│   ├── config/     # validated --dart-define configuration
│   ├── models/     # contract DTOs
│   ├── ui/         # shared cards, states, app bar, formatters
│   └── providers.dart
├── features/
│   ├── auth/       # sign-in
│   ├── home/       # real account, library, storage, vault and health states
│   ├── local_files/
│   ├── cloud_files/
│   ├── settings/   # account, theme sync, server status, sign-out
│   ├── shell/      # bottom navigation / navigation rail
│   └── uploads/    # transfer affordance and honest empty state
└── main.dart
```

## Security model

- Access tokens and development sessions are stored with
  `flutter_secure_storage` (Android Keystore, iOS Keychain
  `first_unlock_this_device`); no session token is kept in shared preferences.
- Every account-scoped secure key uses `stackbase.account.<userId>.` so a second
  account cannot read the first account's material. Sign-out removes the
  session and the departing account's keys.
- The dev-session route is only constructed in debug builds and the API rejects
  it outside `AUTH_MODE=dev`.
- Android backups are disabled; release builds do not permit cleartext HTTP.
  Debug builds allow cleartext only for a local API.
- File encryption, vault keys and uploads are **not** part of this milestone.
  No plaintext or key material is sent to the API by this build.

## Not implemented yet

Cloud browsing, local device browsing, `stackbase/1` crypto, encrypted
transfers, offline cache and share links are later milestones. The corresponding
screens say so instead of showing fabricated data or actions.
