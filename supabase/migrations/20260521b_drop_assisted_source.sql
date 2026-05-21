-- Source taxonomy cleanup — collapse `'assisted'` into `'manual'`.
--
-- The events flow now has only two source values: `'manual'` (wizard/admin
-- form) and `'scraper:<adapter>'` (cron). `'assisted'` was a third value
-- with no UI difference from manual, and made the
-- `listings_scraped_event_url_chk` constraint wrongly require event_url
-- on admin form entries.
--
-- Idempotent. Safe to re-run.

BEGIN;

UPDATE public.event_drafts SET source = 'manual' WHERE source = 'assisted';
UPDATE public.listings     SET source = 'manual' WHERE source = 'assisted';

COMMIT;
