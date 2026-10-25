-- 0009_rls_grants_policies.sql
-- Row-level security, least-privilege grants, and ownership policies.
--
-- Client roles (anon, authenticated) only reach user-facing tables. Internal
-- tables (storage connections, storage objects, upload jobs, upload chunks) are
-- server-only: RLS is enabled, no policy exists, and no grant is issued.

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.storage_connections enable row level security;
alter table public.folders enable row level security;
alter table public.files enable row level security;
alter table public.storage_objects enable row level security;
alter table public.file_versions enable row level security;
alter table public.tags enable row level security;
alter table public.file_tags enable row level security;
alter table public.upload_jobs enable row level security;
alter table public.upload_chunks enable row level security;
alter table public.shares enable row level security;
alter table public.audit_events enable row level security;
alter table public.offline_operations enable row level security;

-- Start from no client access at all.
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant usage on schema public to anon, authenticated;
grant usage on schema auth to authenticated;

-- Identity-adjacent tables.
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.user_settings to authenticated;

-- User-owned content tables.
grant select, insert, update, delete on public.folders to authenticated;
grant select, insert, update, delete on public.files to authenticated;
grant select, insert, delete on public.file_versions to authenticated;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, delete on public.file_tags to authenticated;
grant select, insert, update, delete on public.shares to authenticated;
grant select on public.audit_events to authenticated;
grant select, insert, update, delete on public.offline_operations to authenticated;

-- Server-only tables keep zero client grants. The API uses owner-scoped queries
-- with server-side credentials (RLS remains defense in depth).

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (auth.uid() = id);

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy user_settings_own on public.user_settings
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy folders_own on public.folders
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy files_own on public.files
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy file_versions_own on public.file_versions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy tags_own on public.tags
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy file_tags_own on public.file_tags
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy shares_own on public.shares
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy offline_operations_own on public.offline_operations
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Audit events are append-only from the server: users may read only their own.
create policy audit_events_select_own on public.audit_events
  for select to authenticated
  using (auth.uid() = user_id);
