-- listing_views: record every detail page load
-- No session-level deduplication (MVP simplicity — every load = 1 view)
-- Run this in the Supabase SQL editor before deploying the analytics code.

CREATE TABLE IF NOT EXISTS listing_views (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,  -- null = anonymous visitor
  viewed_at   timestamptz DEFAULT now() NOT NULL
);

-- Fast aggregation by listing
CREATE INDEX IF NOT EXISTS listing_views_listing_id_idx ON listing_views(listing_id);

-- Fast time-window queries (admin 30-day stats)
CREATE INDEX IF NOT EXISTS listing_views_viewed_at_idx  ON listing_views(viewed_at);
