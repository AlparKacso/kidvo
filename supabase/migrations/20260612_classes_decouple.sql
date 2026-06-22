-- ================================================================
-- Decouple Classes from Listings (storefront model)
-- A listing may now front MANY classes (or none); classes are the
-- provider's manually-managed unit. Drop the 1-class-per-listing cap.
-- Waitlist stays listing-level; rosters/offers stay per-class.
-- Additive + idempotent. See plan: classes-decouple Phase 1.
-- ================================================================

-- Was: one "listed" class per listing (unique). Now a listing can front many.
DROP INDEX IF EXISTS public.classes_listing_id_uidx;

-- Keep a (non-unique) index for the listing -> classes lookup.
CREATE INDEX IF NOT EXISTS classes_listing_id_idx
  ON public.classes(listing_id) WHERE listing_id IS NOT NULL;
