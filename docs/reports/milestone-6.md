# Milestone 6 — PWA and offline

**Date:** 29 October 2026
**Scope of this pass:** SRS C5/C8 and FR-15 — Milestone 6 bullets 1–3: offline
metadata, the web app manifest and service worker, and queued offline operations with
conflict handling. Local-first variant retained: the service worker and IndexedDB were
exercised in a real browser against the local provider, with no external credentials.

**Status:** in progress. The offline slice and the responsive/accessibility pass are
implemented, tested and verified. The remaining bullets — the security/integration/
end-to-end sweep and clean-deployment validation — are not part of this pass, so the
milestone exit criterion (*an independent developer can deploy and operate StackBase
with their own accounts*) is **not** claimed.

---

## Implemented behavior

**Installable metadata**

- `public/manifest.webmanifest`: `id`/`scope`/`start_url` `/`, standalone display,
  `theme_color #d97706`, background `#faf8f4`, categories, shortcuts to `/files` and
  `/trash`, and three icons — 192×192 and 512×512 `any`, plus a 512×512 `maskable`.
- Icons are generated deterministically by `apps/web/scripts/generate-icons.mjs`, a
  dependency-free PNG writer (supersampled rounded square plus the `SB` glyph) that
  emits 192/512/maskable PNGs and the 180×180 apple touch icon. No image tooling or
  binary assets are checked in without a reproducible source.
- `app/layout.tsx` links the manifest via Next metadata and declares the apple icon,
  `appleWebApp` and `viewport.themeColor`; `public/favicon.svg` is the matching mark.

**Service worker (`public/sw.js`)**

- Cache policy is an explicit allowlist, not a broad rule. Anything under `/api/`
  (the Next handlers proxy the httpOnly session cookie) and every cross-origin request
  are **never** cached, read or written. Only public, content-addressed assets are:
  the offline shell, manifest, favicon, icons and hashed `/_next/static/` bundles.
- Navigations are network-first with the cached `/offline.html` as the fallback (and a
  plain 503 body if even that is missing). Authenticated HTML is deliberately never
  persisted, so a shared device leaves no library data in Cache Storage.
- Public assets are cache-first with a quiet background refresh, so a rebuilt bundle is
  not pinned to an old copy.
- Caches are versioned (`stackbase-v1-static`); `activate` deletes older
  `stackbase-static-*` caches, and `skipWaiting` + `clients.claim` make a new worker
  take over without a second navigation.

**Offline shell (`public/offline.html`)**

- Served by the worker when a navigation cannot reach the network. It reads the same
  IndexedDB stores as the app and renders the signed-in account, the count and list of
  mirrored files/folders/tags, and any queued operations. It never fetches while
  offline, says so explicitly, offers **Try again**, and reloads automatically on the
  `online` event.

**Metadata mirror (`src/features/offline/`)**

- `idb.ts` is a small promise wrapper over one database (`stackbase-offline`, v1) with
  three stores: `owner` (key `id`), `library` (key `userId`) and `queue` (key `id`). It
  degrades to a no-op during SSR or where IndexedDB is unavailable.
- `metadata-cache.ts` stores a projection, not the API payload: file id/name/size/
  `updatedAt`/folder, folder id/name/parent, tag id/name. No keys, ciphertext or
  plaintext content ever enters the mirror.
- `adoptAccount` records the current account and clears every store when a different
  account signs in; `readLibrary` returns only the matching account's snapshot;
  `clearOfflineData` empties all stores on sign-out.
- `use-metadata-mirror.ts` mirrors what a library screen was actually served, skipping
  the write when the account has offline metadata disabled. `FileBrowser` is the mount
  point, so the mirror reflects the last library page rendered; a dashboard-only visit
  does not refresh it.

**Queued operations and conflicts (`queue.ts`, `offline-context.tsx`)**

- A queued operation records `userId`, kind, human label, resource id, payload, the
  file's `updatedAt` as `baseVersion`, status (`pending | syncing | conflict | failed`),
  attempts and error. `FileDetailsDialog` writes the whole metadata save — fields plus
  tag ids — when the browser reports offline and offline metadata is enabled, and shows
  *“Saved to this device…”* instead of a success it cannot prove.
- Replay is serial, oldest first, and deliberately cautious: it reads the file's
  current `updatedAt`; if it differs from `baseVersion` the operation becomes
  `conflict` and is **not applied** (visibility instead of last-write-wins). A file that
  is genuinely gone (404) is dropped as no longer applicable; a failed version check or
  refused action keeps the operation (`failed`, or back to `pending` if connectivity
  dropped mid-flight). Success removes it. A conflicted operation is terminal until a
  human discards it — replay never retries it.
