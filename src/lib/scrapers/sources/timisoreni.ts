import type { RawEvent, SourceAdapter } from '../types'
import { bucharestLocalToUtcIso } from '@/lib/eventDate'

// timisoreni.ro is a Nuxt SPA — no HTML scraping; the page hydrates from a
// private API at api.timisoreni.ro that needs a bootstrapped token. The
// browser fetches /api/_token (public, ~no rate limit) and then signs every
// hub call with that token via X-Api-Token. We do the same.
//
// The hub endpoint exposes 4 curated sections (toate, astazi, weekend,
// populare) of up to 12 events each — there's no full-agenda paging. We
// merge across sections (dedupe by event id) and filter to two categories
// likely to contain kids-relevant content; the admin review queue catches
// any false positives.

const SITE      = 'https://www.timisoreni.ro'
const API_BASE  = 'https://api.timisoreni.ro/api'
const HUB_SLUG  = 'evenimente'
const UA        = 'kidvo-events-bot/1.0 (+https://kidvo.eu)'

// Categories that have produced kid-relevant events in practice. Skip:
//   - Filme  (mainstream movies; mostly adult-leaning, mixed with kid films)
//   - null   (uncategorized — Revelion, wine festival, etc.)
const KID_CATEGORIES = new Set(['Evenimente', 'Spectacole'])

interface ApiRepresentation {
  date_start_formatted?: string   // "YYYY-MM-DD HH:MM:SS"
  hour?:                 string   // "HH:MM" — single value for the kept categories
  location_name?:        string | null
}

interface ApiHubItem {
  id:              number
  name:            string
  url:             string         // slug → /eveniment/<url>/
  small_text?:     string | null
  category_name?:  string | null
  image?:          string | null
  representations?: ApiRepresentation[]
}

async function fetchToken(): Promise<string> {
  const res = await fetch(`${SITE}/api/_token`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal:  AbortSignal.timeout(10_000),
    cache:   'no-store',
  })
  if (!res.ok) throw new Error(`token ${res.status}`)
  const j = await res.json() as { token: string }
  if (!j.token) throw new Error('no token in /api/_token response')
  return j.token
}

async function fetchHubItems(token: string): Promise<ApiHubItem[]> {
  const res = await fetch(`${API_BASE}/hub?slug=${HUB_SLUG}&limit=200`, {
    headers: {
      'User-Agent':  UA,
      'X-Api-Token': token,
      Accept:        'application/json',
    },
    signal: AbortSignal.timeout(15_000),
    cache:  'no-store',
  })
  if (!res.ok) throw new Error(`hub ${res.status}`)
  const j = await res.json() as { data?: { sections?: Record<string, ApiHubItem[]> } }
  const byId = new Map<number, ApiHubItem>()
  for (const list of Object.values(j.data?.sections ?? {})) {
    for (const item of list) byId.set(item.id, item)
  }
  return [...byId.values()]
}

// "10:00" or "10:00 (text)" → "10:00"; junk → null.
function parseHour(s: string | undefined | null): string | null {
  if (!s) return null
  const m = s.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return null
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

async function fetchEvents(): Promise<RawEvent[]> {
  const token = await fetchToken()
  const items = await fetchHubItems(token)
  const out: RawEvent[] = []

  for (const ev of items) {
    if (!ev.category_name || !KID_CATEGORIES.has(ev.category_name)) continue
    if (!ev.representations?.length) continue

    for (const rep of ev.representations) {
      const day = (rep.date_start_formatted ?? '').split(' ')[0]   // "YYYY-MM-DD"
      const tm  = parseHour(rep.hour)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !tm) continue

      const startIso = bucharestLocalToUtcIso(`${day}T${tm}`)
      if (!startIso) continue
      // No end time in the API — default to +3h to match the other adapters.
      const endIso = new Date(new Date(startIso).getTime() + 3 * 3_600_000).toISOString()

      const detailUrl  = `${SITE}/eveniment/${ev.url}/`
      const externalId = `${detailUrl}::${startIso}`

      out.push({
        externalId,
        title:         ev.name,
        description:   ev.small_text ?? null,
        url:           detailUrl,
        startAt:       startIso,
        endAt:         endIso,
        venue:         rep.location_name ?? null,
        priceLabel:    null,
        organizer:     null,
        coverImageUrl: ev.image ?? null,
      })
    }
  }

  return out
}

export const timisoreni: SourceAdapter = {
  name:    'timisoreni',
  enabled: true,
  fetchEvents,
}
