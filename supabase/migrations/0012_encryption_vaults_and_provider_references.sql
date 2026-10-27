-- 0012_encryption_vaults_and_provider_references.sql
-- Milestone 3: passphrase-wrapped encryption vaults (ADR-014) and
-- provider-neutral storage references with a development provider (ADR-015).

-- ---------------------------------------------------------------------------
-- Encryption vaults
-- ---------------------------------------------------------------------------
-- Server-only, like storage_connections: RLS enabled, no client grants at all.
-- Every column is a non-secret parameter or ciphertext; the passphrase, the KEK
-- and the vault key itself never reach the server (docs/architecture/encryption-format.md).

create table public.encryption_vaults (
  user_id uuid primary key references auth.users (id) on delete cascade,
  format_version text not null,
  kdf_algorithm text not null,
  kdf_ops_limit integer not null,
  kdf_mem_limit_bytes bigint not null,
  kdf_salt text not null,
  wrap_algorithm text not null,
  wrapped_key_nonce text not null,
  wrapped_key_ciphertext text not null,
  verifier_nonce text not null,
  verifier_ciphertext text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint encryption_vaults_format_check check (format_version in ('stackbase/1')),
  constraint encryption_vaults_kdf_check check (kdf_algorithm in ('argon2id13')),
  constraint encryption_vaults_wrap_check check (wrap_algorithm in ('xsalsa20poly1305')),
  constraint encryption_vaults_ops_check check (kdf_ops_limit between 1 and 10),
  constraint encryption_vaults_mem_check check (
    kdf_mem_limit_bytes between 8388608 and 1073741824
  )
);

comment on table public.encryption_vaults is
  'One passphrase-wrapped vault key per user. Contains only KDF parameters, the '
  'wrapped vault key and the recovery verifier; nothing here can decrypt content '
  'without the user passphrase. Never replaced silently (409 on create).';

create trigger encryption_vaults_set_updated_at
before update on public.encryption_vaults
for each row execute function public.set_updated_at();

alter table public.encryption_vaults enable row level security;
revoke all on public.encryption_vaults from anon;
revoke all on public.encryption_vaults from authenticated;

-- ---------------------------------------------------------------------------
-- Provider-neutral storage references (ADR-015)
-- ---------------------------------------------------------------------------
-- storage_objects previously required Telegram references. Provider-specific
-- references now live in provider_reference (documented per provider); the
-- Telegram columns stay for Telegram rows and are enforced by a check so a
-- Telegram object can never be stored without its message reference.

alter table public.storage_objects
  drop constraint storage_objects_provider_check,
  drop constraint storage_objects_reference_unique,
  drop constraint storage_objects_media_reference_object;

alter table public.storage_objects
  alter column telegram_chat_reference drop not null,
  alter column telegram_message_reference drop not null;

alter table public.storage_objects
  add column provider_reference jsonb not null default '{}'::jsonb,
  add constraint storage_objects_provider_check check (provider in ('telegram', 'local')),
  add constraint storage_objects_provider_reference_object check (
    jsonb_typeof(provider_reference) = 'object'
  ),
  add constraint storage_objects_telegram_reference_required check (
    provider <> 'telegram'
    or (telegram_chat_reference is not null and telegram_message_reference is not null)
  ),
  add constraint storage_objects_media_reference_object check (
    telegram_media_reference is null
    or jsonb_typeof(telegram_media_reference) = 'object'
  ),
  -- One provider reference must never be attached twice for the same owner.
  add constraint storage_objects_provider_reference_unique unique (
    user_id, provider, provider_reference
  );

comment on column public.storage_objects.provider_reference is
  'Provider-facing reference. telegram: messageId, documentId, accessHash, '
  'fileReference, dcId, size, mimeType. local (development only): key, size.';

-- The local development provider needs its own connection row so upload
-- bookkeeping always has a real storage_connection_id.
alter table public.storage_connections
  drop constraint storage_connections_provider_check,
  add constraint storage_connections_provider_check check (provider in ('telegram', 'local'));

-- ---------------------------------------------------------------------------
-- Upload jobs keep their validated manifest
-- ---------------------------------------------------------------------------
-- Finalize re-verifies the assembled ciphertext against the manifest and copies
-- it onto the immutable file version; without it the hash check would be
-- impossible after a restart, because only the client can produce the manifest.

alter table public.upload_jobs
  add column manifest jsonb not null default '{}'::jsonb,
  add constraint upload_jobs_manifest_object check (jsonb_typeof(manifest) = 'object');

comment on column public.upload_jobs.manifest is
  'Validated stackbase/1 manifest supplied at job creation (ADR-013). Never '
  'contains key material that can decrypt content without the vault key.';
