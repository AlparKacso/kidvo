-- ================================================================
-- kidvo — Complete Production Schema
-- Run this once in Supabase SQL Editor on a brand-new project.
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT DO NOTHING.
-- ================================================================


-- ================================================================
-- 1. CORE TABLES
-- ================================================================

-- users (mirrors auth.users, one row per account)
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  full_name   TEXT        NOT NULL,
  phone       TEXT,
  city        TEXT        NOT NULL DEFAULT 'Timișoara',
  role        TEXT        NOT NULL DEFAULT 'parent'
                          CHECK (role IN ('parent', 'provider', 'both', 'admin')),
  plan        TEXT        NOT NULL DEFAULT 'free'
                          CHECK (plan IN ('free', 'pro')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- areas (reference: Timișoara neighbourhoods)
CREATE TABLE IF NOT EXISTS public.areas (
  id    UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT  NOT NULL,
  slug  TEXT  NOT NULL UNIQUE
);

-- categories (activity types)
CREATE TABLE IF NOT EXISTS public.categories (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT    NOT NULL,
  slug         TEXT    NOT NULL UNIQUE,
  accent_color TEXT    NOT NULL DEFAULT '#8b5cf6',
  sort_order   INTEGER NOT NULL DEFAULT 0
);

-- children
CREATE TABLE IF NOT EXISTS public.children (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  birth_year   INTEGER     NOT NULL,
  school_grade TEXT,
  area_id      UUID        REFERENCES public.areas(id) ON DELETE SET NULL,
  interests    TEXT[]      NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- child_interests (many-to-many: children ↔ categories)
CREATE TABLE IF NOT EXISTS public.child_interests (
  child_id    UUID        NOT NULL REFERENCES public.children(id)   ON DELETE CASCADE,
  category_id UUID        NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (child_id, category_id)
);

-- providers
CREATE TABLE IF NOT EXISTS public.providers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  display_name  TEXT        NOT NULL,
  bio           TEXT,
  contact_email TEXT        NOT NULL,
  contact_phone TEXT,
  plan          TEXT        NOT NULL DEFAULT 'free'
                            CHECK (plan IN ('free', 'featured')),
  verified      BOOLEAN     NOT NULL DEFAULT false,
  listed_since  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- listings
CREATE TABLE IF NOT EXISTS public.listings (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id           UUID        NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  category_id           UUID        NOT NULL REFERENCES public.categories(id),
  area_id               UUID        NOT NULL REFERENCES public.areas(id),
  title                 TEXT        NOT NULL,
  description           TEXT,
  age_min               INTEGER     NOT NULL DEFAULT 3,
  age_max               INTEGER     NOT NULL DEFAULT 18,
  price_monthly         NUMERIC     NOT NULL DEFAULT 0,
  pricing_type          TEXT        NOT NULL DEFAULT 'month'
                                    CHECK (pricing_type IN ('month', 'session')),
  spots_total           INTEGER,
  spots_available       INTEGER,
  address               TEXT,
  language              TEXT        NOT NULL DEFAULT 'Română',
  includes              TEXT[],
  trial_available       BOOLEAN     NOT NULL DEFAULT true,
  trial_disabled_reason TEXT,
  featured              BOOLEAN     NOT NULL DEFAULT false,
  status                TEXT        NOT NULL DEFAULT 'draft'
                                    CHECK (status IN ('draft', 'pending', 'active', 'paused')),
  cover_image_url       TEXT,
  maps_url              TEXT,
  published_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- listing_schedules
CREATE TABLE IF NOT EXISTS public.listing_schedules (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID    NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  time_start  TEXT    NOT NULL,
  time_end    TEXT    NOT NULL,
  group_label TEXT
);

-- listing_views (analytics)
CREATE TABLE IF NOT EXISTS public.listing_views (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID        NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_views_listing_id_idx ON public.listing_views(listing_id);
CREATE INDEX IF NOT EXISTS listing_views_viewed_at_idx  ON public.listing_views(viewed_at);

-- saves
CREATE TABLE IF NOT EXISTS public.saves (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  listing_id  UUID        NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  kid_id      UUID        REFERENCES public.children(id)          ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique: one save per (user, listing, kid)
CREATE UNIQUE INDEX IF NOT EXISTS saves_user_listing_kid_idx
  ON public.saves(user_id, listing_id, kid_id) WHERE kid_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS saves_user_listing_nokid_idx
  ON public.saves(user_id, listing_id) WHERE kid_id IS NULL;

-- trial_requests
CREATE TABLE IF NOT EXISTS public.trial_requests (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  listing_id    UUID        NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  child_id      UUID        REFERENCES public.children(id)          ON DELETE SET NULL,
  preferred_day INTEGER,
  message       TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at  TIMESTAMPTZ
);

-- contact_reveals (analytics)
CREATE TABLE IF NOT EXISTS public.contact_reveals (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID        NOT NULL REFERENCES public.listings(id)  ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  revealed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id)     ON DELETE CASCADE,
  listing_id  UUID        NOT NULL REFERENCES public.listings(id)  ON DELETE CASCADE,
  provider_id UUID        NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

-- tips (provider tips, static content)
CREATE TABLE IF NOT EXISTS public.tips (
  id    SERIAL PRIMARY KEY,
  body  TEXT   NOT NULL
);


-- ================================================================
-- 2. HELPER FUNCTION (admin check — SECURITY DEFINER)
-- ================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.users WHERE id = auth.uid()),
    false
  )
$$;


-- ================================================================
-- 3. ROW LEVEL SECURITY
-- ================================================================

-- users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own"   ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_own"   ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own"   ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_select_admin" ON public.users FOR SELECT USING (public.is_admin());

-- areas (public reference)
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "areas_select_public" ON public.areas FOR SELECT USING (true);

-- categories (public reference)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select_public" ON public.categories FOR SELECT USING (true);

-- children
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "children_all_own" ON public.children FOR ALL USING (auth.uid() = user_id);

-- child_interests
ALTER TABLE public.child_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "child_interests_all_own" ON public.child_interests FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.children c
    WHERE c.id = child_interests.child_id AND c.user_id = auth.uid()
  ));

-- providers
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "providers_select_public" ON public.providers FOR SELECT USING (true);
CREATE POLICY "providers_insert_own"    ON public.providers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "providers_update_own"    ON public.providers FOR UPDATE USING (auth.uid() = user_id);

-- listings
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listings_select_active"         ON public.listings FOR SELECT USING (status = 'active');
CREATE POLICY "listings_select_own_provider"   ON public.listings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.providers p
    WHERE p.id = listings.provider_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "listings_select_admin"          ON public.listings FOR SELECT USING (public.is_admin());
CREATE POLICY "listings_insert_own"            ON public.listings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "listings_update_own"            ON public.listings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "admin can update listing status" ON public.listings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "listings_delete_own"            ON public.listings FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()
  ));

