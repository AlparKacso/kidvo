import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import { extractJsonLdEvents } from '@/lib/scrapers/jsonld'
import { SOURCE_ADAPTERS } from '@/lib/scrapers/sources'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// TEMPORARY diagnostic — reports exactly what the Vercel runtime receives
// from each source (to confirm bot-challenge / empty-page suspicion).
// Bearer-protected like the real cron. No DB writes. Delete after use.
const TARGETS = [
  { name: 'onevent',     url: 'https://www.onevent.ro/timisoara/copii-si-parinti/' },
  { name: 'zilesinopti', url: 'https://zilesinopti.ro/evenimente-copii-timisoara/' },
]

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const out: Record<string, unknown>[] = []
  for (const t of TARGETS) {
    try {
      const res = await fetch(t.url, {
        headers: { 'User-Agent': 'kidvo-events-bot/1.0 (+https://kidvo.eu)', Accept: 'text/html' },
        signal: AbortSignal.timeout(15_000),
      })
      const body = await res.text()
      const $ = cheerio.load(body)
      out.push({
        name: t.name,
        httpStatus: res.status,
        bytes: body.length,
        title: $('title').first().text().trim().slice(0, 120),
        ldJsonBlocks: $('script[type="application/ld+json"]').length,
        detailAnchors: $('a[href*="/evenimente/"]').length,
        eventNodes: extractJsonLdEvents(body, t.name).length,
        bodyHead: body.replace(/\s+/g, ' ').slice(0, 200),
      })
    } catch (e) {
      out.push({ name: t.name, error: e instanceof Error ? e.message : String(e) })
    }
  }

  // Exercise the REAL adapter path (the same code the cron runs) so we can
  // compare raw-fetch vs adapter output on the identical deployment.
  const adapters: Record<string, unknown>[] = []
  for (const a of SOURCE_ADAPTERS) {
    if (!a.enabled) continue
    try {
      const evs = await a.fetchEvents()
      adapters.push({ name: a.name, count: evs.length, sample: evs.slice(0, 3).map(e => ({ title: e.title, startAt: e.startAt, venue: e.venue })) })
    } catch (e) {
      adapters.push({ name: a.name, error: e instanceof Error ? e.message : String(e) })
    }
  }
  return NextResponse.json({ ok: true, probes: out, adapters })
}
