# Mobile Milestone 4 — encrypted upload/download and durable queue

**Status:** implementation complete; verification is partial. The real-API transport
round-trip is green, but process-kill staging recovery, the queue UI state machine and
background transfer are not yet demonstrated. **Date:** 1 November 2026.

**Scope:** the Flutter client in `apps/mobile/`. No API route, database migration or web
change was required; the existing upload/version contracts are used unchanged.

---

## 1. What is implemented

- **Staging before upload (MADR-007):** a selected file is encrypted once to
  `<app-support>/stackbase/account-<id>/staging/<localId>.part`. The complete ciphertext
  stays on the device and is the resume source. A sidecar JSON stores the exact manifest,
  idempotency key, name, MIME type, folder and source size. No plaintext or key is stored.
- **Upload transport:** create job, PUT each ciphertext chunk with lowercase SHA-256 in
  `x-chunk-checksum`, finalize with both hashes, cancel/pause/resume/retry, list unfinished
  jobs. Uploads are serialized one at a time.
- **Progress:** local encryption, server-confirmed chunk count, finalize and completion
  are distinct states. The UI never marks a file complete before finalize returns.
- **Resume model:** staged chunks are read by deterministic offset; confirmed chunk
  numbers are skipped. A server job in `paused` uses `resume`; `failed` and
  `needs_source_file` use `retry`; a job that is still open sends only missing chunks.
- **Download/decrypt:** fetch immutable versions, stream the authenticated ciphertext to a
  private temp file, verify the declared length and both SHA-256 values, decrypt, and save
  the plaintext under `Documents/StackBase`. The temp ciphertext and plaintext buffers are
  zeroized/deleted after use.
- **UI:** the transfer sheet lists the real queue with pause, resume, retry, cancel and
  dismiss actions plus an upload picker. The Cloud tab has an encrypted-upload action and
  the file details sheet has Download & decrypt. The Local tab lists app-managed decrypted
  files with share and delete actions. The app bar shows an active-transfer badge.

## 2. Files

| Area | Files |
|---|---|
| Transfer DTOs | `lib/core/models/transfers.dart`, `lib/core/models/ciphertext_download.dart` |
| API | `lib/core/api/api_client.dart` (upload, chunk, finalize, queue actions, versions, ciphertext stream) |
| Staging | `lib/features/uploads/data/transfer_store.dart` |
| Queue | `lib/features/uploads/presentation/transfer_controller.dart` |
| Download | `lib/features/uploads/data/download_service.dart` |
| UI | `lib/features/uploads/presentation/transfers_sheet.dart`, `lib/features/local_files/presentation/local_screen.dart`, `lib/features/cloud_files/presentation/cloud_screen.dart`, `cloud_sheets.dart`, `stackbase_app_bar.dart`, `vault_unlock.dart` |
| Tests | `integration_test/upload_api_test.dart` |
| Dependencies | `file_selector 1.1.0`, `share_plus 13.3.1`, `mime 2.1.0` |

## 3. Verification actually run

| Check | Result |
|---|---|
| `flutter analyze` | **No issues found** |
| Android real-API test `integration_test/upload_api_test.dart` | **1 passed** against `http://10.0.2.2:8787` |
| Real-API flow | Fresh dev identity → 8 MiB Argon2id vault → 200,000-byte file encrypted at 64 KiB chunks → 4 chunks uploaded → finalize → version list → download → SHA-256/length check → decrypt and compare |
| Android crypto vectors | 20 passed (M3 report), including the 1 MiB loop and tamper cases |
| Flutter→web interop | Node verifier returned `ok: true`; 2 chunks, matching plaintext SHA-256 |

The real-API test also confirms the server returns `transferring` immediately after create
for this job rather than the nominal `queued`; the test therefore asserts “not finished”
instead of overfitting to one transient status.

## 4. Not yet verified / not implemented

| Exit criterion | Status |
|---|---|
| Multi-chunk upload appears in the mobile and web library | Upload/finalize/version/download **verified**; web UI visibility not re-checked in a browser |
| Kill the app mid-transfer, relaunch, resume the same staging stream | **Not exercised** |
| Deleted staging → cancel + restart with a new file | **Not exercised** |
| Corrupted chunk / wrong finalize hash → `UPLOAD_INTEGRITY_FAILED`, no version | **Not exercised** (crypto tamper tests exist, not the upload endpoint) |
| Pause/resume/retry/cancel state machine through the UI | **Not exercised**; code exists |
| Download tamper rejection end-to-end | Crypto-level rejection is verified; server-tamper path not exercised |
| Android foreground service + notification | **Not implemented** |
| iOS background behavior | **Not implemented/verified**; requires macOS |
| Widget tests for the new sheets/screens | **Blocked** by the missing Windows MSVC toolchain; analyzer and Android compilation are green |

## 5. Security and limitations

- Staging is ciphertext plus a manifest. It is app-private and excluded from backups on
  Android. No passphrase or unwrapped key is written.
- The download path currently holds the complete ciphertext and plaintext in memory during
  decryption. This is acceptable for the tested file size but is a large-file hardening
  item; the pinned format itself is stream-friendly.
- The Local tab is deliberately limited to app-managed `Documents/StackBase` files. It does
  **not** claim device-wide access; Android SAF/MediaStore and iOS security-scoped bookmarks
  remain Milestone 6.
- Cloud rename/move/tag/trash, shares, version restore and previews remain Milestone 5.

## 6. Next work

1. Add a staging/queue integration test that kills and relaunches the process mid-upload.
2. Add the Android foreground service and notification baseline.
3. Add widget tests for pause/resume/cancel and the local file list on a host with MSVC.
4. Run the upload/download test against the Telegram provider, not only local storage.
5. Complete M5 before calling the mobile client feature-complete.
