-- 003_live_subscribe.sql
-- Live streaming and subscriptions tables

-- ─── Live Streams ────────────────────────────────────────────────────────────
create table if not exists public.live_streams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Live Stream',
  category text default 'Just Chatting',
  viewer_count integer default 0,
  peak_viewer_count integer default 0,
  is_live boolean default true,
  quality text default '720p',
  started_at timestamptz default now(),
  ended_at timestamptz,
  expires_at timestamptz default (now() + interval '2 hours'),
  created_at timestamptz default now()
);

alter table public.live_streams enable row level security;

create policy "live_streams_select_all" on public.live_streams
  for select using (true);

create policy "live_streams_insert_own" on public.live_streams
  for insert with check (auth.uid() = user_id);

create policy "live_streams_update_own" on public.live_streams
  for update using (auth.uid() = user_id);

-- Allows simulate/tick (unauthenticated) to update viewer counts and quality
create policy "live_streams_update_all" on public.live_streams
  for update using (true) with check (true);

create policy "live_streams_delete_own" on public.live_streams
  for delete using (auth.uid() = user_id);

-- Index for fast active-stream lookups
create index if not exists live_streams_is_live_idx on public.live_streams(is_live, started_at desc);
create index if not exists live_streams_user_id_idx on public.live_streams(user_id, started_at desc);

-- ─── Daily Live Usage ────────────────────────────────────────────────────────
-- Tracks cumulative minutes broadcast per user per calendar day (max 10)
create table if not exists public.live_daily_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  usage_date date not null default current_date,
  minutes_used integer default 0,
  unique(user_id, usage_date)
);

alter table public.live_daily_usage enable row level security;

create policy "live_daily_usage_select_own" on public.live_daily_usage
  for select using (auth.uid() = user_id);

create policy "live_daily_usage_insert_own" on public.live_daily_usage
  for insert with check (auth.uid() = user_id);

create policy "live_daily_usage_update_own" on public.live_daily_usage
  for update using (auth.uid() = user_id);

-- Allow system routes (tick, stop) to update via service role
create policy "live_daily_usage_insert_all" on public.live_daily_usage
  for insert with check (true);

create policy "live_daily_usage_update_all" on public.live_daily_usage
  for update using (true);

-- ─── Subscriptions ───────────────────────────────────────────────────────────
-- One-way follow: subscriber_id subscribes to target_id. No unsubscribe.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(subscriber_id, target_id)
);

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_all" on public.subscriptions
  for select using (true);

create policy "subscriptions_insert_own" on public.subscriptions
  for insert with check (auth.uid() = subscriber_id);

-- Intentionally NO delete policy — subscriptions are permanent.

create index if not exists subscriptions_subscriber_idx on public.subscriptions(subscriber_id);
create index if not exists subscriptions_target_idx on public.subscriptions(target_id);
