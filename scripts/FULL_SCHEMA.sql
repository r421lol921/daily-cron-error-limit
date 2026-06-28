-- =============================================================================
-- FULL SCHEMA — run this once in your Supabase SQL Editor
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE throughout
-- =============================================================================

-- ─── 1. PROFILES ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         text unique not null,
  display_name     text not null default '',
  bio              text default '',
  avatar_url       text default '',
  banner_url       text default '',
  followers_count  integer default 0,
  following_count  integer default 0,
  posts_count      integer default 0,
  location         text default '',
  website          text default '',
  is_verified      boolean default false,
  last_active_at   timestamptz default now(),
  joined_at        timestamptz default now(),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='profiles_select_all') then
    create policy "profiles_select_all" on public.profiles for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='profiles_insert_own') then
    create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='profiles_update_own') then
    create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='profiles_delete_own') then
    create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);
  end if;
end $$;

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  final_username text;
  counter integer := 0;
begin
  base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '', 'g'));
  if length(base_username) < 3 then base_username := 'user' || base_username; end if;
  final_username := base_username;
  loop
    exit when not exists (select 1 from public.profiles where username = final_username);
    counter := counter + 1;
    final_username := base_username || counter::text;
  end loop;
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'display_name', final_username),
    'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ─── 2. POSTS ────────────────────────────────────────────────────────────────
create table if not exists public.posts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  content        text not null,
  media_urls     text[] default '{}',
  likes_count    integer default 0,
  reposts_count  integer default 0,
  saves_count    integer default 0,
  views_count    integer default 0,
  real_views_count integer default 0,
  is_archived    boolean default false,
  reply_to_id    uuid references public.posts(id) on delete set null,
  collab_user_id uuid references public.profiles(id) on delete set null,
  expires_at     timestamptz,
  pinned         boolean default false,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table public.posts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='posts' and policyname='posts_select_all') then
    create policy "posts_select_all" on public.posts for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='posts' and policyname='posts_insert_own') then
    create policy "posts_insert_own" on public.posts for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='posts' and policyname='posts_update_own') then
    create policy "posts_update_own" on public.posts for update using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='posts' and policyname='posts_delete_own') then
    create policy "posts_delete_own" on public.posts for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ─── 3. OATS (short video clips) ────────────────────────────────────────────
create table if not exists public.oats (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  caption       text default '',
  video_url     text not null,
  thumbnail_url text default '',
  likes_count   integer default 0,
  views_count   integer default 0,
  saves_count   integer default 0,
  is_archived   boolean default false,
  expires_at    timestamptz,
  created_at    timestamptz default now()
);

alter table public.oats enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='oats' and policyname='oats_select_all') then
    create policy "oats_select_all" on public.oats for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='oats' and policyname='oats_insert_own') then
    create policy "oats_insert_own" on public.oats for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='oats' and policyname='oats_update_own') then
    create policy "oats_update_own" on public.oats for update using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='oats' and policyname='oats_delete_own') then
    create policy "oats_delete_own" on public.oats for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ─── 4. OAT LIKES ────────────────────────────────────────────────────────────
create table if not exists public.oat_likes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  oat_id     uuid not null references public.oats(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, oat_id)
);

alter table public.oat_likes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='oat_likes' and policyname='oat_likes_select_all') then
    create policy "oat_likes_select_all" on public.oat_likes for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='oat_likes' and policyname='oat_likes_insert_own') then
    create policy "oat_likes_insert_own" on public.oat_likes for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='oat_likes' and policyname='oat_likes_delete_own') then
    create policy "oat_likes_delete_own" on public.oat_likes for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ─── 5. OAT SAVES ────────────────────────────────────────────────────────────
create table if not exists public.oat_saves (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  oat_id     uuid not null references public.oats(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, oat_id)
);

alter table public.oat_saves enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='oat_saves' and policyname='oat_saves_select_own') then
    create policy "oat_saves_select_own" on public.oat_saves for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='oat_saves' and policyname='oat_saves_insert_own') then
    create policy "oat_saves_insert_own" on public.oat_saves for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='oat_saves' and policyname='oat_saves_delete_own') then
    create policy "oat_saves_delete_own" on public.oat_saves for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ─── 6. LIKES ────────────────────────────────────────────────────────────────
create table if not exists public.likes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, post_id)
);

alter table public.likes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='likes' and policyname='likes_select_all') then
    create policy "likes_select_all" on public.likes for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='likes' and policyname='likes_insert_own') then
    create policy "likes_insert_own" on public.likes for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='likes' and policyname='likes_delete_own') then
    create policy "likes_delete_own" on public.likes for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ─── 7. REPOSTS ──────────────────────────────────────────────────────────────
create table if not exists public.reposts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, post_id)
);

