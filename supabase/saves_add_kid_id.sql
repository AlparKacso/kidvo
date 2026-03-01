-- Migration: add kid_id to saves table so saves can be tagged to a specific child.
-- The same listing can be saved for multiple kids (one row per user+listing+kid).
-- Existing saves (kid_id = NULL) are "general" saves not tied to any child.

-- Drop old unique constraint on (user_id, listing_id) if it exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'saves' AND indexname = 'saves_user_id_listing_id_key'
  ) THEN
    ALTER TABLE saves DROP CONSTRAINT saves_user_id_listing_id_key;
  END IF;
END $$;

-- Add kid_id column (nullable FK — cascade-delete when child profile is removed)
ALTER TABLE saves
  ADD COLUMN IF NOT EXISTS kid_id uuid REFERENCES children(id) ON DELETE CASCADE;

-- Partial unique index: one save per (user, listing, kid) when kid is set
CREATE UNIQUE INDEX IF NOT EXISTS saves_user_listing_kid_idx
  ON saves(user_id, listing_id, kid_id) WHERE kid_id IS NOT NULL;

-- Partial unique index: one save per (user, listing) when no kid is set
CREATE UNIQUE INDEX IF NOT EXISTS saves_user_listing_nokid_idx
  ON saves(user_id, listing_id) WHERE kid_id IS NULL;
