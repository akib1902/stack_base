# Security and Threat Model

## 1. Security objectives

-   Keep file contents confidential from Telegram and the application
    server.
-   Prevent unauthorized access to files, versions and shares.
-   Detect corruption or missing parts.
-   Protect Telegram session material and application secrets.
-   Provide a tested recovery path for encrypted data.
-   Prevent cleanup and retry logic from causing silent data loss.

## 2. Trust boundaries

-   Browser: handles plaintext and encryption keys; potentially exposed
    to XSS, malicious extensions or a compromised device.
-   Fastify API: trusted for authorization and orchestration, not
    trusted with plaintext file keys.
-   PostgreSQL: stores server-readable metadata and encrypted
    key/manifest material.
-   Telegram: stores ciphertext but may expose access patterns, sizes
    and identifiers.
-   Share recipient: receives limited access but can retain downloaded
    plaintext.

## 3. Threats and controls

-   **Cross-user/IDOR access:** owner derived from validated auth token;
    owner-scoped queries; RLS; negative authorization tests.
-   **Database leak:** client-side encryption; minimal secrets; metadata
    exposure explicitly documented.
-   **Telegram session theft:** dedicated account/session; secret
    manager or tightly permissioned persistent volume;
    rotation/re-authentication procedure.
-   **Malicious JavaScript/XSS:** strict CSP, output escaping,
    dependency controls, avoid unsafe HTML, no secrets in local storage.
-   **Share-token theft:** high-entropy random tokens, store hashes,
    expiry/revocation, rate limiting, avoid logging tokens.
-   **Corrupted chunks:** hashes, authenticated encryption,
    authenticated manifest and full reconstruction verification.
-   **Lost key:** documented recovery material and tested restore
    procedure; no promise of recovery without keys.
-   **Unsafe cleanup:** reference checks, safety delay, idempotent
    deletion jobs and audit events.
-   **Worker duplication:** leases, idempotent handlers and
    state-transition guards.
-   **Provider outage:** pause/retry safely, preserve metadata and
    state, alert on prolonged failures.

## 4. Encryption requirements

-   Use a vetted cryptographic library and authenticated encryption.
-   Generate keys and nonces using a cryptographically secure random
    generator.
-   Specify unique nonce handling for every encryption operation under a
    key.
-   Authenticate relevant metadata and chunk ordering.
-   Use a versioned manifest format and include format/version
    identifiers in authenticated data.
-   Use random per-version DEKs and wrap them with a client-controlled
    account key.
-   If using a passphrase, derive a wrapping key with a suitable
    password KDF and unique salt.
-   Do not implement a custom cryptographic construction without
    independent review.
-   Do not store plaintext keys, passphrases or recovery secrets on the
    server.

## 5. Metadata privacy

The chosen model allows the server to read names, tags, sizes, dates,
folder hierarchy and relationships. These may reveal sensitive
information. Do not describe the system as fully metadata-private E2EE.

Plaintext content hashes can reveal equality and enable confirmation
attacks against guessed files. Prefer client-side duplicate detection or
document the leakage before storing plaintext hashes server-side.

## 6. Share design

-   Generate a random high-entropy bearer token.
-   Store only a token hash.
-   Enforce expiration, revocation and download count on every request.
-   Use atomic updates for limits.
-   Keep decryption secrets out of normal HTTP requests and logs.
-   A URL fragment may carry client-side key material, but XSS,
    extensions and device compromise remain risks.
-   Explain that revocation cannot erase copies already downloaded by
    recipients.

## 7. Operational security

-   HTTPS only.
-   Strict CORS allowlist and CSP.
-   Rate limits for login-sensitive and share endpoints.
-   Redact credentials, cookies, tokens, keys and file contents from
    logs.
-   Pin and regularly update dependencies.
-   Use separate development and production credentials.
-   Keep privileged Supabase credentials server-only.
-   Audit destructive actions.
-   Monitor failed jobs, missing objects and repeated provider errors.

## 8. Recovery requirements

-   Back up PostgreSQL metadata and migrations.
-   Document Telegram session recovery/re-authentication.
-   Preserve account-key recovery material securely.
-   Test restoration of an old version and decryption in an isolated
    environment.
-   Treat loss of all valid decryption keys as potential permanent data
    loss.
