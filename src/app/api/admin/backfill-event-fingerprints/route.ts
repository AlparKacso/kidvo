import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { eventFingerprint } from '@/lib/scrapers/fingerprint'

const ADMIN_EMAIL = 'alpar.kacso@gmail.com'

// POST /api/admin/backfill-event-fingerprints — admin-only, one-shot.
// Computes the cross-source `fingerprint` for every event row (in both
// `event_drafts` and `listings`) whose value is currently NULL. Lets the
// dedup check (added in 20260524) actually fire against historical rows.
//
// Idempotent — re-runs just re-process the still-NULL rows. Safe to hit
// repeatedly. Bypasses RLS via the service role.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userRow } = await supabase.from('users').select('email').eq('id', user.id).single()
  if ((userRow as { email?: string } | null)?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminDb = createAdminClient()

  // ── event_drafts ──────────────────────────────────────────────────────────
  const { data: drafts, error: dErr } = await adminDb
    .from('event_drafts')
    .select('id, title, event_start_at, venue_name')
    .is('fingerprint', null)

  if (dErr) {
    console.error('[backfill-fingerprints] event_drafts fetch error:', dErr.message)
    return NextResponse.json({ error: 'Failed to read drafts', detail: dErr.message }, { status: 500 })
  }

  let draftsUpdated = 0
  for (const row of (drafts ?? []) as Array<{ id: string; title: string | null; event_start_at: string | null; venue_name: string | null }>) {
    const fp = eventFingerprint({ title: row.title, startAt: row.event_start_at, venueName: row.venue_name })
    if (!fp) continue
    const { error: uErr } = await adminDb.from('event_drafts').update({ fingerprint: fp }).eq('id', row.id)
    if (uErr) {
      console.error('[backfill-fingerprints] draft update error:', row.id, uErr.message)
      continue
    }
    draftsUpdated++
  }

  // ── listings (events only) ────────────────────────────────────────────────
  const { data: listings, error: lErr } = await adminDb
    .from('listings')
    .select('id, title, event_start_at, venue_name')
    .eq('type', 'event')
    .is('fingerprint', null)

  if (lErr) {
    console.error('[backfill-fingerprints] listings fetch error:', lErr.message)
    return NextResponse.json(
      { error: 'Failed to read listings', detail: lErr.message, draftsUpdated },
      { status: 500 },
    )
  }

  let listingsUpdated = 0
  for (const row of (listings ?? []) as Array<{ id: string; title: string | null; event_start_at: string | null; venue_name: string | null }>) {
    const fp = eventFingerprint({ title: row.title, startAt: row.event_start_at, venueName: row.venue_name })
    if (!fp) continue
    const { error: uErr } = await adminDb.from('listings').update({ fingerprint: fp }).eq('id', row.id)
    if (uErr) {
      console.error('[backfill-fingerprints] listing update error:', row.id, uErr.message)
      continue
    }
    listingsUpdated++
  }

  return NextResponse.json({ ok: true, draftsUpdated, listingsUpdated })
}
