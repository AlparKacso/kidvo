import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET /api/cron/expire-offers — called daily by Vercel Cron (see vercel.json).
// Frees waitlist offers that the family never responded to, so the spot can go
// to the next family.
//
// Offers only carry an `expires_at` when WAITLIST_OFFER_EXPIRY_DAYS is set at
// creation time (see /api/offers). When it's unset, no offer ever expires and
// this cron is a no-op — so enabling expiry is a pure config switch with no code
// change and no behavioural surprise.
//
// For each pending offer past its expiry: mark it 'expired', drop the offered
// roster member, and return the waitlist entry to the pool ('waiting').
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data: stale, error } = await supabase
    .from('offers')
    .select('id, waitlist_entry_id, roster_member_id')
    .eq('phase', 'pending')
    .not('expires_at', 'is', null)
    .lt('expires_at', nowIso)
  if (error) {
    console.error('[expire-offers] select error:', error.message)
    return NextResponse.json({ error: 'Failed to load offers' }, { status: 500 })
  }

  const offers = (stale ?? []) as { id: string; waitlist_entry_id: string; roster_member_id: string | null }[]
  if (offers.length === 0) return NextResponse.json({ ok: true, expired: 0 })

  const memberIds = offers.map(o => o.roster_member_id).filter(Boolean) as string[]
  const entryIds  = offers.map(o => o.waitlist_entry_id)

  await supabase.from('offers').update({ phase: 'expired', responded_at: nowIso }).in('id', offers.map(o => o.id))
  if (memberIds.length > 0) await supabase.from('roster_members').delete().in('id', memberIds)
  // Only return entries that are still 'offered' (an entry the family meanwhile
  // accepted/enrolled, or the provider removed, must not be reset to waiting).
  await supabase.from('waitlist_entries').update({ status: 'waiting' }).in('id', entryIds).eq('status', 'offered')

  console.log(`[expire-offers] expired ${offers.length} offer(s)`)
  return NextResponse.json({ ok: true, expired: offers.length })
}
