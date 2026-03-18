-- ─────────────────────────────────────────────────────────────────
-- Dummy media seed for development / demo purposes
--   1. Maps URL  → all listings get a Google Maps link for their area
--   2. Cover photo → ~60 % of listings get a category-matched Unsplash photo
--      (varied within each category so cards look different)
-- Run once in the Supabase SQL editor after applying listings_add_media.sql
-- ─────────────────────────────────────────────────────────────────

-- ── 1. MAPS URLs ─────────────────────────────────────────────────
UPDATE public.listings l
SET maps_url = CASE a.slug
  WHEN 'centru'                 THEN 'https://maps.google.com/?q=Piata+Victoriei+Timisoara'
  WHEN 'fabric'                 THEN 'https://maps.google.com/?q=Fabric+Timisoara'
  WHEN 'iosefin'                THEN 'https://maps.google.com/?q=Iosefin+Timisoara'
  WHEN 'freidorf'               THEN 'https://maps.google.com/?q=Freidorf+Timisoara'
  WHEN 'elisabetin'             THEN 'https://maps.google.com/?q=Elisabetin+Timisoara'
  WHEN 'mehala'                 THEN 'https://maps.google.com/?q=Mehala+Timisoara'
  WHEN 'ronat'                  THEN 'https://maps.google.com/?q=Ronat+Timisoara'
  WHEN 'calea-lipovei'          THEN 'https://maps.google.com/?q=Calea+Lipovei+Timisoara'
  WHEN 'calea-sagului'          THEN 'https://maps.google.com/?q=Calea+Sagului+Timisoara'
  WHEN 'dacia'                  THEN 'https://maps.google.com/?q=Dacia+Timisoara'
  WHEN 'torontal'               THEN 'https://maps.google.com/?q=Torontal+Timisoara'
  WHEN 'complexul-studentesc'   THEN 'https://maps.google.com/?q=Complexul+Studentesc+Timisoara'
  WHEN 'circumvalatiunii'       THEN 'https://maps.google.com/?q=Circumvalatiunii+Timisoara'
  WHEN 'dorobantilor'           THEN 'https://maps.google.com/?q=Dorobantilor+Timisoara'
  WHEN 'take-ionescu'           THEN 'https://maps.google.com/?q=Take+Ionescu+Timisoara'
  WHEN 'olimpia'                THEN 'https://maps.google.com/?q=Olimpia+Timisoara'
  WHEN 'lunei'                  THEN 'https://maps.google.com/?q=Lunei+Timisoara'
  WHEN 'steaua'                 THEN 'https://maps.google.com/?q=Steaua+Timisoara'
  WHEN 'plopi'                  THEN 'https://maps.google.com/?q=Plopi+Timisoara'
  WHEN 'bega'                   THEN 'https://maps.google.com/?q=Bega+Timisoara'
  WHEN 'fratelia'               THEN 'https://maps.google.com/?q=Fratelia+Timisoara'
  WHEN 'calea-aradului'         THEN 'https://maps.google.com/?q=Calea+Aradului+Timisoara'
  WHEN 'ghiroda-noua'           THEN 'https://maps.google.com/?q=Ghiroda+Noua+Timisoara'
  WHEN 'dumbravita'             THEN 'https://maps.google.com/?q=Dumbravita+Timisoara'
  WHEN 'ghiroda'                THEN 'https://maps.google.com/?q=Ghiroda+Timisoara'
  WHEN 'giroc'                  THEN 'https://maps.google.com/?q=Giroc+Timisoara'
  WHEN 'chisoda'                THEN 'https://maps.google.com/?q=Chisoda+Timisoara'
  WHEN 'mosnita-noua'           THEN 'https://maps.google.com/?q=Mosnita+Noua+Timisoara'
  WHEN 'sanandrei'              THEN 'https://maps.google.com/?q=Sanandrei+Timisoara'
  WHEN 'sacalaz'                THEN 'https://maps.google.com/?q=Sacalaz+Timisoara'
  ELSE                               'https://maps.google.com/?q=Timisoara'
END
FROM public.areas a
WHERE l.area_id = a.id;


-- ── 2. COVER PHOTOS (~60 % of listings) ─────────────────────────
-- Uses abs(hashtext(id)) % N to pick deterministically between
-- 2–3 photos per category and skips ~40 % via % 10 >= 6.

