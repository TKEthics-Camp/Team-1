-- The parts of a Supabase project the migrations build on, recreated in a
-- bare Postgres so the migrations and the check scripts can run in a test
-- (src/test/database.test.js, on PGlite) instead of only by hand in the
-- SQL editor. Only what the migrations actually touch is here, shaped the
-- way Supabase shapes it: the roles, auth.users and its identities, the
-- storage tables, auth.uid() and the default grants.
--
-- Not a copy of Supabase and never run against a real project.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists auth;
create schema if not exists storage;

-- Supabase puts extensions on the search path, which is why the migrations
-- can call crypt() and gen_salt() unqualified.
alter database postgres set search_path = "$user", public, extensions;
set search_path = "$user", public, extensions;

create table auth.users (
  id                  uuid primary key default gen_random_uuid(),
  aud                 text,
  role                text,
  email               text,
  encrypted_password  text,
  email_confirmed_at  timestamptz,
  raw_app_meta_data   jsonb default '{}'::jsonb,
  raw_user_meta_data  jsonb default '{}'::jsonb,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create table auth.identities (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  provider       text not null,
  provider_id    text,
  identity_data  jsonb default '{}'::jsonb,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- Who is signed in, the way PostgREST tells Postgres: the JWT's claims.
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

create table storage.buckets (
  id                  text primary key,
  name                text not null,
  public              boolean default false,
  file_size_limit     bigint,
  allowed_mime_types  text[],
  created_at          timestamptz default now()
);

create table storage.objects (
  id          uuid primary key default gen_random_uuid(),
  bucket_id   text references storage.buckets(id),
  name        text,
  owner       uuid,
  metadata    jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table storage.objects enable row level security;

create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;

-- Supabase's default grants: the API roles can reach the public schema and
-- anything created in it, and Row Level Security decides the rest.
grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant all on all tables in schema storage to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
