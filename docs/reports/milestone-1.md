# Milestone 1 — Foundation

**Date:** 25 October 2026
**Scope:** SRS Part E, Milestone 1 (repository inspection, toolchain, Next.js + Fastify
applications, Supabase-auth boundary, migrations and RLS tests, application shell and
themes). Local-first variant agreed up front: no Supabase project and no Telegram
credentials are required to run, test or review this milestone.

## Implemented behavior

**Monorepo and tooling**

- pnpm workspace: `apps/api`, `apps/web`, `packages/contracts`.
- Strict TypeScript everywhere (`pnpm typecheck`), Vitest for all tests.
- Environment configuration is parsed and cross-validated at startup with actionable
  errors (`src/config/env.ts`); no secret has a silent fallback.
- `apps/api/.env.example` and `apps/web/.env.example` document every variable.

**API (Fastify 5, TypeScript)**

- `GET /health` — real database probe; returns `503` and `degraded` when the database is
  unreachable. Response headers: `no-store`, `nosniff`, `no-referrer`.
- `GET /api/v1/me` — verified identity, profile and settings; provisions rows
  idempotently if a project predates the trigger.
- `GET /api/v1/setup/status` — owner-scoped storage connection state plus live file,
  folder and byte counts (trashed items excluded).
- `GET /api/v1/library/summary` — per-category file counts and bytes for the Bento home
  screen, computed in one grouped SQL query; empty categories are returned as real zeros
  and trashed files are excluded.
- `POST /api/v1/dev/session` — development-only local sign-in; never registered in
  production.
- Uniform error envelope with SRS A11 codes, request validation, 404 handling, CORS
  allow-list and global rate limiting.
- JWT verification for both auth modes, role restriction, UUID subject validation, and
  bearer-token extraction that rejects non-bearer schemes.
- Migration runner: ordered, transactional, SHA-256 checksummed; refuses to run if an
  applied migration was edited.

**Database (Supabase-compatible PostgreSQL)**

- Ten migrations (`supabase/migrations/0001`–`0010`) implementing SRS Part B: profiles,
  settings, storage connections, folders, files, storage objects, versions, tags,
  relationships, upload jobs/chunks, shares, audit events, offline operations.
- Ownership-aware composite foreign keys, nonnegative/state/format check constraints,
  folder-cycle guard, immutable versions, current-version consistency trigger, cascade
  and restrict behavior per the spec's deletion rules.
- Required indexes from B4, including case-insensitive tag uniqueness.
- RLS on every table, `anon` fully revoked, ownership policies via `auth.uid()`, and
  server-only internal tables with no client grants.
- `0010` fails the migration run if RLS, grants or policy coverage regress.
- Local-only auth stub (`supabase/local/`) for PGlite and bare PostgreSQL; never applied
  to Supabase.

**Web (Next.js 16 App Router)**

- Amber Minimal and Graphite Terminal themes from the FDD token table, applied through
  CSS variables; cookie-backed so there is no theme flash and the switch works without
  client JavaScript.
- Application shell: 240 px sidebar, sticky top bar, mobile bottom navigation, skip link,
  visible focus rings, reduced-motion support.
- Sign-in page with accessible form states; protected `(app)` segment redirects to
  sign-in; sign-out clears the session cookie.
- Bento home: nine category tiles (Photos, Videos, Audio, Documents, APKs, Archives, Apps,
  Downloads, Other files) with 2/1/1 → 1/1/1/1 → 2/2 column rhythm, per-category accent,
  size, count and share-of-library bar — all from `library/summary`.
- Frosted Bento surfaces (gradient fill, rim light, backdrop blur over an ambient wash),
  staggered entrance, hover lift with specular sweep, spring-eased icon chips and press
  scale; every animation is CSS-only, respects reduced motion and never gates an action.
- Bento dashboard: logical storage, setup checklist, library empty state, live service
  status — every value comes from the API, nothing is fabricated.
- Settings: appearance (working), account, Telegram connection state, encryption status,
  retention defaults, sharing status. Upcoming destinations are announced as "Soon" and
  are not rendered as dead links or inert buttons.
- Loading/error/not-found handling: error boundary with retry, distinct empty states.

## Tests run

| Suite | Result |
|---|---|
| `apps/api/test/auth.test.ts` (12) | pass — missing/malformed/expired/wrong-audience/service-role tokens rejected; identity from token only; dev route absent in production; validation and 404 envelopes; no-store headers |
| `apps/api/test/setup-status.test.ts` (4) | pass — real counts, trashed excluded, per-owner isolation, connection state without session leakage |
| `apps/api/test/rls.test.ts` (15) | pass — cross-user read/insert/update/delete blocked, forged ownership rejected, cross-owner folder parent and tag rejected, cycle rejected, version immutability, current-version consistency, audit read own/write denied, internal tables inaccessible to `authenticated` and `anon` |
| `apps/api/test/library-summary.test.ts` (4) | pass — auth required; all nine categories in canonical order with zero counts for a new account; real mime/extension aggregation (including a `.JPG` extension and a trashed file that must not count); per-owner isolation |
| `apps/web/test/*` (16) | pass — formatting helpers, storage/setup/library/service-status cards including the "unreachable" and "not connected" states; category grid rendering all nine tiles, real counts/sizes/share bars, and no inert controls |
| `pnpm --filter @stackbase/api typecheck` | pass |
| `pnpm --filter @stackbase/contracts typecheck` | pass |
| `pnpm --filter @stackbase/web typecheck` (`tsc --noEmit`) | pass |
| `next build` | pass — `/`, `/settings`, `/sign-in` build as dynamic server-rendered routes |
| Manual browser verification | pass — unauthenticated redirect, sign-in, dashboard with live data, nine category tiles in the intended 4-column rhythm (474/231 px spans), computed `backdrop-filter: blur(24px) saturate(1.5)` on tiles and chrome, category accents and glass shadows in both themes, theme switch with no flash, settings, sign-out clearing the cookie, mobile layout at 390 px with 56 px touch targets and no horizontal overflow |

`pnpm db:migrate` was run against a fresh database: all ten migrations applied; the
consistency checks in `0010` rejected two genuine defects during development (missing RLS
on the migration bookkeeping table, and a policy-coverage rule that needed to distinguish
server-only tables) — both were fixed in code, not by weakening the check.

## Known limitations

- No Supabase sign-in screen in the web app, so `AUTH_MODE=supabase` is wired but not
  end-to-end usable from the UI yet.
- No Telegram adapter, no encryption format, no uploads, previews, sharing, versions UI,
  PWA or offline queue. The schema for them exists; the code does not.
- PGlite is a development/test driver: a single connection, not for production traffic.
  Production must set `DATABASE_URL`.
- No Playwright end-to-end suite, CI pipeline or container images in this milestone.
- Theme is per browser (cookie) until a settings endpoint exists.
- Milestone 1 rate limits are global; per-route policies for uploads arrive with uploads.

## Next milestone entry criteria (Milestone 2 — metadata and UI)

1. `GET/POST/PATCH/DELETE /api/v1/files`, `/api/v1/folders`, `/api/v1/tags`,
   `/api/v1/search` with schemas, pagination and owner-scoped queries.
2. File and folder CRUD, bulk actions, favorites, tags, sorting and filtering in the UI,
   with grid and list views.
3. Give the existing category tiles a real destination: `/files?category=…` browsing that
   reuses the same classification expression.
4. TanStack Query introduced for client-side server state, with cache invalidation instead
   of full-library refreshes.
5. Loading, refreshing, empty and permission-denied states for each new screen; tests for
   both allowed and denied operations on every new endpoint.
