import * as cheerio from 'cheerio'
import type { RawEvent } from './types'

const UA = 'kidvo-events-bot/1.0 (+https://kidvo.eu)'

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    signal: AbortSignal.timeout(15_000),
    // Scrapers must always hit the live site — Next.js App Router caches
    // fetch() by default, which would serve a stale/empty body on repeat runs.
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.text()
}

// Decode HTML entities + strip tags (WordPress JSON-LD often double-encodes).
function clean(s: unknown): string {
  if (s == null) return ''
  let t = cheerio.load(`<r>${String(s)}</r>`).root().text()
  if (/&[a-z#0-9]+;/i.test(t)) t = cheerio.load(`<r>${t}</r>`).root().text()
  return t.replace(/\s+/g, ' ').trim()
}

// Tolerant ISO parser. Handles both '2026-05-24T11:00:00+03:00' and
// onevent's loose '2026-5-19T16:00+3:00'. Defaults to Europe/Bucharest
// summer offset only if the source omits one (real data includes it).
function toIso(v: unknown): string | null {
  if (!v) return null
  const s = String(v)
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(Z|[+-]\d{1,2}:?\d{2})?/)
  if (!m) { const d = new Date(s); return isNaN(d.getTime()) ? null : d.toISOString() }
  const [, Y, Mo, D, h, mi, se, tzRaw] = m
  let off = '+03:00'
  if (tzRaw) {
    if (tzRaw === 'Z') off = 'Z'
    else {
      const t = tzRaw.replace(':', '')
      const sign = t[0]
      const digits = t.slice(1).padStart(4, '0')
      off = `${sign}${digits.slice(0, 2)}:${digits.slice(2)}`
    }
  }
  const iso = `${Y}-${Mo.padStart(2, '0')}-${D.padStart(2, '0')}T${h.padStart(2, '0')}:${mi}:${se || '00'}${off === 'Z' ? 'Z' : off}`
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

function firstImage(img: unknown): string | null {
  if (!img) return null
  if (typeof img === 'string') return img
  if (Array.isArray(img)) return firstImage(img[0])
  if (typeof img === 'object') return firstImage((img as { url?: unknown }).url)
  return null
}

function venueOf(loc: unknown): string | null {
  if (!loc) return null
  if (typeof loc === 'string') return clean(loc) || null
  if (Array.isArray(loc)) return venueOf(loc[0])
  const o = loc as { name?: string; address?: unknown }
  if (o.name) return clean(o.name) || null
  if (typeof o.address === 'string') return clean(o.address) || null
  const a = o.address as { streetAddress?: string } | undefined
  return a?.streetAddress ? clean(a.streetAddress) : null
}

function orgOf(org: unknown): string | null {
  if (!org) return null
  if (typeof org === 'string') return clean(org) || null
  if (Array.isArray(org)) return orgOf(org[0])
  return clean((org as { name?: string }).name) || null
}

const isEventType = (t: unknown): boolean =>
  ([] as unknown[]).concat(t ?? []).some(x => typeof x === 'string' && /event/i.test(x))

// Walk arbitrary JSON-LD (objects, arrays, @graph) collecting Event-ish nodes.
function collectEvents(node: unknown, out: Record<string, unknown>[]): void {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) { node.forEach(n => collectEvents(n, out)); return }
  const o = node as Record<string, unknown>
  if (isEventType(o['@type'])) out.push(o)
  if (o['@graph']) collectEvents(o['@graph'], out)
  for (const v of Object.values(o)) if (v && typeof v === 'object') collectEvents(v, out)
}

/**
 * Parse all schema.org Event/ChildrensEvent JSON-LD from a page into
 * normalized RawEvents. Skips past events and anything missing a
 * title or a parseable start time.
 */
export function extractJsonLdEvents(html: string, source: string): RawEvent[] {
  const $ = cheerio.load(html)
  const nodes: Record<string, unknown>[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    let txt = $(el).contents().text().trim()
    if (!txt) return
    // Strip CDATA wrappers — iabilet emits `/*<![CDATA[*/{...}/*]]>*/`;
    // plain `<![CDATA[...]]>` also seen elsewhere. JSON.parse fails on these
    // unless we peel them off first.
    txt = txt.replace(/^\/\*<!\[CDATA\[\*\/\s*/, '').replace(/\s*\/\*\]\]>\*\/$/, '')
    txt = txt.replace(/^<!\[CDATA\[\s*/, '').replace(/\s*\]\]>$/, '')
    try { collectEvents(JSON.parse(txt), nodes) } catch { /* skip bad block */ }
  })

  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  const seen = new Set<string>()
  const events: RawEvent[] = []

  for (const o of nodes) {
    const title = clean(o.name)
    const startAt = toIso(o.startDate)
    if (!title || !startAt) continue

    let endAt = toIso(o.endDate)
    if (!endAt) endAt = new Date(new Date(startAt).getTime() + 3 * 3600_000).toISOString()
    if (new Date(endAt).getTime() < cutoff) continue // already over

    const url = typeof o.url === 'string' ? o.url : null
    const externalId = `${url || title}::${startAt}`
    if (seen.has(externalId)) continue
    seen.add(externalId)

    const desc = clean(o.description)
    events.push({
      externalId,
      title,
      description: desc ? desc.slice(0, 2000) : null,
      url,
      startAt,
      endAt,
      venue: venueOf(o.location),
      priceLabel: null,
      organizer: orgOf(o.organizer),
      coverImageUrl: firstImage(o.image),
    })
  }
  void source
  return events
}
