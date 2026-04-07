-- Add media_urls column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT '{}';

-- Create storage bucket for post media (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: allow authenticated users to upload to their own folder
CREATE POLICY IF NOT EXISTS "Users can upload post media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'post-media');

CREATE POLICY IF NOT EXISTS "Post media is publicly readable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'post-media');

CREATE POLICY IF NOT EXISTS "Users can delete their own post media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);