- `OfflineProvider` registers the worker, tracks `online`/`offline`, replays
  automatically when connectivity returns, and exposes the queue, a manual **Sync now**
  and **Discard**. When a replay applies anything it also calls `router.refresh()`, so
  the file list and any open details dialog see the new revision.
- `FileBrowser` follows the newer revision of the file it has open. Together with the
  refresh above, an edit made after a replay is based on the current `updatedAt` and is
  not falsely reported as a conflict with the user's own earlier change. Both were
  added during this pass after the first implementation was already committed.

**Web surfaces**

- `OfflineProvider` wraps the authenticated app layout with the user and the account's
  `offlineEnabled` setting (`user_settings.offline_enabled`, present since migration
  0001).
- `TopBar` renders an **Offline** status with an accessible label when connectivity is
  lost.
- **Settings → Offline and cache**: the on/off toggle (persisted through
  `updateSettingsAction`), cached counts and last-sync time, every queued change with
  its status/error, **Discard**, **Sync now**, and an explanation when a conflict is
  present.
- `SignOutButton` clears the mirror and queue before redirecting, and the settings card
  states that signing out does so.

**Responsive and accessibility pass (C9/C11)**

- Every route (`/`, `/files`, `/recent`, `/favorites`, `/shared`, `/trash`,
  `/settings`, `/insights`) and the public `/sign-in`, the 404 page and `/offline.html`
  were audited at **390, 768, 1024 and 1280 px**. No horizontal overflow, clipped
  content or unreachable control was found; the file grid, folder cards, tables,
  toolbar, settings cards and dialogs all reflow without page scrolling.
- **Menus no longer clip.** The row/folder actions menu is a `<details>` popover. At
  390 px a right-aligned menu next to a left-side trigger started at `left: -8px`.
  `DropdownMenu` now measures the trigger on open and opens toward whichever side has
  room (verified both on a left-side file row and a right-side folder card).
- **Dialog focus returns to the trigger.** Choosing a menu item closed the menu before
  the dialog opened, so `showModal()` recorded `<body>` as the return target and Escape
  dropped focus at the top of the document. The menu now focuses its summary before
  closing; closing File details or Folder settings returns focus to
  *Actions for …*, and the native modal trap keeps Tab and Shift+Tab cycling inside
  the dialog.
