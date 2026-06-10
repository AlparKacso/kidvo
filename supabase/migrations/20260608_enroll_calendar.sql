-- ================================================================
-- Enroll & Calendar (parent milestone)
-- Builds on 20260602_waitlist.sql. Three additive changes:
--   1. roster_members gains a `requested` status (enroll request-to-confirm)
--      and a `declined` terminal status.
--   2. Parents can READ their own children's roster rows + the classes they
--      sit on, so the family calendar can render enrolled/pending blocks.
--      (v1 RLS was provider-only — a parent couldn't see their own enrolment.)
--   3. A `notifications` table backs the in-app waitlist offer / enroll updates.
--      The email loop stays as the fallback delivery channel.
-- ================================================================

-- ── 1. roster_members.status: add `requested` + `declined` ───────
-- `requested` = a parent's enroll request awaiting provider confirmation
--   (shows as a dashed "pending" block on the family calendar).
-- `declined`  = provider turned the request down (filtered out of reads).
ALTER TABLE public.roster_members DROP CONSTRAINT IF EXISTS roster_members_status_check;
ALTER TABLE public.roster_members ADD  CONSTRAINT roster_members_status_check
  CHECK (status IN ('offered', 'enrolled', 'requested', 'declined'));

-- ── 2. NO parent-select RLS on roster_members / classes ─────────
-- The family calendar reads these server-side through the service-role
-- read model (src/lib/familyCalendar.ts), scoped to the authenticated user.
-- We deliberately add NO parent policies here: a classes parent-select that
-- references roster_members (which references classes via the provider policy)
-- triggers Postgres "infinite recursion detected in policy for relation
-- classes" and breaks ALL classes reads (incl. the provider manager). The two
-- DROPs below remove any earlier, recursive version of these policies.
DROP POLICY IF EXISTS "roster_parent_select" ON public.roster_members;
DROP POLICY IF EXISTS "classes_parent_select" ON public.classes;

-- ── 3. notifications ─────────────────────────────────────────────
-- In-app delivery for the waitlist offer and enroll/roster updates. Rows are
-- inserted server-side (service-role client, which bypasses RLS); the parent
-- reads and marks-read their own. payload is type-specific (offer token, class,
-- child, listing, etc.).
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  payload     JSONB       NOT NULL DEFAULT '{}',
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx
  ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_admin" ON public.notifications;
-- Parent reads their own notifications.
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);
-- Parent marks their own notifications read (read_at). No INSERT policy —
-- creation runs through the service-role client.
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_select_admin" ON public.notifications FOR SELECT
  USING (public.is_admin());

-- ── 4. waitlist_position() — 1-based FCFS rank among waiting families ─
-- SECURITY DEFINER so a parent can learn their own position ("you're #3")
-- without an RLS policy that would expose other families' waitlist rows.
-- Counts still-waiting entries for the same listing created at or before this
-- one. Returns NULL for a non-existent / non-waiting entry.
CREATE OR REPLACE FUNCTION public.waitlist_position(p_entry_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT count(*)::int
  FROM public.waitlist_entries w
  WHERE w.status = 'waiting'
    AND w.listing_id = (SELECT listing_id FROM public.waitlist_entries WHERE id = p_entry_id AND status = 'waiting')
    AND w.created_at <= (SELECT created_at FROM public.waitlist_entries WHERE id = p_entry_id AND status = 'waiting')
$$;
