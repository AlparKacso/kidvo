-- Add cover photo and Google Maps link to listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS maps_url        TEXT;

-- Create the listing-images storage bucket (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-images',
  'listing-images',
  true,
  5242880,  -- 5 MB max
  ARRAY['image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: drop first so the file is safe to re-run
DROP POLICY IF EXISTS "providers_upload_listing_images"  ON storage.objects;
DROP POLICY IF EXISTS "providers_update_listing_images"  ON storage.objects;
DROP POLICY IF EXISTS "providers_delete_listing_images"  ON storage.objects;
DROP POLICY IF EXISTS "public_read_listing_images"       ON storage.objects;

CREATE POLICY "providers_upload_listing_images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'listing-images');

CREATE POLICY "providers_update_listing_images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "providers_delete_listing_images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public read access for listing images
CREATE POLICY "public_read_listing_images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'listing-images');