- **Contrast** was measured on every rendered text/background pair in both themes. The
  light accent (#d97706) reached only 2.78–3.0:1 as small text on cream, and the muted
  tone on the raised surface reached 4.21:1. A `--primary-ink` token (#92400e light,
  #f2a93b dark) now carries accent text and icons while `--primary` remains the fill;
  `--muted-foreground` was darkened to #6b655e and the light focus ring to #92400e
  (3:1 minimum for the indicator). Every audited page in both themes now meets 4.5:1
  for normal text and 3:1 for large text and UI indicators.
- **Touch targets**: the two file-selection checkboxes keep their 16 px visual size but
  sit inside a 24×24 label, so the hit area meets WCAG 2.2 target size without changing
  the layout; all icon buttons are at least 32 px, and the remaining sub-24 px elements
  are inline text links (the spacing exception).
- Icon buttons have accessible names, inputs are labeled, headings follow h1 → h2 → h3
  where present, status messages use `role="status"`/`role="alert"`, the global
  `prefers-reduced-motion` rule disables animation and smooth scrolling, and every
  focusable control shows the 2 px offset focus ring.

## Changed files

Web features: `src/features/offline/{idb,metadata-cache,queue,offline-context,
offline-indicator,use-metadata-mirror}.ts(x)` (new),
`src/features/settings/offline-preferences.tsx` (new),
`src/components/layout/SignOutButton.tsx` (new),
`src/components/layout/TopBar.tsx`,
`src/components/library/{FileBrowser,FileDetailsDialog}.tsx`,
`src/app/(app)/layout.tsx`, `src/app/(app)/settings/page.tsx`,
`src/app/layout.tsx`.

Accessibility pass: `src/app/globals.css` (`--primary-ink`, darker light `--muted-foreground`
and `--ring`), `src/components/ui/DropdownMenu.tsx` (side-aware placement and focus
return), `src/components/library/FileViews.tsx` (24 px checkbox hit area), plus
`text-primary` → `text-primary-ink` in 28 components and pages (dashboard cards, toolbar,
dialogs, links, badges, offline status, share and upload surfaces).

PWA assets: `public/{sw.js,offline.html,manifest.webmanifest,favicon.svg}` (new),
`public/icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png` (generated),
`scripts/generate-icons.mjs` (new).

Tests: `test/offline-metadata.test.ts` (new), `test/offline-queue.test.ts` (new),
`test/sw-policy.test.ts` (new). `fake-indexeddb` was added as a web devDependency so
the real IndexedDB code paths run under Vitest.

Docs: this report; `README.md` status and report links (previously still Milestone 4).

No API or database changes were needed: the queue replays through the existing
`PATCH /api/v1/files/:id`, `PUT /api/v1/files/:id/tags` and `GET /api/v1/files/:id`.

## Tests run

| Check | Result |
|---|---|
| `pnpm -r test` (API 17 files / 152 tests) | pass — the existing suites were unchanged by this pass |
| `pnpm -r test` (web 13 files / 99 tests) | pass — including the three new offline suites |
| `offline-metadata.test.ts` (5) | pass — read-back per account, another account's mirror never returned, previous account dropped on switch, same account kept, sign-out clears mirror **and** queue |
| `offline-queue.test.ts` (9) | pass — apply against an unchanged file, conflict instead of overwrite, hold while offline, keep on refusal, keep on failed version check, drop only when the resource is gone, conflicted work left for a human, per-account replay isolation, discard |
| `sw-policy.test.ts` (5) | pass — the harness loads the real `sw.js` with a fake `self`/`caches` and dispatches events: precache on install, `/api` and cross-origin requests pass through uncached, public asset cached then served, failed navigation falls back to the offline shell, old cache version deleted |
| `pnpm -r typecheck` | pass — contracts, API, web |
| `pnpm --filter @stackbase/web build` | pass — production build, all routes |
| Manual browser verification | pass (below) |
| Responsive/a11y audit | pass — 11 surfaces at 390/768/1024/1280 px for overflow; keyboard, focus trap/restore, labels, contrast in both themes, touch targets and reduced motion verified on the rendered app |

## Manual browser verification

Against `pnpm dev:api` (127.0.0.1:8787) and `pnpm dev:web` (localhost:3000), signed in
as the existing `milestone5@example.com` account with its `milestone-5.txt`:

1. **Manifest and worker** — the page links `/manifest.webmanifest`; parsing it returns
   the expected name, `start_url`, standalone display and three icons. One registration
   exists for scope `/`, its worker is `activated`, and it controls the page. Cache
   Storage contains exactly `stackbase-v1-static` with the seven public paths. Fetching
   `/api/v1/me` afterwards added **zero** `/api` entries.
2. **Offline shell** — with the web server stopped, navigating to `/files` was served
   by the worker as *Offline · StackBase*: the signed-in email, *Last synced … 1 file(s)*,
   `milestone-5.txt · 70 B`, *No waiting changes*, and the retry/reconnect copy. The
   server was then restarted.
3. **Queued apply** — connectivity was simulated in the tab (polled `navigator.onLine`
   getter plus the `offline` event; the top bar showed **Offline**). A description edit
   saved through the real dialog produced the *Saved to this device* notice and one
   `pending` queue record with `baseVersion 2026-10-28T04:49:19.629Z`, while the API
   still reported `description: null`. Dispatching `online` replayed it automatically:
   the API then held the new description with a new `updatedAt`, and the queue was empty.
4. **Conflict** — a second offline edit (`offline note two`, based on `01:29:29.586Z`)
   was followed by a concurrent `PATCH` through the API with a bearer token
   (`edited elsewhere`, `01:31:22.427Z`). Reconnecting marked the operation `conflict`
   with the “changed somewhere else” message; the API kept `edited elsewhere`, proving
   the queued value was not applied. **Settings → Offline and cache** showed the row as
   **CONFLICT** with the explanation, and **Discard** removed it (queue count 0).
5. **Replay refresh** — with the dialog open, a queued edit was replayed on reconnect:
   the queue emptied, the dialog stayed open, and its *Modified* advanced to the
   replayed revision. A second offline edit saved from that same dialog queued
   `baseVersion 01:36:01.163Z` (the replayed version, not the stale one) and applied
   cleanly as `queued two` (`01:37:40.391Z`) with no conflict.
6. **Sign-out hygiene** — signing out redirected to `/sign-in` and left `owner`,
   `library` and `queue` each with **0** records. Signing back in recreated the owner
   record and the mirror.
7. **Responsive and accessibility sweep** — the routes listed above were rendered at
   390, 768, 1024 and 1280 px: no page overflowed or clipped. At 390 the file-row menu
   opened at `left: -8px` before the fix and at `left: 24px` after; a right-edge folder
   menu stayed inside the viewport. Opening *File details* from the menu and pressing
   Escape returned focus to *Actions for ubuntu-24.04.iso* (earlier: `<body>`), while
   the folder dialog returned to *Actions for Documents*, and
   Tab/Shift+Tab cycled through the dialog (Chrome briefly focuses its chrome between
   cycles; page content stays inert). Focus rings render as a 2 px amber ink outline.
   The contrast sweep at `/files`, `/settings`, `/shared`, `/insights`, `/` and the
   dark theme found the three failures listed above, all clear after the token changes;
   `/sign-in`, the 404 page and the offline shell are clean at 390 px. The 24×24
   checkbox label toggles selection and updates *1 selected* in the bulk bar.

## Known limitations

- **Only metadata edits are queued.** Name, description, folder, favorite and tags are
  covered; uploads, bulk moves, trash/restore/purge, folder edits and share changes are
  not. Offline attempts at those surfaces fail with the normal error.
- **Conflicts have no “keep mine”.** The row can be discarded or the edit redone while
  online; nothing merges fields or shows a diff.
- **No background sync.** Replay needs an open tab; the queue survives closing the app
  but is not replayed by the worker in the background.
- **No cross-tab coordination.** Two tabs share the queue store, but a replay in one is
  not broadcast; the other refreshes on its own `online` event or reload. This was not
  exercised with two tabs.
- **The mirror is screen-driven.** It updates when a library page renders
  `FileBrowser`; a dashboard-only visit leaves the previous snapshot (or none). The
  shell therefore shows what was last served, not a live view.
- **The offline shell is not the last page.** Authenticated HTML is intentionally never
  cached, so every offline navigation shows the shell plus mirrored metadata.
- **`navigator.onLine` is coarse.** A server-side failure while the browser claims to
  be online marks the operation `failed` instead of queueing it. The user can retry from
  Settings.
- **Cache version is manual.** `VERSION = 'stackbase-v1'` must be edited in `sw.js` for
  a breaking cache change; ordinary asset changes are handled by the background refresh.
- **Icons are placeholders** generated from the app colours and initials, not final
  brand artwork; there are no iOS splash screens.
- **Private mode / unsupported browsers** silently skip the worker and IndexedDB; the
  app still works online, and the queue is simply absent.
- **No quota handling.** IndexedDB write failures (quota, private mode) are not surfaced
  as a dedicated error; a failed enqueue would reject the save promise.
- **Tablet keeps the compact navigation.** From 640–1023 px the app uses the bottom
  navigation rather than the collapsible sidebar described in C9; the sidebar appears
  from 1024 px. Both are usable, but this is a deliberate deviation from the letter of
  the spec.
- **Content-dependent surfaces were not exercised visually.** The seeded audit account
  has a metadata-only library, so the upload panel, share dialog and `/s/[token]`
  recipient page were not rendered at narrow widths; the empty and metadata states
  were. They reuse the audited Dialog/panel primitives, but this is not a substitute
  for a pass with encrypted content.
- **Contrast was measured at rest.** Hover, active and disabled variants, and the
  transient upload progress states, were not individually sampled; text tokens are
  shared, so a token change covers most of them.
- **Background scroll is not locked** while a modal is open. `showModal()` makes the
  page inert and traps focus, but the body can still scroll behind the dialog.
- **One browser engine.** The audit ran in the Electron/Chromium preview; Firefox and
  Safari (including iOS dialog and IndexedDB differences) were not tested.
- **Menus keep their chosen side while open.** A viewport resize with a menu open can
  leave it on the old side until it is reopened.
- **No end-to-end automation.** The browser pass above was manual; the repository has no
  Playwright-style harness.
- `docs/setup/local-development.md` does not yet document the offline behavior beyond
  this report; the setup guide still stops at local development and Supabase deployment.

## Remaining Milestone 6 work

1. **Security, integration and end-to-end tests**: two-account isolation and a
   signed-out 401/403 sweep over the full route list, plus an automated end-to-end
   harness for the critical flows the manual passes have covered so far.
2. **Clean-deployment validation**: fresh clone → install → migrate → seed → build →
   run with Supabase Auth and the Telegram provider, documented well enough for an
   independent developer; the exit criterion depends on this, not on local PWA and
   accessibility checks.
3. **Optional follow-ups**: lock body scroll for modal dialogs, and decide whether the
   tablet breakpoint should gain the collapsible sidebar described in C9.

**Exit criterion:** an independent developer can deploy and operate StackBase with
their own accounts — not yet validated.