UPDATE public.listings l
SET cover_image_url = CASE
  -- ── Sport ──────────────────────────────────────────────────────
  WHEN c.slug = 'sport' AND abs(hashtext(l.id::text)) % 3 = 0
    THEN 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80&fit=crop&auto=format'
  WHEN c.slug = 'sport' AND abs(hashtext(l.id::text)) % 3 = 1
    THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80&fit=crop&auto=format'
  WHEN c.slug = 'sport' AND abs(hashtext(l.id::text)) % 3 = 2
    THEN 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=800&q=80&fit=crop&auto=format'

  -- ── Dance ──────────────────────────────────────────────────────
  WHEN c.slug = 'dance' AND abs(hashtext(l.id::text)) % 2 = 0
    THEN 'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=800&q=80&fit=crop&auto=format'
  WHEN c.slug = 'dance' AND abs(hashtext(l.id::text)) % 2 = 1
    THEN 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=80&fit=crop&auto=format'

  -- ── Music ──────────────────────────────────────────────────────
  WHEN c.slug = 'music' AND abs(hashtext(l.id::text)) % 2 = 0
    THEN 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&q=80&fit=crop&auto=format'
  WHEN c.slug = 'music' AND abs(hashtext(l.id::text)) % 2 = 1
    THEN 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80&fit=crop&auto=format'

  -- ── Coding ─────────────────────────────────────────────────────
  WHEN c.slug = 'coding' AND abs(hashtext(l.id::text)) % 2 = 0
    THEN 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=80&fit=crop&auto=format'
  WHEN c.slug = 'coding' AND abs(hashtext(l.id::text)) % 2 = 1
    THEN 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800&q=80&fit=crop&auto=format'

  -- ── Arts & Crafts ──────────────────────────────────────────────
  WHEN c.slug IN ('arts','arts-crafts') AND abs(hashtext(l.id::text)) % 2 = 0
    THEN 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=800&q=80&fit=crop&auto=format'
  WHEN c.slug IN ('arts','arts-crafts') AND abs(hashtext(l.id::text)) % 2 = 1
    THEN 'https://images.unsplash.com/photo-1607453998774-d533f65dac99?w=800&q=80&fit=crop&auto=format'

  -- ── Languages ──────────────────────────────────────────────────
  WHEN c.slug IN ('language','languages') AND abs(hashtext(l.id::text)) % 2 = 0
    THEN 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80&fit=crop&auto=format'
  WHEN c.slug IN ('language','languages') AND abs(hashtext(l.id::text)) % 2 = 1
    THEN 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=800&q=80&fit=crop&auto=format'

  -- ── Chess ──────────────────────────────────────────────────────
  WHEN c.slug = 'chess' AND abs(hashtext(l.id::text)) % 2 = 0
    THEN 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&q=80&fit=crop&auto=format'
  WHEN c.slug = 'chess' AND abs(hashtext(l.id::text)) % 2 = 1
    THEN 'https://images.unsplash.com/photo-1528819622765-d6bcf132f793?w=800&q=80&fit=crop&auto=format'

  -- ── Gymnastics ─────────────────────────────────────────────────
  WHEN c.slug IN ('gym','gymnastics') AND abs(hashtext(l.id::text)) % 2 = 0
    THEN 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80&fit=crop&auto=format'
  WHEN c.slug IN ('gym','gymnastics') AND abs(hashtext(l.id::text)) % 2 = 1
    THEN 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=800&q=80&fit=crop&auto=format'

  -- ── Babysitting ────────────────────────────────────────────────
  WHEN c.slug = 'babysitting' AND abs(hashtext(l.id::text)) % 2 = 0
    THEN 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800&q=80&fit=crop&auto=format'
  WHEN c.slug = 'babysitting' AND abs(hashtext(l.id::text)) % 2 = 1
    THEN 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800&q=80&fit=crop&auto=format'

  -- ── Other / fallback ───────────────────────────────────────────
  ELSE NULL
END
FROM public.categories c
WHERE l.category_id = c.id
  -- Skip ~40 % deterministically (listings whose hash ends in 6,7,8,9)
  AND abs(hashtext(l.id::text)) % 10 < 6;
