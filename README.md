# StackBase

A self-hostable personal cloud drive. Metadata lives in PostgreSQL (Supabase-compatible),
encrypted payloads are meant to live in **your own** Telegram Saved Messages, and
files are encrypted in the browser so the server never sees plaintext.

The authoritative specification is [SRS & FDD.md](SRS%20%26%20FDD.md).

> **Status: Milestone 4 — upload reliability and previews.** Authentication,
> owner-scoped authorization, the full database schema with row-level security, the
> metadata library, the `stackbase/1` client-side encryption format, provider-neutral
> storage (local filesystem + Telegram MTProto), chunked encrypted uploads with
> immutable versions, browser-side download/decryption, a durable queue that survives a
> page refresh (pause/resume/retry with backoff and source-file reselection),
> image/video/audio/PDF previews decrypted in the tab, and storage insights are
> implemented and tested. Sharing, versions UI, offline/PWA and the Supabase sign-in
> screen are **not** implemented yet; the UI never pretends otherwise. See the
> [Milestone 4 report](docs/reports/milestone-4.md) and the
> [encryption format](docs/architecture/encryption-format.md).

---

## Requirements

- Node.js **20.19+** (developed on 24.x) and pnpm 9+
- No Docker, Telegram account or Supabase project is required for local development

## Quick start

```bash
pnpm install

# 1. Configure the API (generates a local development signing secret)
cp apps/api/.env.example apps/api/.env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
#   → paste the value into DEV_AUTH_SECRET

# 2. Configure the web app
cp apps/web/.env.example apps/web/.env.local

# 3. Run the two services (separate terminals)
pnpm dev:api     # http://127.0.0.1:8787  (creates + migrates the local database on boot)
pnpm dev:web     # http://localhost:3000
```

Open <http://localhost:3000>, sign in with any email address, and the dashboard loads
your real metadata (zero files, no storage connection) — no sample data.

Local development uses **PGlite**, a real PostgreSQL engine compiled to WebAssembly,
persisted at `apps/api/.data/pglite`. No credentials, no container. Production sets
`DATABASE_URL` and uses the `pg` driver, so the same SQL, constraints and policies run
in both places.

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev:api` | Fastify API with watch mode (migrates the local database on boot) |
| `pnpm dev:web` | Next.js web app on port 3000 |
| `pnpm build` | Production build of the web app |
| `pnpm typecheck` | TypeScript across every workspace package |
| `pnpm test` | Vitest: API authorization, database RLS isolation, web components |
| `pnpm db:migrate` | Apply pending migrations (`apps/api`) |
| `pnpm db:reset` | Recreate the local PGlite database from migrations |
| `pnpm seed` | Development fixtures (metadata only, refused in production) |
| `pnpm storage:verify` | Re-hash every stored object; report and mark missing copies |

## Layout

```text
apps/
  api/                 Fastify + TypeScript API
    src/config/        validated environment configuration
    src/database/      driver-agnostic database layer, migration runner
    src/modules/       health, me, setup, library, tags, search, vault, storage, uploads
    src/security/      token verification (dev + Supabase), identity derivation
    src/storage/       provider registry, local + Telegram backends, session sealing
    test/              authorization, RLS, storage, uploads and vault suites
  web/                 Next.js App Router
    src/app/           routes: (auth)/sign-in, (app)/home, settings, /api/* proxies
    src/components/    layout, ui, dashboard, library, feedback components
    src/features/      auth, library, settings, setup, encryption, uploads features
    src/lib/           API client, crypto (vault + file format), session, theme
    test/              crypto vectors, file format, upload pipeline suites
packages/
  contracts/           TypeBox schemas shared by API and web
supabase/
  migrations/          0001–0012 schema, constraints, indexes, RLS, checks
  local/               local-only auth stub (never apply to Supabase)
docs/                  setup, architecture, decisions and milestone reports
```

## Security model (what exists today)

- **Identity comes only from a verified token.** The API reads the subject from a
  signature-verified JWT; no endpoint accepts a user id from the client. Tokens signed
  with a non end-user role (`service_role`) are rejected.
- **Ownership is part of the schema.** Every user-owned table carries `user_id`, and
  relationships use composite foreign keys `(user_id, …)` so a row can never point at
  another owner's data.
- **Row-level security is enabled on every table**, with `auth.uid()` policies for
  user-facing tables and **no grants at all** for internal tables (storage connections,
  storage objects, upload jobs, upload chunks). `anon` has zero privileges.
- **Migration 0010 fails the build** if RLS is missing, if `anon` gains privileges, or
  if a table reachable by `authenticated` has no policy.
- **Sessions stay out of JavaScript.** The web app stores the access token in an
  httpOnly cookie and attaches it server-side; API responses are `no-store`. The browser
  reaches the API only through this app's own Next route handlers (ADR-017).
- **Plaintext never reaches the server.** Files are encrypted in the browser with
  `stackbase/1` (Argon2id-wrapped vault key, per-version data key, XChaCha20-Poly1305
  secretstream). The API stores ciphertext, wrapped keys, parameters and hashes, and
  verifies per-chunk checksums plus the full-stream SHA-256 before creating a version.
- **Telegram session material is never exposed** by any endpoint: the MTProto session is
  sealed with AES-256-GCM under `SESSION_ENCRYPTION_KEY` before it is stored, and pending
  logins live in memory only.

## Documentation

- [Local development and Supabase deployment](docs/setup/local-development.md)
- [Encryption format `stackbase/1`](docs/architecture/encryption-format.md)
- [Architecture decisions and documented deviations](docs/architecture/decisions.md)
- [Milestone 4 report](docs/reports/milestone-4.md)
- [Milestone 3 report](docs/reports/milestone-3.md)
- [Milestone 1 report](docs/reports/milestone-1.md)

## License

See [LICENSE](LICENSE).
