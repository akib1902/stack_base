# Mobile Milestone 3 — `stackbase/1` crypto core and cross-platform interop

**Status:** complete on Android/Dart; iOS is written but not run. **Date:** 1 November 2026.

**Scope:** the Flutter client in `apps/mobile/`. The web app, Fastify API, database
schema and `stackbase/1` format were not changed. The only shared fixture change is the
language-neutral JSON already used by both clients.

**Design references:** [mobile architecture](../mobile/architecture.md),
[encryption format](../architecture/encryption-format.md), and the
[milestone plan](../mobile/milestone-plan.md).

---

## 1. Summary

The mobile client now implements the same `stackbase/1` format as the web app, not a
lookalike:

- Argon2id13 vault creation/unlock runs in a separate isolate; the vault key is held only
  in Dart memory and zeroized on lock/sign-out.
- File encryption uses XChaCha20-Poly1305 secretstream with the pinned 24-byte header,
  64 KiB–8 MiB chunks and 17-byte per-chunk overhead. The complete ciphertext and
  plaintext are hashed while streaming.
- Decryption validates the manifest, stream header, every chunk tag, the final tag,
  ciphertext SHA-256, plaintext size and plaintext fingerprint before returning content.
- Share capability re-wraps a version's data key under a fresh 32-byte secret. The share
  secret is never sent to the API.
- The same vault/file vectors are read from `assets/vectors/stackbase-1.json`; a separate
  web→Flutter fixture and a Flutter→web fixture prove both interop directions.
- The test suite caught and corrected a real assertion defect: the “pins the committed
  bytes” test compared raw bytes to a SHA-256 field instead of hashing them first.

## 2. Files

| Area | Files |
|---|---|
| Sodium/key handling | `lib/core/crypto/sodium_service.dart`, `encoding.dart`, `crypto_error.dart` |
| Vault | `lib/core/crypto/vault.dart`, `lib/core/models/vault.dart` |
| File format | `lib/core/crypto/file_format.dart` |
| Share capability | `lib/core/crypto/share.dart` |
| Shared vectors | `assets/vectors/stackbase-1.json`, `assets/vectors/interop-web-to-flutter.json` |
| Dart tests | `test/crypto/vectors_test.dart` |
| Android tests | `integration_test/crypto_vectors_test.dart`, `integration_test/interop_fixture_test.dart` |
| Interop tools | `tool/interop/generate_web_fixture.mjs`, `tool/interop/verify_flutter_fixture.mjs` |
| Dependencies | `pubspec.yaml` / `pubspec.lock`: `sodium 4.1.2+1`, `crypto 3.0.8` |
| Web cross-check | `apps/web/test/crypto-vectors.test.ts` reads the same pinned vault/file vector |

## 3. Tests executed and actual results

Run with Flutter 3.47.9 / Dart 3.13.7 against `emulator-5554` (Android, x86_64).

| Check | Command | Result |
|---|---|---|
| Static analysis | `flutter analyze` | **No issues found** |
| Android crypto vectors | `flutter test integration_test/crypto_vectors_test.dart -d emulator-5554` | **20 passed** |
| Flutter→web fixture | `flutter test integration_test/interop_fixture_test.dart -d emulator-5554` | **1 passed**; fixture written to the app's private support directory |
| Node/web verifier | `node tool/interop/verify_flutter_fixture.mjs <pulled fixture>` | **ok: true**; 2 chunks, 70,058 ciphertext bytes, matching plaintext SHA-256 |
| Real-API encrypted round-trip | `flutter test integration_test/upload_api_test.dart -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:8787` | **1 passed**; 4 chunks uploaded, finalized, version listed, downloaded and decrypted |
| 64 MiB Argon2id profile | included in the Android vector suite | completed inside the 30 s ceiling (about 3–4 s on this emulator) |
| 1 MiB chunk loop | included in the Android vector suite | round-trips a 2 MiB + 17 byte file as 3 chunks |

The vector suite covers the pinned KEK/vault key, wrong passphrase, replaced verifier,
vault creation schema, short passphrase, zero/one/boundary/multi-chunk sizes, flipped,
reordered, dropped and truncated chunks, wrong header, wrong ciphertext hash, wrong vault
key, malformed manifests, share re-wrap/decrypt and the web→Flutter multi-chunk fixture.

## 4. What could not run

| Item | Status | Reason / next action |
|---|---|---|
| Host Dart/Flutter unit suite | **Blocked** | `sodium`'s Windows build hook requires Visual Studio/MSVC; `vswhere.exe` is absent. Android is the executed native target. The same test files run there. |
| iOS tests | **Not run** | Requires macOS/Xcode 27. No iOS-specific crypto code exists; Dart/sodium code is shared. |
| Lowest-RAM physical device | **Not measured** | The 64 MiB profile was measured on the x86_64 emulator only. A low-RAM physical device remains a release-hardening check. |
| Background crypto while suspended | **Not applicable** | Crypto runs in the foreground/isolate; transfer background limits are tracked in M4/M8. |

## 5. Security notes

- **No secret persistence:** passphrase and vault key are never written to Drift,
  preferences, logs, the API or the staging directory. Vault keys are zeroized on lock,
  sign-out and provider disposal.
- **Only ciphertext leaves the device:** the API receives manifests, wrapped data keys and
  ciphertext chunks. It never receives plaintext, a passphrase or an unwrapped vault key.
- **Fail closed:** every decryption path verifies the header, tags, length and both hashes
  before returning plaintext. A tampered stream yields `CryptoException` and no content.
- **Interop fixtures are test material:** the pinned vault key and test plaintext are
  deterministic fixtures, not production secrets. The generated Flutter fixture contains
  ciphertext, the manifest and the pinned test key only; it contains no plaintext.
- **No logging of keys or content:** the app's API diagnostics log method, path, status,
  timing and request id only.

## 6. Outstanding issues

1. Run the host unit/widget suite on a machine with the Windows C++ toolchain (or use
   Android as the supported test target in CI).
2. Run the crypto suite on macOS/iOS and on a low-RAM physical Android device.
3. Keep the generated Flutter→web fixture out of source control; it is produced on demand
   and verified by `tool/interop/verify_flutter_fixture.mjs`.
4. The app-level download path currently verifies into a temp file and then decrypts with
   the in-memory file implementation. Streaming decryption for very large files remains a
   performance-hardening item (M8), not a format-compatibility issue.

## 7. Next milestone entry criteria

Mobile Milestone 4 can continue from this green crypto base:

- a local API with a working storage provider for real uploads/downloads;
- an unlocked vault in the test account;
- the M4 staging/queue implementation and its integration tests;
- the same Android device used here for cold-start and pause/resume checks.

The web and API regression suites remain unchanged by this milestone.
