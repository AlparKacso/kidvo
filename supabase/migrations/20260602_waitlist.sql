-- ================================================================
-- Waitlist & "Classes & waitlist" manager
-- New tables: classes, waitlist_entries, roster_members, offers
-- ================================================================

-- ── classes ─────────────────────────────────────────────────────
-- Unified roster home. listing_id set = "listed" (auto-synced from an
-- active listing); listing_id NULL = "manual" (provider-created group).
CREATE TABLE IF NOT EXISTS public.classes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  UUID        NOT NULL REFERENCES public.providers(id)  ON DELETE CASCADE,
  listing_id   UUID        REFERENCES public.listings(id)            ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  category_id  UUID        REFERENCES public.categories(id)          ON DELETE SET NULL,
  area_id      UUID        REFERENCES public.areas(id)               ON DELETE SET NULL,
  age_min      INTEGER,
  age_max      INTEGER,
  capacity     INTEGER,
  days         INTEGER[]   NOT NULL DEFAULT '{}',  -- 0-6 (Mon-Sun)
  time_start   TEXT,
  time_end     TEXT,
  language     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One class per listing (manual classes have NULL listing_id and are exempt).
CREATE UNIQUE INDEX IF NOT EXISTS classes_listing_id_uidx
  ON public.classes(listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS classes_provider_id_idx ON public.classes(provider_id);

-- ── waitlist_entries ────────────────────────────────────────────
-- Parent-facing. Created when a parent joins the waitlist for a full /
-- at-capacity listing. Position is computed at read time (not stored).
CREATE TABLE IF NOT EXISTS public.waitlist_entries (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     UUID        NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  child_id       UUID        REFERENCES public.children(id)          ON DELETE SET NULL,
  child_name     TEXT        NOT NULL,
  child_age      INTEGER,
  preferred_days INTEGER[]   NOT NULL DEFAULT '{}',
  note           TEXT,
  contact_name   TEXT,
  contact_phone  TEXT,
  contact_email  TEXT,
  status         TEXT        NOT NULL DEFAULT 'waiting'
                             CHECK (status IN ('waiting', 'offered', 'enrolled', 'removed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS waitlist_entries_listing_id_idx ON public.waitlist_entries(listing_id);
CREATE INDEX IF NOT EXISTS waitlist_entries_user_id_idx    ON public.waitlist_entries(user_id);

-- ── roster_members ──────────────────────────────────────────────
-- Who is on a class roster. source: kidvo (accepted waitlist offer),
-- trial (auto-enrolled confirmed trial request), offline (added manually).
-- Occupancy = count where status IN ('offered','enrolled').
CREATE TABLE IF NOT EXISTS public.roster_members (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id          UUID        NOT NULL REFERENCES public.classes(id)         ON DELETE CASCADE,
  source            TEXT        NOT NULL CHECK (source IN ('kidvo', 'trial', 'offline')),
  status            TEXT        NOT NULL DEFAULT 'enrolled'
                                CHECK (status IN ('offered', 'enrolled')),
  waitlist_entry_id UUID        REFERENCES public.waitlist_entries(id) ON DELETE SET NULL,
  trial_request_id  UUID        REFERENCES public.trial_requests(id)   ON DELETE SET NULL,
  child_id          UUID        REFERENCES public.children(id)         ON DELETE SET NULL,
  child_name        TEXT        NOT NULL,
  child_age         INTEGER,
  contact_name      TEXT,
  contact_phone     TEXT,
  contact_email     TEXT,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS roster_members_class_id_idx ON public.roster_members(class_id);
-- A confirmed trial request auto-enrolls at most once.
CREATE UNIQUE INDEX IF NOT EXISTS roster_members_trial_request_uidx
  ON public.roster_members(trial_request_id) WHERE trial_request_id IS NOT NULL;

-- ── offers ──────────────────────────────────────────────────────
-- Drives the email offer loop. The token backs the no-auth Accept /
-- Can't-make-it landing page (kidvo has no in-app notifications yet).
CREATE TABLE IF NOT EXISTS public.offers (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_entry_id UUID        NOT NULL REFERENCES public.waitlist_entries(id) ON DELETE CASCADE,
  roster_member_id  UUID        REFERENCES public.roster_members(id)            ON DELETE SET NULL,
  class_id          UUID        NOT NULL REFERENCES public.classes(id)          ON DELETE CASCADE,
  token             TEXT        NOT NULL UNIQUE,
  phase             TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (phase IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS offers_waitlist_entry_idx ON public.offers(waitlist_entry_id);
CREATE INDEX IF NOT EXISTS offers_class_id_idx       ON public.offers(class_id);


-- ================================================================
-- Row Level Security
-- ================================================================

-- classes — a provider owns the classes tied to their provider row.
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "classes_all_own_provider" ON public.classes;
DROP POLICY IF EXISTS "classes_select_admin"     ON public.classes;
CREATE POLICY "classes_all_own_provider" ON public.classes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.providers p WHERE p.id = classes.provider_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.providers p WHERE p.id = classes.provider_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "classes_select_admin" ON public.classes FOR SELECT USING (public.is_admin());

-- waitlist_entries — parent owns their entries; provider reads/updates
-- entries for their own listings.
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "waitlist_parent_insert"   ON public.waitlist_entries;
DROP POLICY IF EXISTS "waitlist_parent_select"   ON public.waitlist_entries;
DROP POLICY IF EXISTS "waitlist_provider_select" ON public.waitlist_entries;
DROP POLICY IF EXISTS "waitlist_provider_update" ON public.waitlist_entries;
DROP POLICY IF EXISTS "waitlist_select_admin"    ON public.waitlist_entries;
CREATE POLICY "waitlist_parent_insert" ON public.waitlist_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "waitlist_parent_select" ON public.waitlist_entries FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "waitlist_provider_select" ON public.waitlist_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.listings l
    JOIN public.providers p ON p.id = l.provider_id
    WHERE l.id = waitlist_entries.listing_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "waitlist_provider_update" ON public.waitlist_entries FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.listings l
    JOIN public.providers p ON p.id = l.provider_id
    WHERE l.id = waitlist_entries.listing_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "waitlist_select_admin" ON public.waitlist_entries FOR SELECT USING (public.is_admin());

-- roster_members — a provider owns members of their own classes.
ALTER TABLE public.roster_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "roster_all_own_provider" ON public.roster_members;
DROP POLICY IF EXISTS "roster_select_admin"     ON public.roster_members;
CREATE POLICY "roster_all_own_provider" ON public.roster_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.classes c
    JOIN public.providers p ON p.id = c.provider_id
    WHERE c.id = roster_members.class_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.classes c
    JOIN public.providers p ON p.id = c.provider_id
    WHERE c.id = roster_members.class_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "roster_select_admin" ON public.roster_members FOR SELECT USING (public.is_admin());

-- offers — a provider owns offers on their own classes. The public
-- Accept/Decline path runs through the admin (service-role) client, which
-- bypasses RLS, so no anonymous policy is needed here.
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offers_all_own_provider" ON public.offers;
DROP POLICY IF EXISTS "offers_select_admin"     ON public.offers;
CREATE POLICY "offers_all_own_provider" ON public.offers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.classes c
    JOIN public.providers p ON p.id = c.provider_id
    WHERE c.id = offers.class_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.classes c
    JOIN public.providers p ON p.id = c.provider_id
    WHERE c.id = offers.class_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "offers_select_admin" ON public.offers FOR SELECT USING (public.is_admin());
