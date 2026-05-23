import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET /api/cron/cleanup-past-events — called daily by Vercel Cron at
// 02:00 UTC (see vercel.json). Hard-deletes any event listing whose
// `event_end_at` is already in the past, so /events always starts with
// today's content and the DB doesn't accumulate dead rows.
//
// In-progress events (started, not yet ended) are kept — they remain on
// /events and the /browse band until their actual end time.
//
// event_drafts.promoted_listing_id has ON DELETE SET NULL, so the
// drafts that produced these listings survive (audit trail of approvals).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from('listings')
    .delete()
    .eq('type', 'event')
    .lt('event_end_at', nowIso)
    .select('id')

  if (error) {
    console.error('[cleanup-past-events] delete error:', error.message)
    return NextResponse.json({ error: 'Failed to delete past events' }, { status: 500 })
  }

  const deleted = data?.length ?? 0
  if (deleted > 0) {
    console.log(`[cleanup-past-events] deleted ${deleted} past event listing(s)`)
  }

  return NextResponse.json({ ok: true, deleted })
}
