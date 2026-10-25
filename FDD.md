# Frontend Design Document (FDD)
## Personal Cloud Drive

**Version:** 1.0  
**Framework:** Next.js App Router + TypeScript  
**Styling:** Tailwind CSS + shadcn/ui  
**Data fetching:** TanStack Query  
**Client state:** Zustand  
**Forms:** React Hook Form + Zod  
**Design direction:** Minimal dark-mode file manager

---

## 1. Design objectives

The frontend shall make a large personal file collection easy to understand and navigate.

The primary design objectives are:

1. Show a useful overview immediately after sign-in.
2. Make upload status visible without interrupting browsing.
3. Keep search and folder navigation accessible.
4. Provide consistent file operations across list, grid and category views.
5. Make errors, offline states and synchronization conflicts visible.
6. Keep sensitive cryptographic operations inside the client.
7. Provide a responsive desktop and mobile web experience.

## 2. Visual language

### 2.1 Theme

Default to a dark interface inspired by the supplied reference image.

Suggested design tokens:

- Application background: `#171717`
- Sidebar and elevated surfaces: `#202020`
- Secondary surfaces: `#262626`
- Primary text: `#F5F5F5`
- Secondary text: `#A3A3A3`
- Borders: `#383838`
- Focus and selection: a restrained blue or violet accent.

Category icon accents shall distinguish Photos, Videos, Audio, Documents, APKs, Archives, Downloads and Apps. Keep the colors consistent across dashboard tiles, filters and category labels.

Use a system sans-serif font or a modern UI font. Maintain strong contrast and visible keyboard focus.

### 2.2 Layout principles

- Use a persistent sidebar on desktop.
- Use a compact top bar for global search and account actions.
- Keep page headings and primary actions consistent.
- Prefer cards for the dashboard overview and a table/list for detailed file management.
- Avoid excessive borders, shadows and gradients.
- Display file size, modification date and file type as secondary information.
- Provide skeleton loading states and meaningful empty states.

## 3. Information architecture

### Main navigation

- Home
- My Files
- Photos
- Videos
- Audio
- Documents
- APKs
- Archives
- Downloads
- Apps
- Recent
- Favorites
- Shared
- Trash
- Storage

### Global controls

- Search.
- Upload files.
- Create folder.
- Upload queue.
- Notifications or activity.
- Account and settings menu.

### Settings sections

- General preferences.
- Appearance.
- Storage provider status.
- Encryption and key recovery.
- Upload defaults.
- Trash and retention.
- Security and active sessions.

## 4. Screen specifications

### 4.1 Home dashboard

The dashboard is the main landing page.

#### Header

Display a greeting or neutral welcome message, a global search field and a prominent Upload button.

#### Category overview

Create a responsive grid of eight category tiles matching the supplied image:

- Photos
- Videos
- Audio
- Documents
- APKs
- Archives
- Downloads
- Apps

Each tile contains an outlined icon, category name and item count.

On desktop, use four columns when sufficient width is available. Reduce to two columns on narrow mobile screens. Counts must be loaded from metadata queries and should not be hardcoded.

#### Additional sections

1. **Recent files:** most recently created or modified logical files.
2. **Storage overview:** total logical bytes, number of files, trash size and version usage where available.
3. **Upload activity:** current, queued, paused and failed uploads.
4. **Quick access:** favorites and frequently used folders.
5. **Recent activity:** concise descriptions of important actions.

The category grid should remain the most visually prominent feature near the top of the dashboard.

### 4.2 My Files

Provide two views:

- Grid view for visual browsing.
- List view for detailed metadata and bulk operations.

The page shall contain:

- Breadcrumb navigation.
- Current folder title.
- Search within the current folder.
- Sort and filter controls.
- New folder and upload actions.
- Selection toolbar for bulk operations.
- Context menu for file operations.

The file list shall support pagination and stable sorting.

### 4.3 Category pages

Each category page shall reuse the same file-browser component, with a category-specific title, icon and query filter.

Category classification shall be based on stored MIME type and extension, with a safe fallback for unknown formats. APKs and Archives shall use explicit classification rules.

Downloads shall use an activity or download-history definition. Apps shall be defined as a separate classification or collection. These categories may overlap with other file types.

### 4.4 Search

Global search shall provide:

- Filename query.
- File type and category filters.
- Date range.
- Size range.
- Folder scope.
- Tag selection.
- Sorting.

Search results shall display file name, type, size, modified time and folder location.

Later, the interface may add full-text and semantic search as separate modes. Semantic search shall not be required to use ordinary filename and metadata search.

### 4.5 File details panel

Selecting a file shall open a side panel or details page containing:

- Name and type.
- Size.
- Created and modified dates.
- Folder location.
- Tags.
- Current version.
- Version history.
- Content integrity status.
- Storage-provider reference status.
- Available actions.

Do not display Telegram credentials or raw provider download URLs.

### 4.6 Upload manager

Provide a persistent upload drawer or panel that can remain open while the user navigates.

Each upload row shall display:

- Filename.
- Progress percentage.
- Uploaded and total bytes.
- Current status.
- Retry or pause action.
- Cancel action.
- Error details where appropriate.

The queue shall support multiple files and bounded concurrency.

Progress shall distinguish bytes processed locally, bytes acknowledged by storage and finalization. Do not display 100% completed until integrity verification and metadata finalization succeed.

### 4.7 Version history

Display versions newest first with:

- Version number.
- Upload timestamp.
- Size.
- Integrity status.
- Restore action.

Restoration shall require confirmation and explain that the previous content will become the current version without silently destroying history.

### 4.8 Trash

