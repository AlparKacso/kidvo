-- Events feature — Phase 1 (data model).
--
-- Extends `listings` with an `event` type + event-specific fields, adds an
-- `event_drafts` staging table for scraped / assisted ingestion (admin-
-- reviewed before promotion to a live listing), and seeds the system
-- "Kidvo Events" provider that owns admin-curated events.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS /
-- DROP POLICY IF EXISTS before CREATE POLICY / ON CONFLICT DO NOTHING.
-- Safe to re-run. Run in the Supabase SQL editor.

BEGIN;

-- ── 1. listings: type discriminator + event fields ──────────────────────────
-- The IF NOT EXISTS guards the whole statement (incl. the inline CHECK), so
-- re-running is a no-op once the column exists. Default keeps every existing
-- row valid as 'activity' — no backfill needed.
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'activity'
    CHECK (type IN ('activity', 'event'));

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS event_start_at TIMESTAMPTZ;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS event_end_at   TIMESTAMPTZ;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS event_url      TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS venue_name     TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS price_label    TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS organizer_name TEXT;

CREATE INDEX IF NOT EXISTS listings_type_idx         ON public.listings(type);
CREATE INDEX IF NOT EXISTS listings_event_end_at_idx ON public.listings(event_end_at);

-- ── 2. event_drafts — staging for scraped / assisted ingestion ──────────────
-- Unvetted content never touches `listings`. The UNIQUE dedup_hash makes the
-- daily scraper's upsert idempotent (re-seeing an event is a no-op).
CREATE TABLE IF NOT EXISTS public.event_drafts (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source                TEXT        NOT NULL,           -- 'scraper:<name>' | 'assisted'
  external_id           TEXT,
  dedup_hash            TEXT        NOT NULL UNIQUE,
  raw_payload           JSONB,
  title                 TEXT,
  description           TEXT,
  event_start_at        TIMESTAMPTZ,
  event_end_at          TIMESTAMPTZ,
  event_url             TEXT,
  venue_name            TEXT,
  price_label           TEXT,
  organizer_name        TEXT,
  cover_image_url       TEXT,
  suggested_category_id UUID        REFERENCES public.categories(id) ON DELETE SET NULL,
  suggested_area_id     UUID        REFERENCES public.areas(id)      ON DELETE SET NULL,
  status                TEXT        NOT NULL DEFAULT 'new'
                                    CHECK (status IN ('new', 'approved', 'rejected')),
  promoted_listing_id   UUID        REFERENCES public.listings(id)   ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_drafts_status_idx ON public.event_drafts(status);

-- ── 3. RLS — admin only (public never sees drafts) ──────────────────────────
ALTER TABLE public.event_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_drafts_select_admin" ON public.event_drafts;
DROP POLICY IF EXISTS "event_drafts_insert_admin" ON public.event_drafts;
DROP POLICY IF EXISTS "event_drafts_update_admin" ON public.event_drafts;

CREATE POLICY "event_drafts_select_admin" ON public.event_drafts FOR SELECT USING (public.is_admin());
CREATE POLICY "event_drafts_insert_admin" ON public.event_drafts FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "event_drafts_update_admin" ON public.event_drafts FOR UPDATE USING (public.is_admin());

-- ── 4. Seed system "Kidvo Events" provider ──────────────────────────────────
-- Owns admin-curated / scraped events. Reuses the alpar.kacso+1@gmail.com
-- account (prod: already exists, repurposed in place — it has no listings;
-- staging: sign that account up as a provider first, then run this).
-- Upsert: an existing provider row is renamed to "Kidvo Events" in place
-- (reversible, no cascade); otherwise it's created. No-op until the
-- public.users row exists. Code resolves this provider by display_name.
INSERT INTO public.providers (user_id, display_name, bio, contact_email, plan, verified)
SELECT u.id,
       'Kidvo Events',
       'Curated children''s events across Timișoara, gathered by Kidvo.',
       u.email,
       'free',
       true
FROM public.users u
WHERE u.email = 'alpar.kacso+1@gmail.com'
ON CONFLICT (user_id) DO UPDATE
  SET display_name = 'Kidvo Events',
      bio          = EXCLUDED.bio,
      verified     = true;

COMMIT;
