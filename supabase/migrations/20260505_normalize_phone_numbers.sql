-- Normalise existing phone numbers in users.phone and providers.contact_phone
-- to the canonical +40XXXXXXXXX form (12 chars: '+' + '40' + 9 digits).
--
-- Mirrors the JS normalisation in src/lib/phone.ts. Idempotent: rows already
-- in canonical form are left untouched. Rows that can't be matched to any
-- supported shape are NOT modified — the trailing SELECTs list them so you
-- can fix them by hand.
--
-- Safe to run on both staging and production. The two UPDATEs are wrapped
-- in a single transaction; the SELECTs after COMMIT report anything that
-- still needs manual attention.

BEGIN;

-- ── 1. users.phone ──────────────────────────────────────────────────────────
WITH cleaned AS (
  SELECT id, phone AS old_phone, regexp_replace(phone, '[^0-9+]', '', 'g') AS c
  FROM public.users
  WHERE phone IS NOT NULL AND phone <> ''
), normalised AS (
  SELECT id, old_phone,
    CASE
      WHEN c ~ '^\+40[0-9]{9}$'   THEN c                            -- already canonical
      WHEN c ~ '^0[0-9]{9}$'      THEN '+4' || c                    -- 0745369041
      WHEN c ~ '^40[0-9]{9}$'     THEN '+'  || c                    -- 40745369041
      WHEN c ~ '^0040[0-9]{9}$'   THEN '+'  || substring(c from 3)  -- 0040745369041
      ELSE NULL
    END AS new_phone
  FROM cleaned
)
UPDATE public.users u
SET phone = n.new_phone
FROM normalised n
WHERE u.id = n.id
  AND n.new_phone IS NOT NULL
  AND u.phone <> n.new_phone;

-- ── 2. providers.contact_phone ──────────────────────────────────────────────
WITH cleaned AS (
  SELECT id, contact_phone AS old_phone, regexp_replace(contact_phone, '[^0-9+]', '', 'g') AS c
  FROM public.providers
  WHERE contact_phone IS NOT NULL AND contact_phone <> ''
), normalised AS (
  SELECT id, old_phone,
    CASE
      WHEN c ~ '^\+40[0-9]{9}$'   THEN c
      WHEN c ~ '^0[0-9]{9}$'      THEN '+4' || c
      WHEN c ~ '^40[0-9]{9}$'     THEN '+'  || c
      WHEN c ~ '^0040[0-9]{9}$'   THEN '+'  || substring(c from 3)
      ELSE NULL
    END AS new_phone
  FROM cleaned
)
UPDATE public.providers p
SET contact_phone = n.new_phone
FROM normalised n
WHERE p.id = n.id
  AND n.new_phone IS NOT NULL
  AND p.contact_phone <> n.new_phone;

COMMIT;

-- ── Manual-review reports ───────────────────────────────────────────────────
-- These SELECTs return any rows whose phone couldn't be matched to a
-- supported shape (foreign numbers, garbage, etc.). If both return 0
-- rows, the data is fully canonical.

SELECT 'users' AS table_name, id, phone
FROM public.users
WHERE phone IS NOT NULL
  AND phone <> ''
  AND phone !~ '^\+40[0-9]{9}$';

SELECT 'providers' AS table_name, id, contact_phone AS phone
FROM public.providers
WHERE contact_phone IS NOT NULL
  AND contact_phone <> ''
  AND contact_phone !~ '^\+40[0-9]{9}$';
