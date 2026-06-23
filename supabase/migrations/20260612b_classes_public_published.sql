-- ================================================================
-- Classes decouple — Phase 2: published classes are public
-- A class fronted by a listing (listing_id IS NOT NULL) is public storefront
-- info, so anyone may read it (the listing detail shows the class schedule).
-- Simple column predicate — no cross-table reference, so NO RLS recursion
-- (unlike the earlier parent-select attempt on classes/roster_members).
-- Roster_members stay provider-only.
-- ================================================================

DROP POLICY IF EXISTS "classes_select_published" ON public.classes;
CREATE POLICY "classes_select_published" ON public.classes FOR SELECT
  USING (listing_id IS NOT NULL);
