-- 0002_storage_connections.sql
-- Telegram (or future provider) connection metadata per user.
-- Session material is stored as authenticated ciphertext; it is never selected
-- by client-facing queries and no grants are issued to client roles.

create table public.storage_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'telegram',
  connection_status text not null default 'pending',
  account_identifier text,
  encrypted_session bytea,
  session_key_version text,
  last_validated_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint storage_connections_provider_check check (provider in ('telegram')),
  constraint storage_connections_status_check check (
    connection_status in ('pending', 'connected', 'error', 'expired', 'disconnected')
  ),
  -- Required by ownership-aware foreign keys from dependent tables.
  constraint storage_connections_user_id_unique unique (user_id, id),
  -- Product policy: one active connection per storage provider per user.
  constraint storage_connections_user_provider_unique unique (user_id, provider),
  constraint storage_connections_session_key_version_check check (
    (encrypted_session is null and session_key_version is null)
    or (encrypted_session is not null and session_key_version is not null)
  )
);

comment on table public.storage_connections is
  'Provider connection metadata. encrypted_session is authenticated ciphertext '
  'under a deployment-managed key (session_key_version identifies the key).';
comment on column public.storage_connections.encrypted_session is
  'Authenticated-encrypted MTProto session bytes. Never exposed through any API.';

create trigger storage_connections_set_updated_at
before update on public.storage_connections
for each row execute function public.set_updated_at();
