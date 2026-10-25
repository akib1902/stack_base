-- 0007_shares_audit.sql
-- Share links, audit events, and the (optional) server-side offline queue.

create table public.shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_version_id uuid not null,
  token_hash text not null unique,
  permission text not null default 'read',
  expires_at timestamptz,
  max_downloads integer,
  download_count integer not null default 0,
  password_verifier text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint shares_permission_check check (permission in ('read')),
  constraint shares_download_count_nonnegative check (download_count >= 0),
  constraint shares_max_downloads_positive check (max_downloads is null or max_downloads > 0),
  constraint shares_download_count_within_limit check (
    max_downloads is null or download_count <= max_downloads
  ),
  constraint shares_expiry_after_creation check (
    expires_at is null or expires_at > created_at
  ),
  constraint shares_file_version_same_owner foreign key (user_id, file_version_id)
    references public.file_versions (user_id, id)
    on delete restrict
);

comment on table public.shares is
  'Revocable share of one immutable file version. Only token_hash is stored; the '
  'raw token lives with the recipient. Revocation cannot erase copies already '
  'downloaded. download_count must be incremented atomically.';

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  resource_type text,
  resource_id uuid,
  result text not null,
  event_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_result_check check (result in ('success', 'failure', 'denied')),
  constraint audit_events_metadata_object check (jsonb_typeof(event_metadata) = 'object'),
  constraint audit_events_event_type_length check (length(btrim(event_type)) between 1 and 120)
);

comment on table public.audit_events is
  'Append-only audit trail. Never stores raw tokens, passwords, plaintext content, '
  'encryption keys, or Telegram session strings.';

create table public.offline_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  operation_type text not null,
  resource_id uuid,
  payload jsonb not null,
  base_version text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offline_operations_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint offline_operations_status_check check (
    status in ('pending', 'applied', 'conflict', 'failed', 'discarded')
  )
);

comment on table public.offline_operations is
  'Optional in the MVP: IndexedDB is the initial offline queue. This table is '
  'introduced when a workflow needs server-side sync records.';

create trigger offline_operations_set_updated_at
before update on public.offline_operations
for each row execute function public.set_updated_at();
