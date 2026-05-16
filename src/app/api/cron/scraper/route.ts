import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNewEventDraftsToAdmin } from '@/lib/email'
import { SOURCE_ADAPTERS } from '@/lib/scrapers/sources'
import { dedupHash } from '@/lib/scrapers/dedup'

export const dynamic = 'force-dynamic'
// Per-source, idempotent (dedup_hash UNIQUE) — safe if a run is cut short.
export const maxDuration = 60

// GET /api/cron/scraper — called daily by Vercel Cron (see vercel.json).
// Scrapes each enabled source, upserts new events into event_drafts for
// admin review. Nothing reaches the public site without approval.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const perSource: Record<string, number> = {}
  let totalNew = 0

  for (const adapter of SOURCE_ADAPTERS) {
    if (!adapter.enabled) continue
    const source = `scraper:${adapter.name}`
    try {
      const events = await adapter.fetchEvents()
      if (events.length === 0) { perSource[adapter.name] = 0; continue }

      const rows = events.map(ev => ({
        source,
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
      }))

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

  return NextResponse.json({ ok: true, totalNew, perSource })
}
