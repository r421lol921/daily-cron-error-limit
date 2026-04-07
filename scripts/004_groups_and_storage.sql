-- Groups table
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text default '',
  avatar_url text default '',
  banner_url text default '',
  website text default '',
  members_count integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.groups enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='groups' and policyname='groups_select_all') then
    create policy "groups_select_all" on public.groups for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='groups' and policyname='groups_insert_own') then
    create policy "groups_insert_own" on public.groups for insert with check (auth.uid() = owner_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='groups' and policyname='groups_update_owner') then
    create policy "groups_update_owner" on public.groups for update using (auth.uid() = owner_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='groups' and policyname='groups_delete_owner') then
    create policy "groups_delete_owner" on public.groups for delete using (auth.uid() = owner_id);
  end if;
end $$;

-- Group members table
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(group_id, user_id)
);

alter table public.group_members enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='group_members' and policyname='group_members_select_all') then
    create policy "group_members_select_all" on public.group_members for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='group_members' and policyname='group_members_insert_own') then
    create policy "group_members_insert_own" on public.group_members for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='group_members' and policyname='group_members_delete_own') then
    create policy "group_members_delete_own" on public.group_members for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Trigger to update members_count
create or replace function public.update_group_member_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'INSERT' then
    update public.groups set members_count = members_count + 1 where id = NEW.group_id;
  elsif TG_OP = 'DELETE' then
    update public.groups set members_count = greatest(1, members_count - 1) where id = OLD.group_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_group_member_change on public.group_members;
create trigger on_group_member_change
  after insert or delete on public.group_members
  for each row execute function public.update_group_member_count();

-- Supabase storage bucket for avatars/banners (run from dashboard if not using service role)
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;

-- Storage policies for avatars bucket
-- create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
-- create policy "avatars_auth_upload" on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
-- create policy "avatars_auth_update" on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "avatars_auth_delete" on storage.objects for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
