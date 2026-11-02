-- 0014_deployment_settings.sql
-- Owner-only, database-backed integration settings.
--
-- The instance owner can change the Supabase Auth verification material and the
-- Telegram MTProto application credentials from the web UI. Secret values are
-- sealed by the API with SETTINGS_ENCRYPTION_KEY before they reach this table;
-- the columns below hold ciphertext, never plaintext credentials.
--
-- Deliberately NOT stored here: DATABASE_URL and a Supabase service_role key.
-- The API does not need either through a request-time configuration surface, and
-- a web form that accepts database superuser credentials would be an unnecessary
-- target.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is
  'Instance owner flag. Exactly one profile may hold it; the first account bootstraps it.';

-- The owner flag is server-managed only. The API writes profiles with its direct
-- database connection; a Supabase client role must never be able to promote
-- itself by updating (or inserting) its own profile row.
revoke insert, update on public.profiles from authenticated;
grant select on public.profiles to authenticated;

-- The first existing account becomes the owner. Fresh databases bootstrap in the
-- auth-user trigger below.
update public.profiles
   set is_admin = true
 where id = (
   select id from public.profiles
    order by created_at asc, id asc
    limit 1
 )
   and not exists (select 1 from public.profiles where is_admin = true);

create unique index if not exists profiles_single_admin_idx
  on public.profiles (is_admin)
  where is_admin;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_admin boolean;
begin
  -- Serialize first-account bootstrap so two concurrent sign-ups cannot both
  -- become the owner.
  perform pg_advisory_xact_lock(hashtext('stackbase:first-admin'));
  select exists (select 1 from public.profiles where is_admin) into has_admin;

  insert into public.profiles (id, is_admin) values (new.id, not has_admin)
  on conflict (id) do nothing;

  insert into public.user_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create table public.deployment_settings (
  id boolean primary key default true,
  supabase_url text,
  supabase_publishable_key_sealed text,
  supabase_jwt_secret_sealed text,
  supabase_jwks_url text,
  storage_provider text,
  telegram_api_id integer,
  telegram_api_hash_sealed text,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint deployment_settings_singleton check (id),
  constraint deployment_settings_storage_provider_check check (
    storage_provider is null or storage_provider in ('local', 'telegram')
  ),
  constraint deployment_settings_telegram_api_id_check check (
    telegram_api_id is null or (telegram_api_id >= 1 and telegram_api_id <= 2147483647)
  ),
  constraint deployment_settings_supabase_url_length check (
    supabase_url is null or length(supabase_url) between 8 and 2048
  ),
  constraint deployment_settings_jwks_url_length check (
    supabase_jwks_url is null or length(supabase_jwks_url) between 8 and 2048
  )
);

comment on table public.deployment_settings is
  'Singleton owner-managed integration configuration. Sealed columns are
   AES-256-GCM ciphertext under SETTINGS_ENCRYPTION_KEY; this table has no client
   grants and no RLS policy because only the API server reads or writes it.';
comment on column public.deployment_settings.supabase_publishable_key_sealed is
  'Sealed Supabase publishable/anon key. Never returned by an API.';
comment on column public.deployment_settings.supabase_jwt_secret_sealed is
  'Sealed legacy Supabase JWT secret. Used only for token verification.';
comment on column public.deployment_settings.telegram_api_hash_sealed is
  'Sealed Telegram API hash. Never returned by an API.';

alter table public.deployment_settings enable row level security;
revoke all on public.deployment_settings from anon, authenticated;
