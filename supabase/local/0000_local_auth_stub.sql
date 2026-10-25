-- 0000_local_auth_stub.sql
--
-- LOCAL DEVELOPMENT AND TEST ONLY.
--
-- This file emulates the parts of a Supabase project that the migrations and RLS
-- policies depend on: the auth.users table, auth.uid(), and the anon /
-- authenticated / service_role roles. Never apply it to a Supabase project — a
-- real project already provides these.
--
-- The API applies it before migrations only when it runs on the local PGlite
-- driver, or when DATABASE_URL points at a bare PostgreSQL instance that has no
-- auth schema (explicit opt-in via STACKBASE_LOCAL_AUTH_STUB=1).

create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end;
$$;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);

create unique index if not exists local_auth_users_email_key
  on auth.users (lower(email));

-- Mirrors Supabase: identity comes from the verified JWT claims, never from a
-- client-supplied identifier.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to service_role;
