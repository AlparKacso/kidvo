import type { RawEvent, SourceAdapter } from '../types'
import { bucharestLocalToUtcIso } from '@/lib/eventDate'

// timisoreni.ro is a Nuxt SPA — no HTML scraping; the page hydrates from a
// private API at api.timisoreni.ro that needs a bootstrapped token. The
// browser fetches /api/_token (public, ~no rate limit) and then signs every
// hub call with that token via X-Api-Token. We do the same.
//
// The hub endpoint exposes 4 curated sections (toate, astazi, weekend,
// populare) of up to 12 events each — there's no full-agenda paging. We
// merge across sections (dedupe by event id) and keep only kid-relevant
// events. The hub has NO kids category, so a category filter is useless
// (it let adult opera/theatre through — Rigoletto, Mata Hari, …); instead
// we match the other adapters and filter by title/description keywords +
// an explicit young-age tag. The admin review queue catches the rest.

const SITE      = 'https://www.timisoreni.ro'
const API_BASE  = 'https://api.timisoreni.ro/api'
const HUB_SLUG  = 'evenimente'
const UA        = 'kidvo-events-bot/1.0 (+https://kidvo.eu)'

// Kid-show keywords (Romanian + the occasional English title), same shape as
// the eventbook/iabilet filters. Loose on purpose — admin review catches FPs.
const KIDS_TITLE_RE = /\b(copii|copil|junior|micu[țt]|prich|pitic|frozen|scufi[țt]|prin[țt]es|purcelu[șs]i|ursule[țt]|p[ăa]pu[șs]i|marionet|basm|f[ăa]t[\s\-]?frumos|feerie|magia|harry\s+potter|alad[iî]n|mo[șs]|cr[ăa]ciun|hansel|zootopia|aristocrat|familie)\b/i

// Explicit young-age tag, e.g. "(3-5 ani)" / "0-2 ani" — the educational
// recitals carry these and have no keyword. Only count it when the lower
// bound is young (≤12), so adult ranges like "16+ ani" don't match.
function hasKidAgeTag(text: string): boolean {
  const m = text.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s*ani/i)
  return !!m && parseInt(m[1], 10) <= 12
}

// Match the title only — like iabilet/eventbook. Descriptions are too noisy
// (a synopsis mentioning "copii" in passing produced false positives).
function isKidEvent(name: string): boolean {
  return KIDS_TITLE_RE.test(name) || hasKidAgeTag(name)
}

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

  // Past-event cutoff — mirror the JSON-LD helper's 24h grace window.
  // The timisoreni API returns historical entries (Revelion 2025, etc.)
  // so we must filter them out at adapter level; this adapter bypasses
  // `extractJsonLdEvents` which has its own cutoff.
  const cutoffMs = Date.now() - 24 * 60 * 60 * 1000

  for (const ev of items) {
    if (!ev.representations?.length) continue
    if (!isKidEvent(ev.name)) continue

    for (const rep of ev.representations) {
      const day = (rep.date_start_formatted ?? '').split(' ')[0]   // "YYYY-MM-DD"
      const tm  = parseHour(rep.hour)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !tm) continue

      const startIso = bucharestLocalToUtcIso(`${day}T${tm}`)
      if (!startIso) continue
      // No end time in the API — default to +3h to match the other adapters.
      const endIso = new Date(new Date(startIso).getTime() + 3 * 3_600_000).toISOString()
      if (new Date(endIso).getTime() < cutoffMs) continue   // already over

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
