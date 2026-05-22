-- Event series — group repeating occurrences of the same event.
--
-- A multi-occurrence event (same show across several days/times) is stored
-- as one `listings` row per occurrence. Rows that belong to the same series
-- share a `series_id` (an opaque group UUID — NOT a row id, NOT a FK). A
-- NULL `series_id` means a standalone single-occurrence event.
--
-- The UI groups rows by series_id and renders one card per series (the
-- next-upcoming occurrence + a "+N more dates" pill).
--
-- Idempotent. Safe to re-run.

BEGIN;

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS series_id UUID;
CREATE INDEX IF NOT EXISTS listings_series_id_idx ON public.listings(series_id);

COMMIT;