alter table public.reposts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='reposts' and policyname='reposts_select_all') then
    create policy "reposts_select_all" on public.reposts for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='reposts' and policyname='reposts_insert_own') then
    create policy "reposts_insert_own" on public.reposts for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='reposts' and policyname='reposts_delete_own') then
    create policy "reposts_delete_own" on public.reposts for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ─── 8. SAVES (bookmarks) ────────────────────────────────────────────────────
create table if not exists public.saves (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, post_id)
);

alter table public.saves enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='saves' and policyname='saves_select_own') then
    create policy "saves_select_own" on public.saves for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='saves' and policyname='saves_insert_own') then
    create policy "saves_insert_own" on public.saves for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='saves' and policyname='saves_delete_own') then
    create policy "saves_delete_own" on public.saves for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ─── 9. FOLLOWS ──────────────────────────────────────────────────────────────
create table if not exists public.follows (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz default now(),
  unique(follower_id, following_id)
);

alter table public.follows enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='follows' and policyname='follows_select_all') then
    create policy "follows_select_all" on public.follows for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='follows' and policyname='follows_insert_own') then
    create policy "follows_insert_own" on public.follows for insert with check (auth.uid() = follower_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='follows' and policyname='follows_delete_own') then
    create policy "follows_delete_own" on public.follows for delete using (auth.uid() = follower_id);
  end if;
end $$;

-- ─── 10. SUBSCRIPTIONS (one-way, no unsubscribe) ────────────────────────────
create table if not exists public.subscriptions (
  id            uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.profiles(id) on delete cascade,
  target_id     uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz default now(),
  unique(subscriber_id, target_id)
);

alter table public.subscriptions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='subscriptions' and policyname='subscriptions_select_all') then
    create policy "subscriptions_select_all" on public.subscriptions for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='subscriptions' and policyname='subscriptions_insert_own') then
    create policy "subscriptions_insert_own" on public.subscriptions for insert with check (auth.uid() = subscriber_id);
  end if;
end $$;

-- ─── 11. POST VIEWS ──────────────────────────────────────────────────────────
create table if not exists public.post_views (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  viewer_id  uuid references public.profiles(id) on delete set null,
  viewed_at  timestamptz default now(),
  unique(post_id, viewer_id)
);

alter table public.post_views enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='post_views' and policyname='post_views_select_all') then
    create policy "post_views_select_all" on public.post_views for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='post_views' and policyname='post_views_insert_all') then
    create policy "post_views_insert_all" on public.post_views for insert with check (true);
  end if;
end $$;

-- ─── 12. HASHTAGS ────────────────────────────────────────────────────────────
create table if not exists public.hashtags (
  id         uuid primary key default gen_random_uuid(),
  tag        text unique not null,
  post_count integer default 0,
  created_at timestamptz default now()
);

alter table public.hashtags enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='hashtags' and policyname='hashtags_select_all') then
    create policy "hashtags_select_all" on public.hashtags for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='hashtags' and policyname='hashtags_insert_all') then
    create policy "hashtags_insert_all" on public.hashtags for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='hashtags' and policyname='hashtags_update_all') then
    create policy "hashtags_update_all" on public.hashtags for update using (true);
  end if;
end $$;

-- ─── 13. POST HASHTAGS ───────────────────────────────────────────────────────
create table if not exists public.post_hashtags (
  post_id    uuid not null references public.posts(id) on delete cascade,
  hashtag_id uuid not null references public.hashtags(id) on delete cascade,
  primary key (post_id, hashtag_id)
);

alter table public.post_hashtags enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='post_hashtags' and policyname='post_hashtags_select_all') then
    create policy "post_hashtags_select_all" on public.post_hashtags for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='post_hashtags' and policyname='post_hashtags_insert_all') then
    create policy "post_hashtags_insert_all" on public.post_hashtags for insert with check (true);
  end if;
end $$;

-- ─── 14. WAITLIST ────────────────────────────────────────────────────────────
create table if not exists public.waitlist (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  display_name text not null default '',
  username     text not null default '',
  password_hash text not null default '',
  position     integer not null,
  status       text not null default 'waiting' check (status in ('waiting','invited','expired')),
  invited_at   timestamptz,
  created_at   timestamptz default now()
);

alter table public.waitlist enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='waitlist' and policyname='waitlist_insert_anyone') then
    create policy "waitlist_insert_anyone" on public.waitlist for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='waitlist' and policyname='waitlist_select_own') then
    create policy "waitlist_select_own" on public.waitlist for select using (true);
  end if;
end $$;

