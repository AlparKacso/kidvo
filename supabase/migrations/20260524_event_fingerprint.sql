-- Cross-source event dedup — every event row gets a `fingerprint` derived
-- from normalized title + start (rounded to 30 min) + normalized venue.
-- When more than one adapter scrapes the same real-world event, the second
-- one matches the first's fingerprint and is silently skipped at insert
-- (application-level check; see src/lib/scrapers/fingerprint.ts).
--
-- We deliberately do NOT add a UNIQUE constraint — legitimate cases need
-- to bypass the check (re-scraping after a draft was rejected; admin
-- override via the assisted form). The check stays in the app layer.
--
-- Idempotent. Safe to re-run.

BEGIN;

ALTER TABLE public.event_drafts ADD COLUMN IF NOT EXISTS fingerprint TEXT;
ALTER TABLE public.listings     ADD COLUMN IF NOT EXISTS fingerprint TEXT;

CREATE INDEX IF NOT EXISTS event_drafts_fingerprint_idx ON public.event_drafts(fingerprint);
CREATE INDEX IF NOT EXISTS listings_fingerprint_idx     ON public.listings(fingerprint);

COMMIT;
