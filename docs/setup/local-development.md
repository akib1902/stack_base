# Local development and deployment setup

StackBase runs as two independently deployable services:

| Service | Directory | Default URL |
|---|---|---|
| Web (Next.js) | `apps/web` | http://localhost:3000 |
| API (Fastify) | `apps/api` | http://127.0.0.1:8787 |

## 1. Install

```bash
pnpm install
```

Requires Node.js 20.19+ and pnpm 9+.

## 2. API configuration

```bash
cp apps/api/.env.example apps/api/.env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Paste the generated value into `DEV_AUTH_SECRET` in `apps/api/.env`. Every variable is
validated at startup; the process refuses to boot with a clear list of problems.

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | `production` disables `AUTH_MODE=dev` |
| `HOST` / `PORT` | `127.0.0.1` / `8787` | `PORT=0` is treated as unset (documented default) |
| `WEB_ORIGIN` | `http://localhost:3000` | CORS allow-list |
| `AUTH_MODE` | `dev` | `dev` or `supabase` |
| `DEV_AUTH_SECRET` | — | Required for `AUTH_MODE=dev`, min 32 chars |
| `DEV_SESSION_TTL_SECONDS` | `86400` | 300–2592000 |
| `DATABASE_URL` | empty | Empty ⇒ local PGlite; set ⇒ PostgreSQL/Supabase |
| `STACKBASE_LOCAL_AUTH_STUB` | `0` | Only for a bare PostgreSQL without Supabase's auth schema |
| `LOG_LEVEL` | `info` | Pino level; authorization headers are redacted |

### Local database

With `DATABASE_URL` empty the API uses **PGlite** (PostgreSQL 17 compiled to WebAssembly)
persisted at `apps/api/.data/pglite`. On boot in development it applies pending migrations
and prints them. Reset with `pnpm db:reset`.

The local stub in `supabase/local/0000_local_auth_stub.sql` emulates only what the schema
and policies need: the `auth.users` table, `auth.uid()`, and the `anon` / `authenticated` /
`service_role` roles. **Never apply it to a Supabase project.**

### Migrations

```bash
pnpm db:migrate
```

Migrations apply in filename order inside a transaction and are recorded with a SHA-256
checksum. Editing an applied migration fails loudly — add a new migration instead.
`supabase/migrations/0010_rls_consistency_checks.sql` re-verifies RLS, grants and policy
coverage, so a clean migrate run is itself a test.

## 3. Web configuration

```bash
cp apps/web/.env.example apps/web/.env.local
```

`API_BASE_URL` is server-only. The browser never receives it, and never receives the
access token: the token is kept in an httpOnly cookie and attached by the Next.js server.

## 4. Run

```bash
pnpm dev:api
pnpm dev:web
```

Open http://localhost:3000 and sign in with any email address. In dev-auth mode the API
creates the identity, profile and settings rows, then issues a session token.

## 5. Tests

```bash
pnpm test          # API + web
pnpm typecheck     # all packages
pnpm build         # production web build
```

- `apps/api/test/auth.test.ts` — token validation, identity derivation, error envelope
- `apps/api/test/setup-status.test.ts` — owner-scoped status, no cross-user leakage
- `apps/api/test/rls.test.ts` — assumes the `authenticated` role and sets
  `request.jwt.claims` exactly as Supabase does, then proves cross-user access fails
- `apps/web/test/*` — formatting and dashboard component rendering

Tests need no external services: each API suite starts an in-memory PostgreSQL, applies
every migration, and disposes of it afterwards.

## Switching to Supabase

1. Create a Supabase project.
2. Apply this repository's migrations to it, in order, with the Supabase CLI:

   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```

   The migrations reference `auth.users` and `auth.uid()`, which a Supabase project
   already provides. Do **not** apply the local stub.

3. Set the API environment:

   ```env
   AUTH_MODE=supabase
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_JWKS_URL= # optional; defaults to <SUPABASE_URL>/auth/v1/.well-known/jwks.json
   SUPABASE_JWT_SECRET= # only for legacy HS256 signing keys
   DATABASE_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
   ```

   The API verifies Supabase access tokens (issuer `<SUPABASE_URL>/auth/v1`, audience
   `authenticated`) against the project's JWKS, or against the legacy JWT secret when one
   is configured. `POST /api/v1/dev/session` is not registered in this mode.

4. The web app needs a Supabase sign-in screen before it can be deployed. Until that
   ships (a later milestone), `AUTH_MODE=dev` is the supported local and self-hosted path.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Invalid configuration: DEV_AUTH_SECRET is required` | Paste the generated secret into `apps/api/.env` |
| Web shows "Something went wrong" | The API is not running: start `pnpm dev:api` |
| `Migration failed: schema "auth" does not exist` | You pointed `DATABASE_URL` at a bare PostgreSQL. Use Supabase, or set `STACKBASE_LOCAL_AUTH_STUB=1` knowingly |
| Sign-in returns 404 | The API runs with `AUTH_MODE=supabase` or `NODE_ENV=production`; dev sessions are disabled by design |
| `db:reset` refuses to run | `DATABASE_URL` is set; drop and recreate that database deliberately instead |
