-- Increment hashtag post_count function (called after post with hashtag is created)
create or replace function public.increment_hashtag(tag_name text)
returns void
language plpgsql
security definer
as $$
begin
  update public.hashtags set post_count = post_count + 1 where tag = tag_name;
end;
$$;

-- Allow authenticated users to call it
grant execute on function public.increment_hashtag(text) to authenticated, anon;
