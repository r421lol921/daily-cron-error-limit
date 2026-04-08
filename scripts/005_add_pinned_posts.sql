-- Add pinned post support and share functionality

-- Add pinned_post_id to profiles
alter table public.profiles add column if not exists pinned_post_id uuid references public.posts(id) on delete set null;

-- Add media_urls array column to posts (replacing single image_url)
alter table public.posts add column if not exists media_urls text[];

-- Migrate existing image_url data to media_urls if needed
update public.posts
set media_urls = array[image_url]
where image_url is not null and image_url != '' and media_urls is null;
