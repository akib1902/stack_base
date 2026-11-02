# Owner-managed deployment integrations

**Date:** 2 November 2026  
**Status:** complete for the implemented scope. Owner-only Supabase Auth verification settings and Telegram MTProto application credentials can be viewed (without secrets), changed, cleared and applied from the web UI.

## Scope

This adds a database-backed integration settings surface to the existing web app. It does
not replace the environment configuration: env values remain the baseline and fallback,
and the most dangerous settings stay environment-only.

Editable by the owner:

- Supabase project URL.
- Supabase publishable/anon key (write-only from the UI).
- Supabase legacy JWT secret (write-only).
- Supabase JWKS URL.
- Telegram API ID.
- Telegram API hash (write-only).
- Active storage provider (`local` or `telegram`).

Deliberately not editable:

- `DATABASE_URL` — needed before the API can read the database row that would contain it;
  changing the connection at runtime would require a pool/driver restart.
- `AUTH_MODE` — switching it from a form can invalidate every current session before the
  matching Supabase sign-in path is ready.
- `SESSION_ENCRYPTION_KEY` — it opens every stored Telegram session and requires a
  migration/reconnect procedure, not a credential edit.
- Supabase `service_role` key — this API does not use it, and storing it would add a
  row-level-security bypass without adding a capability.

## Owner access

Migration `0014_deployment_settings.sql` adds `profiles.is_admin` and a unique partial
index permitting exactly one owner. The first profile in an existing database is promoted;
new databases bootstrap the first auth user in the same trigger that provisions profiles and
settings. A fallback in `getMe` handles identities that predate the profile trigger.

`profiles` insert/update grants are revoked from `authenticated`, leaving select only, so a
Supabase client cannot promote itself by writing its own row. The owner check is not a JWT
claim: `requireAdmin` reads `profiles.is_admin` from the database on every admin request.

The web app renders a **Deployment** link and Settings card only when `/me` reports
`isAdmin: true`. A direct visit by another account becomes a 404; the API returns
`403 FORBIDDEN`.

## Storage and API

`deployment_settings` is a singleton row with:

- `supabase_url`, `supabase_jwks_url` in plaintext (public identifiers);
- `supabase_publishable_key_sealed`, `supabase_jwt_secret_sealed`,
  `telegram_api_hash_sealed` as AES-256-GCM ciphertext under
  `SETTINGS_ENCRYPTION_KEY` (`v1.<nonce>.<ciphertext+tag>`);
- `storage_provider`, `telegram_api_id`, `updated_by`, `updated_at`.

The table has RLS enabled, no policies and no grants to `anon` or `authenticated`; migration
0014 verifies that absence at apply time.

Endpoints:

| Method | Path | Behavior |
|---|---|---|
| `GET` | `/api/v1/admin/deployment` | Sanitized status: public identifiers, presence flags, provider, limits, update metadata. No secret value. |
| `PUT` | `/api/v1/admin/deployment` | Omitted fields are unchanged; `null` clears a saved value. Validates URL scheme, length, Telegram ID/hash, provider and Supabase completeness before writing. Returns the sanitized status. |

The browser reaches these through `GET/PUT /api/deployment`. PUT additionally requires a
same-origin `Origin` header, on top of the httpOnly session cookie and the database owner
check.

Changes are applied to the running API's config. Supabase Auth changes rebuild the dynamic
token verifier on the next request; Telegram ID/hash and provider changes are read by the
next storage operation. Env values remain the fallback when a saved override is cleared or
cannot be decrypted. Multi-process deployments must restart the other API instances to see a
change.

## Changed files

- `supabase/migrations/0014_deployment_settings.sql` (new).
- `packages/contracts/src/deployment.ts` (new), `index.ts`, `auth.ts`, `errors.ts`.
- `apps/api/src/security/secret-box.ts` (new).
- `apps/api/src/modules/deployment/{repository,routes}.ts` (new).
- `apps/api/src/app.ts`, `config/env.ts`, `modules/me/repository.ts`,
  `modules/setup/routes.ts`, `security/token.ts`, `types/fastify.d.ts`.
