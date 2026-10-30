# Mobile platform capabilities, permissions and limits

**Status:** Mobile Milestone 0 audit · **Date:** 30 October 2026

This document defines what the Flutter app may access on Android and iOS, which
permissions it declares, and what it must not claim. It is the implementation contract for
the Local tab and for background transfer. The architecture rationale is in
[architecture.md](architecture.md); the API is in [api-contract.md](api-contract.md).

The short version: **the app is a first-class client with least-privilege access, not a
replacement for the device's system file manager.**

---

## 1. Android

### 1.1 Supported versions

| Item | Value |
|---|---|
| Flutter support | API 24–37 (CI-tested 24–36) |
| `minSdk` | 24 |
| `compileSdk` / `targetSdk` | 36 / 36 |
| Play requirement | New apps and updates must target API 36 since 31 August 2026 |
| Native page size | Build 16 KB-aligned native libraries; test on a 16 KB page-size emulator |

### 1.2 Storage access model

| Surface | Access | Permission | Notes |
|---|---|---|---|
| App internal storage | `filesDir`, `cacheDir`, `noBackupFilesDir` | None | Preferred for the database, staging and pins. |
| App-specific external storage | `getExternalFilesDir` | None | Scoped to the app; removed on uninstall. Use only if internal space is insufficient. |
| Media library (images/videos/audio) | MediaStore via `photo_manager` | `READ_MEDIA_*` (API 33+) or legacy `READ_EXTERNAL_STORAGE` | Play restricts broad media permissions; offer Photo Picker first. |
| User-selected media | Android Photo Picker | None | Best default for “add photos/videos”; no library-wide access. |
| Documents, downloads, APKs, archives | Storage Access Framework | None | `ACTION_OPEN_DOCUMENT` / `ACTION_OPEN_DOCUMENT_TREE`; the user grants the scope. |
| Other apps' downloads | SAF only | None | `MediaStore.Downloads` alone cannot read files the app did not create. |
| Root of internal storage, `Download/`, `Android/data`, `Android/obb` | Not grantable on Android 11+ | — | SAF cannot grant these roots; the app must explain the limit. |
| All-files access | **Not requested** | — | `MANAGE_EXTERNAL_STORAGE` is unnecessary with SAF and invites Play review. |

`saf_util 3.1.1` + `saf_stream 4.0.3` (verified current on pub.dev, Android-only) provide
tree listing, `DocumentFile` operations, persisted URI permissions and read/write streams.
The implementation must call `takePersistableUriPermission` for every selected tree and
check `hasPersistedPermission` after a restart. A revoked grant is a normal state, not an
exception: the Local tab shows the tree as *Access removed* and asks the user to select it
again.

### 1.3 Android permissions

Declared in `AndroidManifest.xml` only when the feature is present:

| Permission | Protection | When | Rationale |
|---|---|---|---|
| `INTERNET` | normal | always | API, Supabase Auth. |
| `ACCESS_NETWORK_STATE` | normal | always | Connectivity state for the queue. |
| `POST_NOTIFICATIONS` | runtime (API 33+) | first upload/transfer | Foreground-service and completion notifications. Denial must not block transfer; show in-app status. |
| `FOREGROUND_SERVICE` | normal | always | Upload/download foreground service. |
| `FOREGROUND_SERVICE_DATA_SYNC` | normal (API 34+) | always | Correct service type for transfers. |
| `WAKE_LOCK` | normal | optional | Only if the service needs a partial wake lock; avoid if not measured necessary. |
| `READ_MEDIA_IMAGES` | runtime (API 33+) | only if the user enables full media-library browsing | Play-policy restricted. Photo Picker is the default. |
| `READ_MEDIA_VIDEO` | runtime (API 33+) | same | Play-policy restricted. |
| `READ_MEDIA_AUDIO` | runtime (API 33+) | only if audio-library browsing is enabled | Not needed for SAF-picked audio. |
| `READ_MEDIA_VISUAL_USER_SELECTED` | runtime (API 34+) | when partial photo access is requested | Supports “Select photos…” limited access. |
| `READ_EXTERNAL_STORAGE` | runtime, `maxSdkVersion=32` | legacy media browsing only | Not needed on 33+; do not request on 33+. |
| `WRITE_EXTERNAL_STORAGE` | runtime, `maxSdkVersion=28` | only if legacy shared writes are implemented | Prefer SAF; do not add unless a tested legacy path needs it. |

**Not requested, deliberately:** `MANAGE_EXTERNAL_STORAGE`, `QUERY_ALL_PACKAGES`,
`REQUEST_INSTALL_PACKAGES`, `READ_LOGS`, `USAGE_STATS`, `SYSTEM_ALERT_WINDOW`. The app does
not list installed apps, install APKs or inspect usage history.

### 1.4 Android file operations

