-- Add published_at to listings
-- Stamped when a listing is first approved (status → active).
-- Used by the daily digest cron to find listings published in the last 24 h.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS published_at timestamptz;
