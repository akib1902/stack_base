-- 0003_folders_files.sql
-- Logical folders and files. Ownership is part of every foreign key so a row
-- can never reference another user's parent folder.

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_folder_id uuid,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint folders_name_length check (length(btrim(name)) between 1 and 255),
  constraint folders_not_own_parent check (parent_folder_id is null or parent_folder_id <> id),
  constraint folders_user_id_unique unique (user_id, id),
  constraint folders_parent_same_owner foreign key (user_id, parent_folder_id)
    references public.folders (user_id, id)
    on delete restrict
);

comment on table public.folders is
  'Folder hierarchy. Deleting a folder row is restricted while children exist; '
  'user deletion is soft (deleted_at).';

-- Reject cycles (a folder may not be its own ancestor).
create or replace function public.enforce_folder_hierarchy()
returns trigger
language plpgsql
as $$
begin
  if new.parent_folder_id is null then
    return new;
  end if;

  if new.parent_folder_id = new.id then
    raise exception 'folder hierarchy cycle: folder cannot be its own parent'
      using errcode = '23514';
  end if;

  if exists (
    with recursive ancestors as (
      select f.id, f.parent_folder_id
      from public.folders f
      where f.id = new.parent_folder_id
      union all
      select f.id, f.parent_folder_id
      from public.folders f
      join ancestors a on f.id = a.parent_folder_id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'folder hierarchy cycle: parent is a descendant of folder'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger folders_enforce_hierarchy
before insert or update of parent_folder_id on public.folders
for each row execute function public.enforce_folder_hierarchy();

create trigger folders_set_updated_at
before update on public.folders
for each row execute function public.set_updated_at();

create table public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  folder_id uuid,
  name text not null,
  extension text,
  mime_type text not null,
  logical_size_bytes bigint not null default 0,
  current_version_id uuid,
  content_fingerprint text,
  favorite boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint files_name_length check (length(btrim(name)) between 1 and 255),
  constraint files_logical_size_nonnegative check (logical_size_bytes >= 0),
  constraint files_user_id_unique unique (user_id, id),
  constraint files_folder_same_owner foreign key (user_id, folder_id)
    references public.folders (user_id, id)
    on delete set null (folder_id)
);

comment on table public.files is
  'Logical file records. Physical payloads live in storage_objects via file_versions; '
  'deleting a metadata row never deletes remote provider content.';

create trigger files_set_updated_at
before update on public.files
for each row execute function public.set_updated_at();