| Operation | MediaStore / Photo Picker media | SAF tree | App storage |
|---|---|---|---|
| Browse | Yes, if permission granted; otherwise picker-selected items only | Yes, within granted trees | Yes |
| Search | Index MediaStore metadata in Drift; query by name/type/date/size | Index the granted tree; refresh on change | Yes |
| Rename | Only files the app owns; otherwise system consent may be required | Yes (`DocumentFile.renameTo`) | Yes |
| Move | MediaStore move is not a general operation; use SAF for arbitrary moves | Yes (`moveTo`) | Yes |
| Copy | Read + create a new item (share sheet/SAF), never a silent duplicate | Yes (`copyTo`) | Yes |
| Delete | Use `MediaStore.createTrashRequest`/`createDeleteRequest` (API 30+) so the user confirms; handle `RecoverableSecurityException` on 29 | `DocumentFile.delete` after explicit confirmation | Yes, after confirmation |
| Preview | Read via content URI; images/video/audio | `saf_stream` to app temp, then viewer | Direct |
| Share | `share_plus` with a content URI or a temp copy | Temp copy or content URI | Yes |
| Storage insights | MediaStore aggregate by bucket/type/size | Tree index aggregate | App size |
| Large files | MediaStore size query | Tree index | Direct |
| Duplicate candidates | Name + size (optionally on-demand local SHA-256) | Name + size | Name + size |
| Cleanup | Recommendations only; no automatic deletion | Recommendations only | Recommendations only |

Deletion rules:

1. Never delete without a confirmation that names the file(s) and says whether the action
   is recoverable.
2. For other apps' media on Android 30+, use the system trash/delete request; do not try to
   bypass consent.
3. A SAF delete is immediate; state that clearly and require confirmation.
4. “Remove from this list” is not a delete and must never be labelled as one.

### 1.5 Android background execution

- A `dataSync` foreground service keeps the transfer alive while the user is away, with a
  persistent notification.
- Android 15+ limits `dataSync` foreground services to **6 hours in a 24-hour period**;
  when the budget is exhausted the service is stopped. The app must catch the timeout,
  persist the job state and show *Resume* rather than pretending the transfer is still
  running.
- Android 14+ requires the `dataSync` type declaration and the matching permission.
- `POST_NOTIFICATIONS` denial does not prevent the service but hides its notification;
  in-app status is still required.
- Doze/battery optimisation can delay work. Do not promise “always in the background”.
- The durable queue is the source of truth; the foreground service is an optimisation.

### 1.6 Android verification

- API 36 emulator (and one API 24/28 legacy device or image for permission paths).
- 16 KB page-size emulator image for native library loading (`sodium`, `sqlite3`).
- Real grant/deny of media and notification permissions; revoke a SAF tree permission
  from system settings and reopen the app.
- `adb shell am force-stop` during a multi-chunk upload; relaunch and resume.
- `adb shell cmd jobscheduler run`/FGS timeout simulation where available; otherwise a
  clock-injected test plus a documented manual check.
- SAF picker automation is limited; use a test DocumentsProvider or a scripted manual
  test for tree selection, then automate the operations on the granted tree.

## 2. iOS

### 2.1 Supported versions and lifecycle

| Item | Value |
|---|---|
| Flutter support | iOS 15–27 |
| Deployment target | 15.0 |
| Build toolchain | Xcode 27 on macOS (cannot build on the Windows host) |
| Lifecycle | UIScene required by the iOS 27 SDK; Flutter's template handles it, but custom native code must adopt it |

### 2.2 Sandbox and file access

| Surface | Access | Notes |
|---|---|---|
| `Documents/` | App sandbox; exposed in Files when `UIFileSharingEnabled` and `LSSupportsOpeningDocumentsInPlace` are set | This is the app's own “local files” area. |
| `Library/Application Support/` | App sandbox | Database, staging, pinned ciphertext; not user-visible. |
| `Library/Caches/` | App sandbox, evictable | Decrypted previews/temp only. Never staging that must survive. |
| `tmp/` | App sandbox, evictable | Short-lived exports. |
| External documents | `UIDocumentPickerViewController` | User-selected files; import/export. |
| Persistent external access | Security-scoped bookmarks | Requires native Swift; resolve stale bookmarks and always balance `startAccessingSecurityScopedResource`. |
| Photos | PHPicker (no permission) or PhotoKit (permission) | Default to PHPicker; do not request the full library unless the user enables it. |
| Files app providers (iCloud Drive, Dropbox, etc.) | Only through the system picker | The app never enumerates all providers. |
| Device-wide filesystem | Not available | No claim of Files-by-Google parity. |

There is no iOS equivalent of `MANAGE_EXTERNAL_STORAGE`. The app cannot browse another
app's container, the whole Photos library without permission, or all Files providers
without user selection.

### 2.3 iOS Info.plist keys

