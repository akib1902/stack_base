-- 0001_profiles_settings.sql
-- Owner-scoped identity-adjacent tables: profiles and user settings.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Shared trigger function: stamps updated_at on row modification.';

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (
    display_name is null or length(btrim(display_name)) between 1 and 80
  )
);

comment on table public.profiles is
  'Public-facing profile of an authenticated user. Email is owned by auth.users.';

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'amber',
  default_view text not null default 'grid',
  default_sort text not null default 'updated_at',
  trash_retention_days integer not null default 30,
  offline_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_settings_theme_check check (theme in ('amber', 'graphite')),
  constraint user_settings_default_view_check check (default_view in ('grid', 'list')),
  constraint user_settings_default_sort_check check (
    default_sort in ('updated_at', 'created_at', 'name', 'logical_size_bytes')
  ),
  constraint user_settings_trash_retention_check check (
    trash_retention_days between 0 and 3650
  )
);

comment on table public.user_settings is
  'Per-user interface and retention preferences.';

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

-- Provision profile + settings whenever an identity is created, so every
-- authenticated user has a complete row set on first request.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;

  insert into public.user_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