- `apps/api/test/deployment-settings.test.ts` (new), `rls.test.ts`,
  `security-sweep.test.ts`.
- `apps/web/src/app/(app)/settings/deployment/page.tsx` (new),
  `apps/web/src/features/settings/deployment-settings-form.tsx` (new),
  `apps/web/src/app/api/deployment/route.ts` (new),
  `apps/(app)/layout.tsx`, `settings/page.tsx`, `components/layout/{AppShell,Sidebar,NavLinks}.tsx`.
- Documentation: `README.md`, `docs/setup/local-development.md`,
  `docs/architecture/decisions.md` (ADR-019), this report.

## Verification

| Check | Result |
|---|---|
| `pnpm -r typecheck` | pass — contracts, API, web |
| `pnpm --filter @stackbase/api test` | pass — **20 files / 187 tests** |
| `apps/api/test/deployment-settings.test.ts` | **11/11** — owner bootstrap, non-owner 401/403, sanitized GET, sealed DB values, apply-to-config, clear, bad hash, missing settings key, and Supabase project-rotation guards |
| `apps/api/test/auth-supabase.test.ts` | **7/7** — mode discovery, password exchange, sanitized provider errors, refresh, missing key, sign-out revocation, saved-key application |
| `apps/api/test/rls.test.ts` | **16/16** — includes a direct attempt by an authenticated account to promote itself (permission denied) |
| `apps/api/test/security-sweep.test.ts` | **16/16** — the new admin routes are in the anonymous-401 sweep |
| `pnpm --filter @stackbase/web test` | pass — 14 files / 103 tests |
| `apps/web/test/auth-token.test.ts` | **3/3** — access-token expiry/refresh leeway |
| `pnpm --filter @stackbase/web build` | pass — `/settings/deployment`, `/api/deployment` and the auth Proxy built |
| `git diff --check` | pass |

No real Supabase project or Telegram account was used. The persistence, access-control,
disclosure and runtime-application paths are covered with in-memory PostgreSQL and fake
provider boundaries; external network verification remains an operator step.

## Security notes

- Secret fields are never fetched into the browser. The form starts blank with a
  "configured" marker; blank means keep, explicit remove means clear.
- Tests assert the stored columns are `v1.` ciphertext, do not contain the submitted
  plaintext, and that the response body and audit metadata do not contain any submitted
  secret.
- Secrets are not included in error messages or audit metadata; validation messages name
  fields only.
- Changing the Supabase project URL in `AUTH_MODE=supabase` requires a new JWT secret or
  JWKS URL in the same request; saved material from the old project must be replaced or
  explicitly removed, so old keys cannot silently verify tokens for the new project.
- A saved JWKS URL suppresses a legacy environment JWT secret, so an operator can migrate
  from HS256 to JWKS without editing the environment.
- The settings key is held only in the API environment; losing it makes saved overrides
  unreadable and the API falls back to env values.

## Remaining limitations

1. **Supabase web sign-in is email/password only and has not been live-tested.**
   `AUTH_MODE` remains environment-only. The web server exchanges credentials with
   Supabase and keeps access/refresh tokens in httpOnly cookies; magic-link, OAuth and MFA
   UI are not implemented, and no real Supabase project was available here.
2. **Database URL and service_role are not UI-managed.** This is intentional and documented
   on the page; adding them would require a separate bootstrap secret store and a much
   broader threat model.
3. **Multi-process propagation is restart-based.** Only the process that served the PUT
   applies the change immediately.
4. **One owner, no ownership transfer UI.** The first profile is the owner; changing that
   requires a database operation. A deleted owner allows the next account to bootstrap.
5. **No KMS/HSM integration.** `SETTINGS_ENCRYPTION_KEY` is a local server secret, not a
   managed key service; database and key backups must be handled separately.
6. **No live provider validation.** No real Supabase project or Telegram login was available
   in this environment. The form deliberately avoids a network "test" button, so validation
   is format/completeness-level plus the existing API token/storage tests.
7. **No browser click-through in this pass.** The page compiled and the production build
   includes it, but rendering was not visually exercised here.
