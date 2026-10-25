# Architecture decisions

Decisions taken while implementing Milestone 1, with the deviations from the SRS/FDD
documented explicitly (SRS final rule 14). Each record states the context, the decision
and the consequences.

---

## ADR-001 — Two database drivers: PGlite locally, `pg` for PostgreSQL/Supabase

**Context.** The spec mandates Supabase PostgreSQL. Local development should not require
Docker, a cloud project or credentials, and the RLS policies are only meaningful when
exercised against a real PostgreSQL engine.

**Decision.** All code talks to a small `Db` interface (`src/database/db.ts`):

- `DATABASE_URL` empty ⇒ **PGlite** (PostgreSQL 17 compiled to WebAssembly) persisted at
  `apps/api/.data/pglite`.
- `DATABASE_URL` set ⇒ **`pg`** pool, for PostgreSQL or Supabase.

Migrations, constraints, triggers and policies are identical in both.

**Consequences.** Local development and the whole test suite run with one command and no
external service. PGlite is a single connection, so it is a development and test driver,
not a production one; concurrent production traffic must set `DATABASE_URL`. Query text
uses `$1` placeholders and no driver-specific extensions, so behavior matches.

---

## ADR-002 — Two auth modes, with dev sessions structurally impossible in production

**Context.** The spec fixes Supabase Auth. There is no Supabase project yet, but
authorization must be testable today and must never be weakened later.

**Decision.** `AUTH_MODE` selects the verifier:

- `dev` — HS256 tokens signed with `DEV_AUTH_SECRET`, issued by
  `POST /api/v1/dev/session`, issuer `stackbase-dev`, audience `stackbase-api`.
- `supabase` — verify access tokens from issuer `<SUPABASE_URL>/auth/v1`, audience
  `authenticated`, via remote JWKS or a legacy HS256 secret.

`AUTH_MODE=dev` is rejected outright when `NODE_ENV=production`, and the dev-session
route is additionally not registered for production builds (asserted by a test).

Both modes reject tokens whose `role` claim is anything but `authenticated` (so a
Supabase `service_role` token can never act as an end user) and reject subjects that are
not UUIDs. Identity is always the token subject.

**Consequences.** Deployment requires a Supabase sign-in screen in the web app before
`AUTH_MODE=supabase` is usable end to end; that is a later milestone. Until then the
supported self-hosted path is the documented local mode.

---

## ADR-003 — Ownership-aware schema plus RLS as defense in depth

**Context.** "Do not trust a user ID supplied by the frontend" and "test both allowed and
denied operations" are hard requirements.

**Decision.**

1. Every user-owned table has `user_id`, and every relationship uses a composite foreign
   key `(user_id, other_id)`, so cross-owner references fail at the constraint level.
2. RLS is enabled on every table. User-facing tables get `auth.uid() = user_id` policies
   for the `authenticated` role; `anon` is revoked everywhere.
3. Internal tables — `storage_connections`, `storage_objects`, `upload_jobs`,
   `upload_chunks` — are **server-only**: RLS on, no policy, no grant. Only the API's
   owner-scoped queries reach them.
4. `file_versions` rows are immutable (trigger), `current_version_id` must reference a
   version of the same file and owner (trigger), folder cycles are rejected (trigger).
5. Migration `0010` re-verifies RLS coverage, `anon` privileges and policy presence on
   every migrate run, so the checks cannot silently rot.

**Consequences.** The API does not rely on RLS (it queries with server credentials and
explicit owner filters), but a mistake in a query still cannot leak another tenant's rows
through a client role. `audit_events` is readable by its owner and writable only by the
server.

---

## ADR-004 — Identity rows are provisioned by a trigger, defensively re-checked

**Decision.** A trigger on `auth.users` inserts the matching `profiles` and
`user_settings` rows on sign-up. `GET /api/v1/me` also performs an idempotent
`insert … on conflict do nothing` for both tables if they are missing.

**Consequences.** No authenticated request can observe a half-provisioned account, and a
Supabase project that already contains users (before these migrations) heals on first
request instead of erroring.

---

## ADR-005 — Theme preference is a cookie until the settings API exists

**Context.** SRS B2 stores `theme` in `user_settings`; A10 defines no settings update
endpoint. Adding an unplanned endpoint would contradict the API contract.

**Decision.** The interface theme is stored in an httpOnly cookie (`stackbase_theme`) and
applied in the root layout, so there is no flash of the wrong theme. The `user_settings.theme`
column remains the account-level default and is rendered read-only on the settings page.

**Consequences.** Theme does not follow a user across browsers yet. When the settings
endpoints land, the cookie becomes a cache in front of the account value.

---

## ADR-006 — Web session handling: httpOnly cookie, server-side API calls

**Context.** The browser must never hold provider credentials, and the current milestone
has no Supabase client to manage sessions.

**Decision.** The web app keeps the access token in an httpOnly, SameSite=Lax cookie and
attaches it server-side in `lib/api/client.ts`. Server components and server actions call
the API directly; no token is embedded in the client bundle or in local storage.

