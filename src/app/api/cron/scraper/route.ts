import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNewEventDraftsToAdmin } from '@/lib/email'
import { SOURCE_ADAPTERS } from '@/lib/scrapers/sources'
import { dedupHash } from '@/lib/scrapers/dedup'
import { eventFingerprint } from '@/lib/scrapers/fingerprint'
import { eventsEnabled } from '@/lib/eventsEnabled'

export const dynamic = 'force-dynamic'
// Per-source, idempotent (dedup_hash UNIQUE) — safe if a run is cut short.
export const maxDuration = 60

// GET /api/cron/scraper — called daily by Vercel Cron (see vercel.json).
// Scrapes each enabled source, upserts new events into event_drafts for
// admin review. Nothing reaches the public site without approval.
//
// Cross-source dedup: before inserting, we drop any RawEvent whose
// `fingerprint` already exists on a pending draft OR an active/pending/
// paused listing. The `scraper:X` source's per-row dedup_hash still
// guards against within-source double-inserts.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Kill-switch: when events are disabled, the cron does nothing — no fetches,
  // no drafts inserted, no admin emails. Vercel still hits the route daily;
  // we just no-op until NEXT_PUBLIC_EVENTS_ENABLED is unset/true.
  if (!eventsEnabled()) {
    return NextResponse.json({ ok: true, disabled: true })
  }

  const supabase = createAdminClient()

  // Snapshot blocking fingerprints once per run. Rejected drafts and
  // 'draft'-status (admin-rejected) listings do NOT block — re-scraping
  // an event that was previously rejected is allowed to re-surface.
  const [draftsFp, listingsFp] = await Promise.all([
    supabase.from('event_drafts').select('fingerprint').eq('status', 'new').not('fingerprint', 'is', null),
    supabase.from('listings').select('fingerprint').eq('type', 'event').in('status', ['active', 'pending', 'paused']).not('fingerprint', 'is', null),
  ])
  const blocking = new Set<string>()
  for (const r of (draftsFp.data ?? []) as { fingerprint: string | null }[]) {
    if (r.fingerprint) blocking.add(r.fingerprint)
  }
  for (const r of (listingsFp.data ?? []) as { fingerprint: string | null }[]) {
    if (r.fingerprint) blocking.add(r.fingerprint)
  }

  // Belt-and-braces past-event filter: each adapter SHOULD drop past
  // events itself (JSON-LD helper does; timisoreni does), but if a new
  // adapter forgets, this layer still catches it before insert. 24h grace
  // window matches the helper.
  const pastCutoffMs = Date.now() - 24 * 60 * 60 * 1000

  const perSource: Record<string, number> = {}
  const skippedCrossSource: Record<string, number> = {}
  const skippedPast: Record<string, number> = {}
  let totalNew = 0

  for (const adapter of SOURCE_ADAPTERS) {
    if (!adapter.enabled) continue
    const source = `scraper:${adapter.name}`
    try {
      const events = await adapter.fetchEvents()
      if (events.length === 0) { perSource[adapter.name] = 0; continue }

      let skipped = 0
      let pastSkipped = 0
      const rows = events.flatMap(ev => {
        // Reject events whose end (or start, when no end) is already in the past.
        const endMs = ev.endAt ? new Date(ev.endAt).getTime()
                   : ev.startAt ? new Date(ev.startAt).getTime() : NaN
        if (Number.isFinite(endMs) && endMs < pastCutoffMs) { pastSkipped++; return [] }

        const fp = eventFingerprint({ title: ev.title, startAt: ev.startAt ?? null, venueName: ev.venue ?? null })
        if (fp && blocking.has(fp)) { skipped++; return [] }
        if (fp) blocking.add(fp) // also dedup within the same adapter run
        return [{
          source,
          fingerprint:     fp || null,
          external_id:     ev.externalId,
          dedup_hash:      dedupHash(source, ev.externalId),
          raw_payload:     ev,
          title:           ev.title,
          description:     ev.description ?? null,
          event_start_at:  ev.startAt ?? null,
          event_end_at:    ev.endAt ?? null,
          event_url:       ev.url ?? null,
          venue_name:      ev.venue ?? null,
          price_label:     ev.priceLabel ?? null,
          organizer_name:  ev.organizer ?? null,
          cover_image_url: ev.coverImageUrl ?? null,
        }]
      })
      skippedCrossSource[adapter.name] = skipped
      skippedPast[adapter.name] = pastSkipped

      if (rows.length === 0) { perSource[adapter.name] = 0; continue }

      // ignoreDuplicates → re-seen events (same dedup_hash) are skipped;
      // .select() returns only the rows actually inserted.
      const { data, error } = await supabase
        .from('event_drafts')
        .upsert(rows, { onConflict: 'dedup_hash', ignoreDuplicates: true })
        .select('id')

      if (error) {
        console.error(`[scraper] ${source} upsert error:`, error.message)
        perSource[adapter.name] = -1
        continue
      }
      const n = data?.length ?? 0
      perSource[adapter.name] = n
      totalNew += n
    } catch (e) {
      console.error(`[scraper] ${source} failed:`, e instanceof Error ? e.message : e)
      perSource[adapter.name] = -1
    }
  }

  if (totalNew > 0) {
    const sources = Object.entries(perSource).filter(([, n]) => n > 0).map(([s]) => s).join(', ')
    sendNewEventDraftsToAdmin({ count: totalNew, source: sources || 'scraper' })
      .catch(err => console.error('[scraper] admin email error:', err))
  }

  return NextResponse.json({ ok: true, totalNew, perSource, skippedCrossSource, skippedPast })
}