-- ─── 15. LIVE STREAMS ────────────────────────────────────────────────────────
create table if not exists public.live_streams (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  title              text not null default 'Live Stream',
  category           text not null default 'Just Chatting',
  viewer_count       integer default 0,
  peak_viewer_count  integer default 0,
  is_live            boolean default true,
  quality            text default '720p',
  started_at         timestamptz default now(),
  ended_at           timestamptz,
  expires_at         timestamptz default (now() + interval '2 hours'),
  created_at         timestamptz default now()
);

alter table public.live_streams enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='live_streams' and policyname='live_streams_select_all') then
    create policy "live_streams_select_all" on public.live_streams for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='live_streams' and policyname='live_streams_insert_own') then
    create policy "live_streams_insert_own" on public.live_streams for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='live_streams' and policyname='live_streams_update_own') then
    create policy "live_streams_update_own" on public.live_streams for update using (true) with check (true);
  end if;
end $$;

-- ─── 16. STORAGE BUCKETS ─────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media', 'post-media', true, 52428800,
  array['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','video/quicktime']
) on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'oat-videos', 'oat-videos', true, 524288000,
  array['video/mp4','video/webm','video/quicktime']
) on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 5242880,
  array['image/jpeg','image/png','image/gif','image/webp']
) on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'banners', 'banners', true, 10485760,
  array['image/jpeg','image/png','image/gif','image/webp']
) on conflict (id) do nothing;

-- Storage RLS
do $$ begin
  if not exists (select 1 from pg_policies where tablename='objects' and schemaname='storage' and policyname='Media publicly readable') then
    create policy "Media publicly readable" on storage.objects for select to public using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='objects' and schemaname='storage' and policyname='Authenticated users can upload') then
    create policy "Authenticated users can upload" on storage.objects for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='objects' and schemaname='storage' and policyname='Users can delete own files') then
    create policy "Users can delete own files" on storage.objects for delete to authenticated using (auth.uid()::text = (storage.foldername(name))[1]);
  end if;
end $$;

-- ─── 17. TRIGGERS & FUNCTIONS ────────────────────────────────────────────────
create or replace function public.update_follow_counts()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.profiles set followers_count = followers_count + 1 where id = NEW.following_id;
    update public.profiles set following_count = following_count + 1 where id = NEW.follower_id;
  elsif TG_OP = 'DELETE' then
    update public.profiles set followers_count = greatest(0, followers_count - 1) where id = OLD.following_id;
    update public.profiles set following_count = greatest(0, following_count - 1) where id = OLD.follower_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_follow_change on public.follows;
create trigger on_follow_change
  after insert or delete on public.follows for each row execute function public.update_follow_counts();

create or replace function public.update_post_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.profiles set posts_count = posts_count + 1 where id = NEW.user_id;
  elsif TG_OP = 'DELETE' then
    update public.profiles set posts_count = greatest(0, posts_count - 1) where id = OLD.user_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_post_change on public.posts;
create trigger on_post_change
  after insert or delete on public.posts for each row execute function public.update_post_count();

create or replace function public.update_like_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set likes_count = likes_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set likes_count = greatest(0, likes_count - 1) where id = OLD.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_like_change on public.likes;
create trigger on_like_change
  after insert or delete on public.likes for each row execute function public.update_like_count();

create or replace function public.update_repost_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set reposts_count = reposts_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set reposts_count = greatest(0, reposts_count - 1) where id = OLD.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_repost_change on public.reposts;
create trigger on_repost_change
  after insert or delete on public.reposts for each row execute function public.update_repost_count();

create or replace function public.update_save_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set saves_count = saves_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set saves_count = greatest(0, saves_count - 1) where id = OLD.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_save_change on public.saves;
create trigger on_save_change
  after insert or delete on public.saves for each row execute function public.update_save_count();

-- ─── 18. HELPER FUNCTIONS ────────────────────────────────────────────────────
create or replace function public.get_confirmed_user_count()
returns integer language sql security definer stable as $$
  select count(*)::integer from public.profiles;
$$;

create or replace function public.get_next_waitlist_position()
returns integer language sql security definer as $$
  select coalesce(max(position), 0) + 1 from public.waitlist where status = 'waiting';
$$;

create or replace function public.cleanup_expired_content()
returns json language plpgsql security definer as $$
declare
  deleted_posts integer;
  deleted_oats  integer;
  deleted_views integer;
begin
  with d as (delete from public.posts where expires_at is not null and expires_at < now() returning id)
  select count(*) into deleted_posts from d;

  with d as (delete from public.oats where expires_at is not null and expires_at < now() returning id)
  select count(*) into deleted_oats from d;

  delete from public.post_views where viewed_at < now() - interval '7 days';
  get diagnostics deleted_views = row_count;

  return json_build_object(
    'deleted_posts', deleted_posts,
    'deleted_oats',  deleted_oats,
    'deleted_views', deleted_views
  );
end;
$$;