**Consequences.** When Supabase Auth UI ships, this becomes the standard Supabase SSR
cookie session (`@supabase/ssr`) with refresh handling; the API client boundary stays the
same. The API also sets `cache-control: no-store` on every response.

---

## ADR-007 — Error envelope and codes

**Decision.** Every error response is `{ "error": { "code", "message", "details?" } }`
using the SRS A11 codes. Three additional stable codes are used where A11's non-exhaustive
list has no equivalent: `ROUTE_NOT_FOUND` (404), `RATE_LIMITED` (429) and `INTERNAL_ERROR`
(500). Validation failures return `VALIDATION_ERROR` with field paths; database outages map
to `DATABASE_UNAVAILABLE` (503). Stack traces and provider details are never returned.

---

## ADR-008 — RLS tests live with the API suite, not in `supabase/tests`

**Context.** The FDD sketch places database tests in `supabase/tests`. They need the
migration runner, the driver and the test harness, all of which belong to `apps/api`.

**Decision.** `apps/api/test/rls.test.ts` holds the database authorization tests; it reads
`supabase/migrations` directly. `supabase/` stays a pure SQL directory with no Node package.

**Consequences.** One test command, one harness, no duplicated driver setup. The RLS tests
run as the real `authenticated` role with `request.jwt.claims` set the way Supabase does,
so they exercise the policies rather than the API's SQL.

---

## ADR-009 — No client state library yet

**Context.** The FDD prescribes TanStack Query for server state and limited Zustand for
shared UI state. Milestone 1 has no client-side data fetching: every screen is rendered on
the server.

**Decision.** Neither library is installed. Server state is fetched in server components;
interaction state (form pending/error) uses `useActionState`.

**Consequences.** The dependencies arrive with file browsing (Milestone 2), where they are
actually needed; nothing in the current build is dead code.

---

## ADR-010 — `PORT=0` is treated as unset

**Context.** Some toolchains export `PORT=0`, which would bind an ephemeral port that the
web app cannot discover, or fail validation entirely.

**Decision.** `PORT=0` falls back to the documented default (`8787`); any other non-numeric
or out-of-range value is still a configuration error. The API logs the bound address at
startup.

---

## ADR-011 — Home categories are computed by one SQL expression

**Context.** The FDD requires Bento category cards (Images, Videos, Audio, Documents, APKs,
Archives, Downloads, Other) and states that every count must come from real backend data.
Categories could be derived in TypeScript, in SQL, or stored on the row.

**Decision.** `GET /api/v1/library/summary` returns all nine categories (empty ones as
explicit zeros, in a fixed order) using a single grouped query with a `case` expression
(`apps/api/src/modules/library/categories.ts`). Classification prefers `mime_type` and
falls back to the normalized `extension`; the expression is fixed SQL with only the owner
id parameterized.

**Consequences.** One rule for the dashboard and for later filtering, one round trip, no
per-file loop. Adding a category means changing the expression, the contract union and the
tile metadata together — the compiler and the API test catch a partial change. "Downloads"
is defined as transfer artifacts (`.iso`, `.img`, `.torrent`, `.part`, `.crdownload`, `.bin`)
rather than "anything downloaded", because the browser does not know a file's provenance.

---

## ADR-012 — Frosted surfaces via utility blur, motion as CSS only

**Context.** The FDD asks for Bento layout, selective glassmorphism and short, purposeful
microinteractions, with reduced-motion support and no motion that blocks interaction.

**Decision.** Glass is a composable pair: a `.glass` rule (gradient fill, rim light,
shadow) plus Tailwind `backdrop-blur-xl backdrop-saturate-150` utilities. The blur lives in
the utilities because the CSS minifier dropped `backdrop-filter` from the hand-written rule
— verified in the browser, not assumed. Motion is CSS: a 45 ms-staggered `reveal` entrance,
a 4 px hover lift with a specular sweep, a spring-eased icon chip and a press scale, all
disabled by the existing global `prefers-reduced-motion` block. No animation library, no
client JavaScript for presentation.

**Consequences.** Tiles stay server components and keep working without JavaScript. Hover
transforms are decorative only, so a missed hover never hides functionality. The category
tiles are informational `<article>` elements, not buttons or links, until the file browser
(Milestone 2) gives them a real destination — nothing is inert.

---

## Known gaps at Milestone 1 (deliberate)

- No Telegram MTProto adapter, session storage or `StorageProvider` implementation.
- No cryptographic format, vault key hierarchy or recovery flow; uploads are disabled.
- No upload jobs, chunk transfer or worker process (schema exists, code does not).
- No file/folder/tag/search routes; the schema is in place for Milestone 2. Only the
  read-only category aggregate exists, so tiles have no drill-down destination yet.
- No PWA manifest, service worker, offline queue or Playwright end-to-end suite.
- No Dockerfiles or CI pipeline.