| Key | When | Reason |
|---|---|---|
| `UIFileSharingEnabled = YES` | always | Shows the app's Documents folder in Files. |
| `LSSupportsOpeningDocumentsInPlace = YES` | always | Files can open documents in place. |
| `NSPhotoLibraryUsageDescription` | only if full-library browse is enabled | Required by PhotoKit; PHPicker does not need it. |
| `NSPhotoLibraryAddUsageDescription` | only if the app saves to Photos | User-initiated export only. |
| `UIBackgroundModes = fetch, processing` | only if BGTaskScheduler is used | Background refresh/maintenance; not a guarantee of upload completion. |
| `BGTaskSchedulerPermittedIdentifiers` | only with the above | Register the exact identifiers. |
| `NSLocalNetworkUsageDescription` | debug/LAN development only | Connecting to a development API on the LAN; not in release. |
| App Transport Security exception | debug only | Loopback/LAN HTTP; production is HTTPS. |

Keychain access for `flutter_secure_storage` should use a device-only accessibility class
appropriate to when the session is needed (for example `first_unlock_this_device`), and
must not sync the session to iCloud.

### 2.4 iOS file operations

| Operation | App sandbox | Security-scoped external URL |
|---|---|---|
| Browse | Yes | Only the bookmarked file/directory |
| Search | Yes | Index bookmarked scope |
| Rename / move / copy / delete | Yes, after confirmation | Yes, while the scope is accessed and the provider allows it |
| Preview | Yes | Yes, after copying to temp if the viewer needs a local file |
| Share | `UIActivityViewController` | Yes, user-initiated |
| Storage insights | Sandbox + volume capacity | Only the selected scope |
| Large files / duplicates / cleanup | Within the sandbox/bookmarks | Within the selected scope |

Deletion is always confirmed. A security-scoped delete may be irreversible; say so.

### 2.5 iOS background execution

- iOS does not allow an arbitrary Dart upload loop to run indefinitely. `beginBackgroundTask`
  grants a short grace period (on the order of tens of seconds, not guaranteed).
- `URLSession` background configuration can continue a download/upload **task** while the
  app is suspended; orchestrating a chunked `stackbase/1` upload across many tasks is not
  a supported guarantee and is not promised in the first release.
- `BGTaskScheduler` can run short maintenance/refresh work; it is best-effort and may be
  deferred by the system.
- The app must show *Waiting for the app* / *Paused by iOS* and resume deterministically
  when foregrounded. It must never show a fake progress bar or “uploading” state while
  suspended.

### 2.6 iOS verification

- Build and run on macOS with Xcode 27; the Windows host cannot produce or test an iOS
  build.
- Simulator: layout, sandbox files, document picker import/export, navigation.
- Real device: Files app visibility, security-scoped bookmark persistence after relaunch,
  PHPicker/Photos, share sheet, background suspension and resume, Keychain after reboot.
- `xcrun simctl terminate` during an upload; relaunch and verify the queue/staging state.
- Test a limited Photos selection and a revoked bookmark.

## 3. Cross-platform capability summary

| Capability | Android | iOS |
|---|---|---|
| Full-device file browsing | No (MediaStore + SAF scopes) | No (sandbox + picker/bookmarks) |
| Media library browse | Permission-gated MediaStore; Photo Picker default | Permission-gated PhotoKit; PHPicker default |
| Arbitrary documents | SAF tree, persisted grant | Document picker + security-scoped bookmark |
| Rename/move/copy/delete | SAF full; MediaStore subject to consent/ownership | Sandbox/bookmarked scope |
| Delete confirmation | System trash/delete request or explicit app dialog | Explicit app dialog |
| Background transfer | Foreground service, 6 h/24 h limit | Foreground + short grace; no guarantee |
| Storage insights | Volumes + MediaStore/SAF index | Sandbox/bookmarks + volume capacity |
| Large files/duplicates | Best-effort within accessible scopes | Best-effort within accessible scopes |
| APK listing | SAF (no install permission) | Not applicable |
| Share sheet | Yes | Yes |

## 4. Explicit non-claims

The app must not say or imply:

- “Browse all files on your phone.”
- “Clean up your entire device.”
- “Uploads continue in the background on iOS.”
- “Delete frees space immediately” when the OS uses a trash/consent flow.
- “Duplicate” without a definition (name + size is a candidate; byte-identical requires a
  hash the user may not want to pay for).
- “Encrypted files are backed up” unless the staging/pin policy actually includes them.

Every empty, denied, revoked and unsupported state needs real copy and a real next action.

## 5. References

- [Android: access media files](https://developer.android.com/training/data-storage/shared/media)
- [Android: access documents and files with SAF](https://developer.android.com/training/data-storage/shared/documents-files)
- [Android: foreground service timeouts](https://developer.android.com/develop/background-work/services/fgs/timeout)
- [Google Play target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Flutter supported platforms](https://docs.flutter.dev/reference/supported-platforms)
- [Apple: providing access to directories](https://developer.apple.com/documentation/uikit/view_controllers/providing_access_to_directories)
- [Apple: background URL sessions](https://developer.apple.com/documentation/foundation/urlsession/creating_a_background_session)
- [Apple: PHPicker](https://developer.apple.com/documentation/photokit/phpicker)
- [Apple: UIScene](https://developer.apple.com/documentation/uikit/uiscene)
- [saf_util](https://pub.dev/packages/saf_util) · [saf_stream](https://pub.dev/packages/saf_stream)
