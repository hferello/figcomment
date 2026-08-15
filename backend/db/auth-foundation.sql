-- Figcomment auth foundation
-- Apply in Supabase Dashboard → SQL Editor (run once per project).
-- Purpose: profiles, encrypted user_secrets, plugin_tokens + RLS + column grants.
--
-- Locked DB access rules (do not regress):
-- 1. Data API ON (project setting; this SQL does not disable it)
-- 2. SQL = schema only — not the app query layer (queries use Supabase clients)
-- 3. User-scoped reads/writes via server Supabase client + RLS (publishable key)
-- 4. Privileged lifecycle / secrets via service_role (or private SECURITY DEFINER RPCs)
-- 5. Tight column grants + triggers on lifecycle tables from day one

-- ---------------------------------------------------------------------------
-- Private schema for SECURITY DEFINER helpers (not an exposed Data API schema)
-- ---------------------------------------------------------------------------
create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;
-- Trigger roles need USAGE to resolve functions in this schema
grant usage on schema private to postgres, service_role, supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- profiles (no secrets)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Public profile fields only; never store API secrets here.';

-- ---------------------------------------------------------------------------
-- user_secrets (ciphertext only; app decrypts with SECRETS_ENCRYPTION_KEY)
-- user_id UNIQUE also indexes the FK (CASCADE-friendly)
-- ---------------------------------------------------------------------------
create table if not exists public.user_secrets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  figma_ciphertext text,
  figma_nonce text,
  anthropic_ciphertext text,
  anthropic_nonce text,
  llm_provider text,
  key_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_secrets_figma_pair_chk check (
    (figma_ciphertext is null and figma_nonce is null)
    or (figma_ciphertext is not null and figma_nonce is not null)
  ),
  constraint user_secrets_anthropic_pair_chk check (
    (anthropic_ciphertext is null and anthropic_nonce is null)
    or (anthropic_ciphertext is not null and anthropic_nonce is not null)
  ),
  constraint user_secrets_llm_provider_chk check (
    llm_provider is null or llm_provider in ('openai', 'gemini', 'anthropic')
  ),
  constraint user_secrets_llm_pair_chk check (
    (anthropic_ciphertext is null and anthropic_nonce is null and llm_provider is null)
    or (anthropic_ciphertext is not null and anthropic_nonce is not null and llm_provider is not null)
  )
);

comment on table public.user_secrets is 'AES-GCM ciphertext for Figma and optional model provider key; no plaintext.';

-- ---------------------------------------------------------------------------
-- plugin_tokens (hash-only; one active row per user via partial unique index)
-- ---------------------------------------------------------------------------
create table if not exists public.plugin_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null,
  prefix text not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- FK index for joins + ON DELETE CASCADE (schema-foreign-key-indexes)
create index if not exists plugin_tokens_user_id_idx on public.plugin_tokens (user_id);
create unique index if not exists plugin_tokens_token_hash_uidx on public.plugin_tokens (token_hash);
-- Partial unique: at most one non-revoked token per user (query-partial-indexes)
create unique index if not exists plugin_tokens_one_active_per_user_uidx
  on public.plugin_tokens (user_id)
  where revoked_at is null;

comment on table public.plugin_tokens is 'Plugin API tokens: store hash + display prefix only.';

-- ---------------------------------------------------------------------------
-- updated_at helper (INVOKER — no privilege escalation needed)
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;
revoke all on function private.set_updated_at() from anon;
grant execute on function private.set_updated_at() to authenticated, service_role;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function private.set_updated_at();

drop trigger if exists user_secrets_set_updated_at on public.user_secrets;
create trigger user_secrets_set_updated_at
  before update on public.user_secrets
  for each row
  execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup (DEFINER in private — not Data API–exposed)
