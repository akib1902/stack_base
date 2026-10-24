# Development and Operations Runbook

## 1. Local development

1.  Install a supported Node.js LTS version and pnpm.
2.  Clone the repository and install dependencies.
3.  Copy `.env.example` to a local ignored environment file.
4.  Configure Supabase project URL and public client key for the web
    app.
5.  Configure server-only database access and Telegram API credentials
    in the API environment.
6.  Run database migrations against a development project.
7.  Start the API and web app.
8.  Confirm health/readiness endpoints and run tests.

Never place Telegram session material or privileged database secrets in
`NEXT_PUBLIC_*` variables or browser bundles.

## 2. Suggested environment variable names

-   `NODE_ENV`
-   `API_PORT`
-   `WEB_ORIGIN`
-   `SUPABASE_URL`
-   `SUPABASE_ANON_KEY`
-   `SUPABASE_SERVICE_ROLE_KEY` (server only; avoid if the chosen access
    model does not require it)
-   `TELEGRAM_API_ID`
-   `TELEGRAM_API_HASH`
-   `TELEGRAM_SESSION_SECRET_REF` or a secure session-volume path
-   `MAX_FILE_SIZE_BYTES`
-   `MAX_PART_SIZE_BYTES`
-   `UPLOAD_SESSION_TTL_SECONDS`
-   `TRASH_RETENTION_DAYS`
-   `LOG_LEVEL`

Do not commit real values. Validate environment variables at process
startup.

## 3. Operational checks

Monitor: - Upload success/failure ratio. - Retry count and retry
exhaustion. - Age of oldest pending upload/job. - Missing or
unverifiable storage objects. - Provider authentication failures. -
Finalization failures. - Cleanup failures. - Database connection errors.

Do not log raw tokens, session strings, keys, file content or full
secret-bearing URLs.

## 4. Provider outage

1.  Stop retry storms by applying bounded backoff and concurrency
    limits.
2.  Preserve upload sessions and part state.
3.  Mark affected operations as retryable, not completed.
4.  Alert if the outage exceeds the defined threshold.
5.  After recovery, reconcile provider objects before resuming
    finalization.
6.  Confirm that no referenced object was deleted during the outage.

## 5. Telegram session compromise

1.  Disable storage operations.
2.  Revoke/re-authenticate the affected Telegram session using the
    supported procedure.
3.  Rotate exposed credentials where applicable.
4.  Review audit and provider activity.
5.  Verify object references and known file availability.
6.  Resume only after the session and access path are trusted.

## 6. Database restore

1.  Restore to an isolated environment.
2.  Apply/verify migrations and constraints.
3.  Reconcile stored object references against Telegram.
4.  Restore account-key recovery material through the documented secure
    process.
5.  Retrieve and decrypt a known test file.
6.  Only then promote the restored environment.

## 7. Key loss

If all valid key copies and recovery material are lost, encrypted
content may be unrecoverable. Do not promise administrator-assisted
decryption. Follow the documented recovery mechanism and explain the
result accurately.
