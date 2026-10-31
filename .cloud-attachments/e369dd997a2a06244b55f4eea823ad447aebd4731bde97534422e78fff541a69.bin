# StackBase — Add Flutter Mobile Application to Existing Project

## Task

Extend the existing StackBase repository with a production-oriented Flutter mobile application for Android and iOS.

This is an extension of the existing StackBase product, not a separate project.

The existing Next.js web application, Fastify backend, Supabase PostgreSQL database, Supabase Auth integration, Telegram MTProto storage adapter, and client-side encryption architecture must remain intact.

The Flutter application must share the same backend, database, authentication model, file organization, encryption format, and cloud-storage behavior.

## 1. First inspect the existing project

Before changing anything:

1. Inspect the complete repository structure.
2. Identify existing web, API, database, and cryptography implementations.
3. Read the existing SRS, FDD, architecture documents, API contracts, and database migrations.
4. Identify the actual API endpoints and existing authentication behavior.
5. Identify the current encryption implementation and manifest format.
6. Identify existing file, folder, version, upload, and download models.
7. Report any incompatibilities between the existing implementation and the mobile requirements.

Do not assume that the documented implementation already exists. Verify the actual repository.

Do not replace working code unnecessarily.

## 2. Create a Flutter application

Create:

`apps/mobile/`

Use Flutter and Dart.

Recommended architecture:

- Feature-first folder structure.
- Riverpod for state management.
- GoRouter for navigation.
- Dio for HTTP.
- Drift for local SQLite persistence.
- Freezed and json_serializable for models.
- flutter_secure_storage for appropriately protected device secrets.
- flutter_test and integration_test for testing.

Verify package compatibility with current stable Flutter, Android and iOS versions before pinning dependencies.

## 3. Shared backend

The mobile application must use the existing Fastify API.

Do not:

- Create a second backend.
- Connect directly to Telegram MTProto.
- Expose Telegram API hashes or session strings.
- Expose Supabase service-role credentials.
- Duplicate business logic in the mobile client.
- Create a second metadata database.

Use the existing authentication and ownership model.

If additional API functionality is required, implement it through the existing API architecture and document the contract.

## 4. Local file manager

Implement a native-feeling local file manager similar in functionality to Files by Google.

Features:

- Browse accessible device files.
- Images, videos, audio, documents, downloads, APKs where supported, and archives.
- Search local files.
- Sort and filter.
- Multi-select.
- Rename, move, copy, and delete where operating-system permissions allow.
- Preview supported formats.
- Native share sheet.
- Device storage insights where supported.
- Large-file identification.
- Duplicate candidates.
- Cleanup recommendations.

Implement Android and iOS file access through appropriate platform APIs.

Android must respect scoped storage, MediaStore, and Storage Access Framework requirements.

iOS must respect application sandboxing and use supported document-picker and Files-provider integrations.

Do not claim unrestricted filesystem access.

Do not request unnecessary broad permissions.

Do not permanently delete files without explicit user confirmation.

## 5. Cloud file manager

Create a separate Cloud Files area.

Features:

- Browse StackBase files and folders.
- Search and filter.
- View recent and favorite files.
- Upload local files.
- Download cloud files.
- Mark files for offline access.
- Preview encrypted files after local decryption.
- Manage tags and metadata.
- Manage versions and Trash.
- Create and manage share links.

The cloud file namespace must match the web application's file namespace.

Changes made in the mobile application must be visible in the web application and vice versa.

## 6. Encryption compatibility

This requirement is mandatory.

Flutter must implement the same reviewed and versioned encryption format as the web application.

Do not invent a new encryption algorithm or manifest.

Do not implement independent encryption logic without cross-platform test vectors.

Verify:

- Web to Flutter encryption/decryption interoperability.
- Flutter to Web encryption/decryption interoperability.
- Vault-key recovery.
- File-key wrapping.
- Streaming encryption.
- Integrity validation.
- Chunk ordering.
- Tampering detection.
- Large-file behavior.

Use established libraries and pin compatible versions.

Never send plaintext file encryption keys to the backend.

## 7. Upload and download management

Implement:

- Encrypted uploads.
- Chunked transfer.
- Progress reporting.
- Persistent job metadata.
- Retry with exponential backoff and jitter.
- Pause and resume where supported.
- Source-file reselection when necessary.
- Fingerprint verification.
- Cancellation.
- Background transfer where the platform permits.
- Integrity validation.
- Safe recovery after application termination.

Use the existing backend upload state machine.

Do not treat mobile upload progress as proof of Telegram storage completion.

Background execution must follow Android and iOS platform constraints. Provide visible status and recovery behavior when background execution is unavailable or interrupted.

## 8. Offline functionality

Implement:

- Local metadata caching.
- Offline cloud-file browsing using cached metadata.
- Explicitly pinned encrypted files.
- Offline previews when the necessary decryption capability is available.
- Persistent upload queue.
- Synchronization after connectivity returns.
- Conflict detection.
- Visible synchronization status.

Use a clear separation between device-local files and cloud files.

Do not silently overwrite conflicting content.

Do not cache decrypted private content in shared or unrestricted application storage.

## 9. Mobile UI design

Follow the existing StackBase design system.

Amber Minimal:
- Warm off-white backgrounds.
- White surfaces.
- Amber primary actions.
- Dark typography.
- Restrained borders and shadows.

Graphite Terminal:
- Graphite backgrounds.
- Layered dark surfaces.
- Amber highlights.
- High-contrast typography.

Design principles:

- Native-feeling navigation.
- Bento-inspired dashboard.
- Simple file categories.
- Compact file cards.
- Smooth and restrained animations.
- Accessible controls.
- Responsive layouts.
- Reduced-motion support.

Suggested bottom navigation:

1. Home
2. Local
3. Cloud
4. Settings

Keep upload activity accessible from the application shell.

## 10. Testing

Add:

- Unit tests.
- Widget tests.
- Integration tests.
- Android-specific tests.
- iOS-specific tests.
- API integration tests.
- Encryption interoperability tests.
- Offline synchronization tests.
- File-permission tests.
- Upload interruption tests.

Test real operating-system permission behavior, not just mocked success cases.

## 11. Development rules

- Work in milestones.
- Do not rewrite the existing web application.
- Do not break existing API contracts.
- Add migrations only when genuinely necessary.
- Reuse shared documentation and contracts.
- Keep platform-specific code isolated.
- Do not add fake UI actions.
- Do not claim support for unsupported device operations.
- Document platform differences.
- Preserve cross-platform encryption compatibility.

## 12. Initial task

Do not immediately build the entire mobile application.

Start with:

### Mobile Milestone 0 — Integration audit

1. Inspect the existing repository.
2. Identify reusable API and cryptography components.
3. Verify the existing database and authentication implementation.
4. Determine mobile-specific API gaps.
5. Finalize the Flutter architecture and package choices.
6. Identify Android and iOS permission requirements.
7. Produce a mobile architecture decision record.
8. Produce the Flutter folder structure.
9. Produce a milestone implementation plan.
10. Report risks and blockers.

Then proceed to Mobile Milestone 1 only after the integration audit is complete.

At the end of every milestone, report:
- Files created or modified.
- Features implemented.
- Tests executed and results.
- Platform limitations.
- Security considerations.
- Outstanding issues.
- Next milestone entry criteria.

The existing StackBase SRS, FDD, and architecture remain authoritative unless a documented architecture decision explicitly updates them.

**End of mobile integration instructions.**