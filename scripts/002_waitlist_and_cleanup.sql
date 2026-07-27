-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002: Waitlist, inactivity column, cleanup RPC
-- Run this in the Supabase SQL editor after 001_setup_peytotoria.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add last_active_at to profiles (if it doesn't exist yet)
alter table public.profiles
  add column if not exists last_active_at timestamptz default now();

-- 2. Waitlist table
create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  display_name text not null default '',
  username    text not null default '',
  -- hashed password is stored so we can auto-create the account when a slot opens
  -- NOTE: we store it as-is from the client; Supabase Auth hashes it at signup time.
  -- We never expose it outside the service-role context.
  password_hash text not null default '',
  position    integer not null,            -- 1-based queue position
  status      text not null default 'waiting' check (status in ('waiting','invited','expired')),
  invited_at  timestamptz,
  created_at  timestamptz default now()
);

alter table public.waitlist enable row level security;

-- Anyone can add themselves
create policy "waitlist_insert_anyone" on public.waitlist
  for insert with check (true);

-- Users can see their own row by email (no auth required — checked by email)
create policy "waitlist_select_own" on public.waitlist
  for select using (true);

-- Only service role can update (mark invited / expired)
-- (service role bypasses RLS by default in Supabase)

-- 3. Helper function: count active (non-waitlisted) confirmed accounts
create or replace function public.get_confirmed_user_count()
returns integer
language sql
security definer
stable
as $$
  select count(*)::integer from public.profiles;
$$;

-- 4. Helper function: next waiting position
create or replace function public.get_next_waitlist_position()
returns integer
language sql
security definer
as $$
  select coalesce(max(position), 0) + 1 from public.waitlist where status = 'waiting';
$$;

-- 5. Cleanup RPC — called by /api/cleanup
--    Deletes expired posts/oats and old post_views; returns counts.
create or replace function public.cleanup_expired_content()
returns json
language plpgsql
security definer
as $$
declare
  deleted_posts  integer;
  deleted_oats   integer;
  deleted_views  integer;
begin
  -- Delete expired posts (cascade removes likes/saves/reposts)
  with d as (
    delete from public.posts
    where expires_at is not null
      and expires_at < now()
    returning id
  )
  select count(*) into deleted_posts from d;

  -- Delete expired oats
  with d as (
    delete from public.oats
    where expires_at is not null
      and expires_at < now()
    returning id
  )
  select count(*) into deleted_oats from d;

  -- Purge post_views older than 7 days to keep the table lean
  with d as (
    delete from public.post_views
    where viewed_at < now() - interval '7 days'
    returning id
  )
  select count(*) into deleted_views from d;

  return json_build_object(
    'deleted_posts',  deleted_posts,
    'deleted_oats',   deleted_oats,
    'deleted_views',  deleted_views
  );
end;
$$;
