-- 0010_rls_consistency_checks.sql
-- Executable invariants. Applying this migration fails loudly if row-level
-- security or the grant model regresses, so a clean migrate run is a real check.

do $$
declare
  offender record;
begin
  -- 1. Every table in public must have RLS enabled.
  for offender in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity is false
  loop
    raise exception 'RLS is not enabled on public.%', offender.relname;
  end loop;

  -- 2. The anon role must have no privileges on public tables.
  for offender in
    select c.relname, privilege.type
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) as privilege(type)
    where n.nspname = 'public'
      and c.relkind = 'r'
      and has_table_privilege('anon', c.oid, privilege.type)
  loop
    raise exception 'anon has % privilege on public.%', offender.type, offender.relname;
  end loop;

  -- 3. Every user-owned table reachable by the authenticated role needs at least
  --    one policy; otherwise it is silently unreachable for its legitimate role.
  --    Server-only tables (no authenticated grants) are intentionally policy-free.
  for offender in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join information_schema.columns col
      on col.table_schema = n.nspname
     and col.table_name = c.relname
     and col.column_name = 'user_id'
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity is true
      and has_table_privilege('authenticated', c.oid, 'SELECT')
      and not exists (
        select 1 from pg_policies p
        where p.schemaname = n.nspname and p.tablename = c.relname
      )
  loop
    raise exception 'public.% is granted to authenticated but has no RLS policy',
      offender.relname;
  end loop;

  -- 4. Ownership policies must compare against auth.uid().
  for offender in
    select p.tablename, p.policyname
    from pg_policies p
    where p.schemaname = 'public'
      and p.cmd in ('ALL', 'SELECT', 'UPDATE', 'DELETE')
      and coalesce(p.qual, '') not like '%auth.uid()%'
  loop
    raise exception 'policy %.% does not scope access with auth.uid()',
      offender.tablename, offender.policyname;
  end loop;
end;
$$;