-- supabase_auth_admin must be able to EXECUTE or signup triggers fail.
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;
revoke all on function private.handle_new_user() from anon, authenticated;
grant execute on function private.handle_new_user() to supabase_auth_admin;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Lifecycle / secrets write guards (rule 5 — defense in depth beyond grants)
-- Blocks authenticated/anon even if column grants are later widened by mistake.
-- service_role and Dashboard (no JWT role) are allowed through.
-- ---------------------------------------------------------------------------
create or replace function private.jwt_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.role(), '');
$$;

revoke all on function private.jwt_role() from public;
revoke all on function private.jwt_role() from anon, authenticated;
grant execute on function private.jwt_role() to postgres, service_role;

create or replace function private.enforce_plugin_token_server_writes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  role_name text := private.jwt_role();
begin
  -- Empty role: SQL Editor / migrations as postgres — allow.
  if role_name = '' then
    return coalesce(new, old);
  end if;

  if role_name in ('authenticated', 'anon') then
    raise exception
      'plugin_tokens writes are server-only (service_role); client cannot mutate lifecycle columns';
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function private.enforce_plugin_token_server_writes() from public;
revoke all on function private.enforce_plugin_token_server_writes() from anon, authenticated;

drop trigger if exists plugin_tokens_server_writes_only on public.plugin_tokens;
create trigger plugin_tokens_server_writes_only
  before insert or update or delete on public.plugin_tokens
  for each row
  execute function private.enforce_plugin_token_server_writes();

create or replace function private.enforce_user_secrets_server_writes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  role_name text := private.jwt_role();
begin
  if role_name = '' then
    return coalesce(new, old);
  end if;

  if role_name in ('authenticated', 'anon') then
    raise exception
      'user_secrets writes are server-only (service_role after app encrypt)';
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function private.enforce_user_secrets_server_writes() from public;
revoke all on function private.enforce_user_secrets_server_writes() from anon, authenticated;

drop trigger if exists user_secrets_server_writes_only on public.user_secrets;
create trigger user_secrets_server_writes_only
  before insert or update or delete on public.user_secrets
  for each row
  execute function private.enforce_user_secrets_server_writes();

-- ---------------------------------------------------------------------------
-- RLS (enabled + forced so table owner cannot accidentally bypass)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.user_secrets enable row level security;
alter table public.user_secrets force row level security;
alter table public.plugin_tokens enable row level security;
alter table public.plugin_tokens force row level security;

-- profiles: own row read/write — (select auth.uid()) for initPlan caching
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- user_secrets: no policies for anon/authenticated → deny via Data API.
-- Phase 2+ reads/writes use Next.js service_role after encrypt/decrypt.
-- service_role retains BYPASSRLS (FORCE RLS does not block it).

-- plugin_tokens: authenticated may SELECT own rows; hash blocked via column grants
drop policy if exists "plugin_tokens_select_own" on public.plugin_tokens;
create policy "plugin_tokens_select_own"
  on public.plugin_tokens
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Table + column grants (least privilege; harden Data API)
-- ---------------------------------------------------------------------------
revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.user_secrets from public, anon, authenticated;
revoke all on table public.plugin_tokens from public, anon, authenticated;

-- profiles: cannot rewrite id / timestamps via Data API
grant select on table public.profiles to authenticated;
grant insert (id, display_name) on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

grant all on table public.profiles to service_role;

-- user_secrets: service_role only (ciphertext never granted to authenticated)
grant all on table public.user_secrets to service_role;

-- plugin_tokens: metadata SELECT only — never token_hash;
-- no INSERT/UPDATE/DELETE for authenticated (mint/revoke via service_role)
grant select (
  id,
  user_id,
  prefix,
  revoked_at,
  last_used_at,
  expires_at,
  created_at
) on table public.plugin_tokens to authenticated;

grant all on table public.plugin_tokens to service_role;

-- Future objects in public: opt-in exposure (hardening-data-api).
-- New tables/functions need explicit GRANTs (including service_role).
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role, public;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
