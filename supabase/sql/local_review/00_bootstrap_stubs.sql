-- Isolated local review stubs (NOT Supabase Cloud, NOT nordlicht-handels).
-- Mimics minimal auth/roles so Nordlicht migrations can apply on stock PostgreSQL 16.

create schema if not exists extensions;
create schema if not exists auth;

create extension if not exists pgcrypto with schema extensions;

-- Roles used by migrations / RLS policies
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;

-- Minimal auth.users + auth.uid() (JWT claim simulation via set_config)
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

grant execute on function auth.uid() to anon, authenticated, service_role;
grant select on auth.users to authenticated, service_role;

-- Default privileges resembling Supabase (RLS is the real gate)
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