-- listing_schedules
ALTER TABLE public.listing_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listing_schedules_select_public" ON public.listing_schedules FOR SELECT USING (true);
CREATE POLICY "listing_schedules_write_own"     ON public.listing_schedules FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.listings l
    JOIN public.providers p ON p.id = l.provider_id
    WHERE l.id = listing_schedules.listing_id AND p.user_id = auth.uid()
  ));

-- listing_views
ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listing_views_insert_public"    ON public.listing_views FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "listing_views_select_provider"  ON public.listing_views FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.listings l
    JOIN public.providers p ON p.id = l.provider_id
    WHERE l.id = listing_views.listing_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "listing_views_select_admin"     ON public.listing_views FOR SELECT
  USING (public.is_admin());

-- saves
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saves_all_own" ON public.saves FOR ALL USING (auth.uid() = user_id);

-- trial_requests
ALTER TABLE public.trial_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parents_insert_trial_requests" ON public.trial_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "parents_own_trial_requests"    ON public.trial_requests FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "parents_cancel_trial_requests" ON public.trial_requests FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "trial_requests_select_provider" ON public.trial_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.listings l
    JOIN public.providers p ON p.id = l.provider_id
    WHERE l.id = trial_requests.listing_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "trial_requests_update_provider" ON public.trial_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.listings l
    JOIN public.providers p ON p.id = l.provider_id
    WHERE l.id = trial_requests.listing_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "trial_requests_select_admin"    ON public.trial_requests FOR SELECT
  USING (public.is_admin());

-- contact_reveals
ALTER TABLE public.contact_reveals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_insert_own_contact_reveals" ON public.contact_reveals FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "providers_read_contact_reveals"   ON public.contact_reveals FOR SELECT
  TO authenticated
  USING (listing_id IN (
    SELECT l.id FROM public.listings l
    JOIN public.providers p ON p.id = l.provider_id
    WHERE p.user_id = auth.uid()
  ));

-- reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews are publicly readable"  ON public.reviews FOR SELECT USING (true);
CREATE POLICY "users can insert their own reviews" ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users can update own review"    ON public.reviews FOR UPDATE
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status IN ('pending', 'approved'));
CREATE POLICY "admin can update review status" ON public.reviews FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- tips
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tips_select_public" ON public.tips FOR SELECT USING (true);


-- ================================================================
-- 4. STORAGE BUCKET  (listing images)
-- ================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-images',
  'listing-images',
  true,
  5242880,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "providers_upload_listing_images"  ON storage.objects;
DROP POLICY IF EXISTS "providers_update_listing_images"  ON storage.objects;
DROP POLICY IF EXISTS "providers_delete_listing_images"  ON storage.objects;
DROP POLICY IF EXISTS "public_read_listing_images"       ON storage.objects;

CREATE POLICY "providers_upload_listing_images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-images');

CREATE POLICY "providers_update_listing_images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "providers_delete_listing_images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "public_read_listing_images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'listing-images');


-- ================================================================
-- 5. SEED — Reference data
-- ================================================================

-- Categories
INSERT INTO public.categories (name, slug, accent_color, sort_order) VALUES
  ('Sport',             'sport',       '#f97316', 1),
  ('Dans',              'dance',       '#ec4899', 2),
  ('Muzică',            'music',       '#8b5cf6', 3),
  ('Arte & Meșteșuguri','arts-crafts', '#14b8a6', 4),
  ('Programare',        'coding',      '#3b82f6', 5),
  ('Gimnastică',        'gymnastics',  '#f59e0b', 6),
  ('Limbi străine',     'languages',   '#10b981', 7),
  ('Altele',            'other',       '#6b7280', 8)
ON CONFLICT (slug) DO NOTHING;

-- Areas (Timișoara neighbourhoods + suburbs)
INSERT INTO public.areas (name, slug) VALUES
  ('Centru',                  'centru'),
  ('Fabric',                  'fabric'),
  ('Iosefin',                 'iosefin'),
  ('Freidorf',                'freidorf'),
  ('Elisabetin',              'elisabetin'),
  ('Mehala',                  'mehala'),
  ('Ronaț',                   'ronat'),
  ('Calea Lipovei',           'calea-lipovei'),
  ('Calea Șagului',           'calea-sagului'),
  ('Dacia',                   'dacia'),
  ('Torontal',                'torontal'),
  ('Complexul Studențesc',    'complexul-studentesc'),
  ('Circumvalațiunii',        'circumvalatiunii'),
  ('Dorobanților',            'dorobantilor'),
  ('Take Ionescu',            'take-ionescu'),
  ('Olimpia',                 'olimpia'),
  ('Lunei',                   'lunei'),
  ('Steaua',                  'steaua'),
  ('Plopi',                   'plopi'),
  ('Bega',                    'bega'),
  ('Fratelia',                'fratelia'),
  ('Calea Aradului',          'calea-aradului'),
  ('Ghiroda Nouă',            'ghiroda-noua'),
  ('Dumbrăvița',              'dumbravita'),
  ('Ghiroda',                 'ghiroda'),
  ('Giroc',                   'giroc'),
  ('Chișoda',                 'chisoda'),
  ('Moșnița Nouă',            'mosnita-noua'),
  ('Sânandrei',               'sanandrei'),
  ('Săcălaz',                 'sacalaz'),
  ('Lipova',                  'lipova')
ON CONFLICT (slug) DO NOTHING;

-- Tips (provider sidebar tips)
INSERT INTO public.tips (body) VALUES
  ('When confirming a trial, reach out to parents by phone if you have their number — it shows care and increases show-up rates.'),
  ('Keep your listing photos updated seasonally. Fresh visuals attract significantly more views.'),
  ('Respond to trial requests within 2 hours. Parents often contact multiple providers and choose whoever replies first.'),
  ('Add a detailed schedule to your listing — parents want to know exactly when and where activities happen before committing.'),
  ('Encourage happy parents to leave a review after a trial. Social proof is your best marketing tool.'),
  ('Make sure your listing description answers: What will my child learn? What age is it best for? What should they bring?')
ON CONFLICT DO NOTHING;
