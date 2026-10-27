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
| `STORAGE_PROVIDER` | `local` | `local` (filesystem, development only) or `telegram` |
| `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` | — | Required when `STORAGE_PROVIDER=telegram`; from <https://my.telegram.org> |
| `SESSION_ENCRYPTION_KEY` | — | 32 bytes base64 (`openssl rand -base64 32`); seals the stored Telegram session |
| `MAX_UPLOAD_BYTES` | `17179869184` | 1 GiB–16 GiB, single-file upload cap |
| `MAX_ACTIVE_UPLOADS` | `4` | Unfinished upload jobs allowed per user (1–32) |
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
- `apps/api/test/storage-*.test.ts`, `telegram-provider.test.ts`, `uploads.test.ts`,
  `uploads-queue.test.ts`, `insights.test.ts`, `encryption-vault.test.ts` — provider
  contract, session sealing, the full chunked upload pipeline (checksums, resume,
  finalize, version immutability), the durable queue state machine (list, pause,
  resume, retry, stale sweep), storage insights and vault records
- `apps/web/test/crypto-vectors.test.ts` — the pinned `stackbase/1` vectors
- `apps/web/test/crypto-file-format.test.ts` — layout, round-trip and authenticity
- `apps/web/test/upload-pipeline.test.ts` — encrypt → create → stream → finalize,
  resume, cancellation, pause and failure handling against a fake transport
- `apps/web/test/preview-kind.test.ts` — which file types ever get an inline preview

Tests need no external services: each API suite starts an in-memory PostgreSQL, applies
every migration, and disposes of it afterwards.

## 6. Encrypted uploads

Everything runs in the browser; the API only ever sees ciphertext.

1. **Vault (once per account).** Open Settings → *Encryption and recovery* and create a
   vault: the browser derives an Argon2id key from your passphrase, wraps a random vault
   key and stores only parameters plus ciphertext (`GET`/`POST /api/v1/encryption/vault`).
   The passphrase and the key never leave the page; reloading locks the vault again.
2. **Storage.** With `STORAGE_PROVIDER=local` (the default) ciphertext is written under
   `apps/api/.data/objects/`. To use your own Telegram account, set
   `STORAGE_PROVIDER=telegram`, `TELEGRAM_API_ID`, `TELEGRAM_API_HASH` and
   `SESSION_ENCRYPTION_KEY`, restart the API, then link the account from Settings
   (phone → code → optional two-step password). The MTProto session is sealed before it
   is stored and is never returned by an endpoint.
3. **Upload.** *Upload* in the library header, or drop a file onto the library. The
   browser unlocks the vault (if locked), encrypts chunk by chunk, creates an upload job,
   streams the chunks with per-chunk SHA-256 checksums and declares the two stream hashes
   at finalize. The queue panel reports per-file progress; *Pause* keeps every stored
   chunk, *Resume* continues, and *Retry* resumes a failed job with exponential backoff.
4. **Interrupted uploads.** The queue is durable server-side: refresh the page (or close
   the tab mid-transfer) and the unfinished job reappears in the panel as *Choose file*.
   After two minutes of silence the API itself marks the job `needs_source_file`. Pick
   the original file again — the browser recomputes its SHA-256 fingerprint and refuses
   a different one — and the upload continues from the chunks that already arrived.
   To watch it happen quickly, start an upload of a multi-megabyte file and refresh as
   soon as the first chunks show as stored.
5. **Preview.** Opening a file's details decrypts images, video, audio and PDFs in the
   tab (up to 64 MB) and renders them from an object URL that is revoked on close; the
   server never sees the plaintext and never serves preview bytes.
6. **Storage insights.** *Storage insights* in the sidebar aggregates your own rows:
   category distribution, largest files and folders, duplicate candidates (detected from
   the client-declared plaintext fingerprint) and what Trash and superseded versions hold.
7. **Download.** *Download & decrypt* in a file's details fetches the ciphertext stream,
   verifies every chunk and the recorded SHA-256, decrypts locally and then saves the file.
8. **Verify the stored copy** (optional, operator-side):

   ```bash
   pnpm storage:verify --email you@example.com   # or --user <uuid>
   ```

   It re-hashes every stored object, reports missing or size-mismatched ones and marks
   them `missing` for reconciliation. `--dry-run` only reports.

Drop `pnpm seed` in for development fixtures (metadata only — real files come from the
upload pipeline).

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
| Upload fails with `TELEGRAM_NOT_CONFIGURED` (503) | `STORAGE_PROVIDER=telegram` without `TELEGRAM_API_ID`/`TELEGRAM_API_HASH`/`SESSION_ENCRYPTION_KEY` |
| Upload fails with `STORAGE_DISCONNECTED` (409) | Link the Telegram account from Settings, or switch back to `STORAGE_PROVIDER=local` |
| Settings shows *Development storage* | That is the local filesystem provider working as intended outside production |
| Download fails with a decryption error | The stored ciphertext does not match its manifest; run `pnpm storage:verify` and re-upload |
| `db:reset` refuses to run | `DATABASE_URL` is set; drop and recreate that database deliberately instead |