Display deleted files with deletion date and purge deadline.

Available actions:

- Restore.
- Permanently delete.
- Empty trash.

Permanent deletion shall require confirmation. The UI shall distinguish a completed deletion from a cleanup operation that is still pending.

### 4.9 Sharing dialog

The sharing dialog shall support:

- Create link.
- Expiration date.
- Maximum download count.
- Optional password.
- Read-only access.
- Revoke link.
- Copy link.

For E2EE content, include a separate and explicit key-sharing step. Never imply that a link alone allows a recipient to decrypt a file when it does not.

### 4.10 Storage page

Provide:

- Total logical storage usage.
- Usage by category.
- Largest files.
- Duplicate candidates.
- Trash and retained-version usage.
- Cleanup recommendations.

Charts shall be accompanied by accessible labels and numeric summaries.

### 4.11 Settings and security

The encryption section shall explain:

- The current encryption status.
- How key backup works.
- What happens if keys are lost.
- How to verify recovery material.
- How to rotate or replace keys if supported.

Never expose the plaintext encryption key in ordinary settings screens or browser logs.

## 5. Responsive behavior

### Desktop

- Sidebar remains visible.
- Dashboard uses a multi-column category grid.
- File lists show detailed metadata.
- File details use a side panel.
- Upload manager can remain open alongside browsing.

### Tablet

- Sidebar may collapse.
- Category grid uses two to four columns depending on width.
- Details panels may become overlays.

### Mobile web

- Navigation collapses into a drawer or bottom navigation.
- Category tiles use two columns.
- File actions move into overflow menus.
- Upload progress remains visible.
- File details use a full-screen sheet or page.

The Android application will share the product's visual language but should use native-feeling navigation and platform-specific offline behavior.

## 6. Component architecture

### Application shell

- `AppShell`
- `Sidebar`
- `MobileNavigation`
- `TopBar`
- `GlobalSearch`
- `UploadButton`
- `UploadQueueDrawer`
- `AccountMenu`

### Dashboard

- `CategoryGrid`
- `CategoryTile`
- `RecentFiles`
- `StorageOverview`
- `RecentActivity`
- `QuickAccess`

### File management

- `FileBrowser`
- `FileGrid`
- `FileTable`
- `FileCard`
- `FileRow`
- `FileContextMenu`
- `FolderBreadcrumbs`
- `FilterToolbar`
- `BulkActionBar`
- `FileDetailsPanel`

### Upload and recovery

- `UploadQueue`
- `UploadItem`
- `UploadProgress`
- `UploadError`
- `VersionHistory`
- `TrashView`
- `RestoreDialog`
- `ShareDialog`

### Shared primitives

Use shadcn/ui for dialogs, buttons, dropdowns, inputs, tabs, tooltips, toast notifications and accessible menus. Build product-specific components on top of these primitives.

## 7. Frontend state management

### Server state

Use TanStack Query for:

- File lists.
- Folder contents.
- Search results.
- File details.
- Versions.
- Shares.
- Storage statistics.
- Activity history.

Invalidate or update relevant queries after successful mutations.

### Client state

Use Zustand for transient UI state such as:

- Selected files.
- Sidebar state.
- Active file view.
- Upload queue presentation.
- Dialog and panel visibility.
- Local selection and sorting preferences where appropriate.

Do not duplicate server-owned file metadata unnecessarily in Zustand.

### Persistent browser state

Use IndexedDB for durable upload session references and supported offline data.

Persist only what is necessary. Store encrypted pending file data or recoverable upload parts when the chosen design supports it. Avoid putting plaintext file content or encryption keys into ordinary local storage.

## 8. Frontend security requirements

- Validate user input with Zod, while treating backend validation as authoritative.
- Use a secure authentication session strategy.
- Protect against cross-site scripting and unsafe file previews.
- Avoid rendering untrusted HTML or SVG content without appropriate isolation.
- Apply restrictive Content Security Policy settings where compatible with the application.
- Never expose backend secrets through `NEXT_PUBLIC_*` variables.
- Do not log plaintext file data, encryption keys or share secrets.
- Ensure file decryption occurs in the client.
- Keep sensitive key material out of analytics and error-reporting events.
- Verify share permissions before exposing a download or decryption operation.

## 9. Accessibility

- Keyboard-accessible navigation and menus.
- Visible focus indicators.
- Semantic headings and landmarks.
- Accessible labels for category icons and file actions.
- Screen-reader announcements for upload state changes.
- Textual progress descriptions in addition to progress bars.
- Sufficient text contrast.
- Reduced-motion support.

## 10. Frontend testing

Unit tests shall cover category classification, formatting, upload-state transitions and validation.

Component tests shall cover search controls, file selection, upload progress, context menus, confirmation dialogs and error states.

End-to-end tests shall cover:

- Sign-in and sign-out.
- Dashboard category navigation.
- File upload and download.
- Folder creation and movement.
- Search and filtering.
- Upload retry and resume.
- Version restoration.
- Trash recovery.
- Share-link creation and revocation.
- Offline-state presentation.
- Responsive navigation.

## 11. Design acceptance criteria

The frontend is ready for release when:

1. All eight category tiles appear on the home dashboard.
2. Every category opens a correctly filtered file view.
3. Search and filtering work without a full-page reload.
4. Upload progress remains visible during navigation.
5. Upload errors provide actionable retry options.
6. File and folder actions update the UI consistently.
7. Destructive actions require appropriate confirmation.
8. The layout is usable on desktop, tablet and mobile.
9. Loading, empty, error, offline and success states are designed.
10. Security-sensitive operations do not expose credentials or plaintext keys.
