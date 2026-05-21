-- Events promotion shape — phase 2.
--
-- 1) Adds `source` on `listings` so every row records its origin
--    (`'manual'` for wizard/admin, `'scraper:<adapter>'` for the cron).
-- 2) Lets events promote with NULL category/area/age, but keeps activities
--    fully tagged via a conditional CHECK.
-- 3) Enforces that scraped events carry a source URL (the card links to it
--    instead of an internal detail page).
--
-- Idempotent. Safe on staging (which has activity-shaped columns as NOT NULL
-- without defaults — DROP NOT NULL is a no-op on already-nullable columns).

BEGIN;

-- ── 1. source column on listings ───────────────────────────────────────────
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS source TEXT;
UPDATE public.listings SET source = 'manual' WHERE source IS NULL;
ALTER TABLE public.listings ALTER COLUMN source SET NOT NULL;
ALTER TABLE public.listings ALTER COLUMN source SET DEFAULT 'manual';
CREATE INDEX IF NOT EXISTS listings_source_idx ON public.listings(source);

-- ── 2. drop activity-shaped NOT NULLs so events can NULL them ──────────────
ALTER TABLE public.listings ALTER COLUMN category_id DROP NOT NULL;
ALTER TABLE public.listings ALTER COLUMN area_id     DROP NOT NULL;
ALTER TABLE public.listings ALTER COLUMN age_min     DROP NOT NULL;
ALTER TABLE public.listings ALTER COLUMN age_max     DROP NOT NULL;

-- ── 3. activities must still carry category/area/age ───────────────────────
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_activity_shape_chk;
ALTER TABLE public.listings ADD CONSTRAINT listings_activity_shape_chk CHECK (
  type <> 'activity' OR (
    category_id IS NOT NULL AND area_id IS NOT NULL
    AND age_min IS NOT NULL AND age_max IS NOT NULL
  )
);

-- ── 4. scraped events must carry a source URL (no internal detail page) ────
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_scraped_event_url_chk;
ALTER TABLE public.listings ADD CONSTRAINT listings_scraped_event_url_chk CHECK (
  type <> 'event' OR source = 'manual' OR event_url IS NOT NULL
);

COMMIT;
