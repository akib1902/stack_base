-- 0004_storage_objects_versions.sql
-- Provider references and immutable file versions.

create table public.storage_objects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_connection_id uuid not null,
  provider text not null default 'telegram',
  telegram_chat_reference text not null,
  telegram_message_reference text not null,
  telegram_media_reference jsonb,
  remote_size_bytes bigint,
  ciphertext_hash text,
  storage_status text not null default 'pending',
  created_at timestamptz not null default now(),
  last_verified_at timestamptz,
  constraint storage_objects_provider_check check (provider in ('telegram')),
  constraint storage_objects_status_check check (
    storage_status in ('pending', 'available', 'missing', 'deleted', 'reconciliation_required')
  ),
  constraint storage_objects_remote_size_nonnegative check (
    remote_size_bytes is null or remote_size_bytes >= 0
  ),
  constraint storage_objects_media_reference_object check (
    telegram_media_reference is null
    or jsonb_typeof(telegram_media_reference) = 'object'
  ),
  constraint storage_objects_user_id_unique unique (user_id, id),
  -- One provider message must never be attached twice for the same owner.
  constraint storage_objects_reference_unique unique (
    user_id, telegram_chat_reference, telegram_message_reference
  ),
  constraint storage_objects_connection_same_owner foreign key (user_id, storage_connection_id)
    references public.storage_connections (user_id, id)
    on delete restrict
);

comment on table public.storage_objects is
  'Provider-side object references. Rows are written only after the provider '
  'confirms the message; storage_status tracks reconciliation with Telegram.';

create table public.file_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_id uuid not null,
  version_number integer not null,
  size_bytes bigint not null,
  ciphertext_hash text not null,
  plaintext_fingerprint text,
  encryption_format_version text not null,
  encryption_manifest jsonb not null,
  storage_object_id uuid not null,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id),
  restored_from_version_id uuid,
  constraint file_versions_version_number_positive check (version_number > 0),
  constraint file_versions_size_nonnegative check (size_bytes >= 0),
  constraint file_versions_manifest_object check (jsonb_typeof(encryption_manifest) = 'object'),
  constraint file_versions_user_id_unique unique (user_id, id),
  constraint file_versions_file_version_unique unique (file_id, version_number),
  constraint file_versions_file_same_owner foreign key (user_id, file_id)
    references public.files (user_id, id)
    on delete cascade,
  constraint file_versions_storage_object_same_owner foreign key (user_id, storage_object_id)
    references public.storage_objects (user_id, id)
    on delete restrict,
  constraint file_versions_restored_from_same_owner foreign key (user_id, restored_from_version_id)
    references public.file_versions (user_id, id)
    on delete set null (restored_from_version_id)
);

comment on table public.file_versions is
  'Immutable encrypted version of a logical file. Content is never updated in place; '
  'restoring an old version appends a new version row.';

-- Version content is immutable: reject any update of a stored version.
create or replace function public.reject_file_version_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'file_versions rows are immutable; create a new version instead'
    using errcode = '23514';
end;
$$;

create trigger file_versions_immutable
before update on public.file_versions
for each row execute function public.reject_file_version_mutation();

-- Current-version pointer must reference a version that belongs to the same
-- file and the same owner.
create or replace function public.enforce_current_version_matches_file()
returns trigger
language plpgsql
as $$
begin
  if new.current_version_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.file_versions v
    where v.id = new.current_version_id
      and v.file_id = new.id
      and v.user_id = new.user_id
  ) then
    raise exception 'current_version_id must reference a version of the same file and owner'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

alter table public.files
  add constraint files_current_version_same_owner
  foreign key (user_id, current_version_id)
  references public.file_versions (user_id, id)
  on delete set null (current_version_id);

create trigger files_enforce_current_version
before insert or update of current_version_id on public.files
for each row execute function public.enforce_current_version_matches_file();
