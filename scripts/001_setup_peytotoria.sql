-- PeytOtoria database schema

-- Profiles table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  bio text default '',
  avatar_url text default '',
  banner_url text default '',
  followers_count integer default 0,
  following_count integer default 0,
  posts_count integer default 0,
  location text default '',
  website text default '',
  joined_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  counter integer := 0;
begin
  -- Build a username from email prefix
  base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '', 'g'));
  if length(base_username) < 3 then
    base_username := 'user' || base_username;
  end if;
  final_username := base_username;
  -- Ensure uniqueness
  loop
    exit when not exists (select 1 from public.profiles where username = final_username);
    counter := counter + 1;
    final_username := base_username || counter::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url, followers_count, following_count, posts_count)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data ->> 'display_name', final_username),
    '/default-avatar.jpg',
    0, 0, 0
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Posts table
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  image_url text default '',
  likes_count integer default 0,
  reposts_count integer default 0,
  saves_count integer default 0,
  views_count integer default 0,
  real_views_count integer default 0,
  is_archived boolean default false,
  reply_to_id uuid references public.posts(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.posts enable row level security;

create policy "posts_select_all" on public.posts for select using (true);
create policy "posts_insert_own" on public.posts for insert with check (auth.uid() = user_id);
create policy "posts_update_own" on public.posts for update using (auth.uid() = user_id);
create policy "posts_delete_own" on public.posts for delete using (auth.uid() = user_id);

-- Allow system to update post stats (likes_count, reposts_count, etc.)
create policy "posts_update_stats" on public.posts for update using (true) with check (true);

-- Likes table
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, post_id)
);

alter table public.likes enable row level security;

create policy "likes_select_all" on public.likes for select using (true);
create policy "likes_insert_own" on public.likes for insert with check (auth.uid() = user_id);
create policy "likes_delete_own" on public.likes for delete using (auth.uid() = user_id);

-- Reposts table
create table if not exists public.reposts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, post_id)
);

alter table public.reposts enable row level security;

create policy "reposts_select_all" on public.reposts for select using (true);
create policy "reposts_insert_own" on public.reposts for insert with check (auth.uid() = user_id);
create policy "reposts_delete_own" on public.reposts for delete using (auth.uid() = user_id);

-- Saves (bookmarks) table
create table if not exists public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, post_id)
);

alter table public.saves enable row level security;

create policy "saves_select_own" on public.saves for select using (auth.uid() = user_id);
create policy "saves_insert_own" on public.saves for insert with check (auth.uid() = user_id);
create policy "saves_delete_own" on public.saves for delete using (auth.uid() = user_id);

-- Follows table
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(follower_id, following_id)
);

alter table public.follows enable row level security;

create policy "follows_select_all" on public.follows for select using (true);
create policy "follows_insert_own" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete_own" on public.follows for delete using (auth.uid() = follower_id);

-- Post views table (tracks real user views for archive logic)
create table if not exists public.post_views (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete set null,
  viewed_at timestamptz default now(),
  unique(post_id, viewer_id)
);

alter table public.post_views enable row level security;

create policy "post_views_select_all" on public.post_views for select using (true);
create policy "post_views_insert_all" on public.post_views for insert with check (true);

-- Hashtags table
create table if not exists public.hashtags (
  id uuid primary key default gen_random_uuid(),
  tag text unique not null,
  post_count integer default 0,
  created_at timestamptz default now()
);

alter table public.hashtags enable row level security;
create policy "hashtags_select_all" on public.hashtags for select using (true);
create policy "hashtags_insert_all" on public.hashtags for insert with check (true);
create policy "hashtags_update_all" on public.hashtags for update using (true);

-- Post hashtags junction
create table if not exists public.post_hashtags (
  post_id uuid not null references public.posts(id) on delete cascade,
  hashtag_id uuid not null references public.hashtags(id) on delete cascade,
  primary key (post_id, hashtag_id)
);

alter table public.post_hashtags enable row level security;
create policy "post_hashtags_select_all" on public.post_hashtags for select using (true);
create policy "post_hashtags_insert_all" on public.post_hashtags for insert with check (true);

-- Function to update follower/following counts
create or replace function public.update_follow_counts()
returns trigger
language plpgsql
security definer
as $$
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
  after insert or delete on public.follows
  for each row execute function public.update_follow_counts();

-- Function to update post counts on profile
create or replace function public.update_post_count()
returns trigger
language plpgsql
security definer
as $$
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
  after insert or delete on public.posts
  for each row execute function public.update_post_count();

-- Function to handle like counts
create or replace function public.update_like_count()
returns trigger
language plpgsql
security definer
as $$
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
  after insert or delete on public.likes
  for each row execute function public.update_like_count();

-- Function to handle repost counts
create or replace function public.update_repost_count()
returns trigger
language plpgsql
security definer
as $$
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
  after insert or delete on public.reposts
  for each row execute function public.update_repost_count();

-- Function to handle save counts
create or replace function public.update_save_count()
returns trigger
language plpgsql
security definer
as $$
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
  after insert or delete on public.saves
  for each row execute function public.update_save_count();
