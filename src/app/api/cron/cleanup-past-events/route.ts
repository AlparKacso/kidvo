import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET /api/cron/cleanup-past-events — called daily by Vercel Cron at
// 02:00 UTC (see vercel.json). Hard-deletes:
//   1. event listings whose `event_end_at` is already in the past
//   2. event_drafts in status 'new' or 'rejected' whose `event_end_at`
//      is already in the past — so the review queue doesn't accumulate
//      stale rows scraped from sources that include historical entries
//      (timisoreni in particular).
//
// In-progress events (started, not yet ended) are kept — they remain on
// /events and the /browse band until their actual end time.
//
// event_drafts.promoted_listing_id has ON DELETE SET NULL, so the
// 'approved' drafts that produced these listings survive (audit trail
// of approvals).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const nowIso = new Date().toISOString()

  // ── 1. Past event listings ────────────────────────────────────────────
  const { data: lst, error: lstErr } = await supabase
    .from('listings')
    .delete()
    .eq('type', 'event')
    .lt('event_end_at', nowIso)
    .select('id')

  if (lstErr) {
    console.error('[cleanup-past-events] listings delete error:', lstErr.message)
    return NextResponse.json({ error: 'Failed to delete past listings' }, { status: 500 })
  }
  const deletedListings = lst?.length ?? 0

  // ── 2. Past pending/rejected drafts ──────────────────────────────────
  const { data: drf, error: drfErr } = await supabase
    .from('event_drafts')
    .delete()
    .in('status', ['new', 'rejected'])
    .lt('event_end_at', nowIso)
    .select('id')

  if (drfErr) {
    console.error('[cleanup-past-events] drafts delete error:', drfErr.message)
    return NextResponse.json(
      { error: 'Failed to delete past drafts', detail: drfErr.message, deletedListings },
      { status: 500 },
    )
  }
  const deletedDrafts = drf?.length ?? 0

  if (deletedListings > 0 || deletedDrafts > 0) {
    console.log(`[cleanup-past-events] deleted ${deletedListings} listings, ${deletedDrafts} drafts`)
  }

  return NextResponse.json({ ok: true, deletedListings, deletedDrafts })
}
