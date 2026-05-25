import type { RawEvent, SourceAdapter } from '../types'
import { fetchHtml, extractJsonLdEvents } from '../jsonld'

// iabilet.ro is the biggest RO ticket marketplace. Each event-listing page
// embeds one Event JSON-LD block per event (wrapped in CDATA — handled by
// the shared parser). The Timișoara-filtered listing
// (`/bilete-in-timisoara/?page=N`) mixes audiences (concerts, comedy,
// debates, kids shows), so we filter the parsed events down to kids via:
//   (a) venue allowlist — known kids theaters in Timișoara, AND
//   (b) title keyword regex — covers common kid-show patterns even when
//       the venue isn't on the allowlist (e.g. Filarmonica matinee).

const LISTING_BASE = 'https://www.iabilet.ro/bilete-in-timisoara/'
const MAX_PAGES = 3       // ~25 events per page; 3 pages = scan ~75 Timi events
const FETCH_GAP_MS = 250  // be polite

// Known children-focused venues in Timișoara — case-insensitive substring.
const KIDS_VENUES = [
  'teatrul basca',
  'teatrul merlin',
  'teatrul pentru copii',
]

// Kid-show keywords. Romanian + the occasional English title ("Frozen").
// Loose-ish on purpose; admin review queue catches false positives.
const KIDS_TITLE_RE = /\b(copii|copil|junior|micu[țt]|prich|pitic|frozen|scufi[țt]|prin[țt]es|purcelu[șs]i|ursule[țt]|p[ăa]pu[șs]i|marionet|basm|f[ăa]t[\s\-]?frumos|feerie|magia|harry\s+potter|alad[iî]n|moș|cr[ăa]ciun|paste\s+pentru\s+copii)\b/i

function isKidEvent(ev: RawEvent): boolean {
  const venue = (ev.venue ?? '').toLowerCase()
  if (KIDS_VENUES.some(v => venue.includes(v))) return true
  if (KIDS_TITLE_RE.test(ev.title)) return true
  return false
}

async function fetchEvents(): Promise<RawEvent[]> {
  const byUrl = new Map<string, RawEvent>()

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? LISTING_BASE : `${LISTING_BASE}?page=${page}`
    let html: string
    try {
      html = await fetchHtml(url)
    } catch (e) {
      console.error(`[scraper:iabilet] ${url} failed:`, e instanceof Error ? e.message : e)
      break
    }

    const parsed = extractJsonLdEvents(html, 'iabilet')
    let kept = 0
    for (const ev of parsed) {
      if (!isKidEvent(ev)) continue
      // Re-derive a stable externalId tied to the iabilet detail URL — the
      // jsonld helper already builds one from `url||title`, which for iabilet
      // is the detail URL. Use it as the dedup key across pages.
      const key = ev.url ?? ev.externalId
      if (byUrl.has(key)) continue
      byUrl.set(key, ev)
      kept++
    }

    // Stop early once a page produces less than a full page of events — that's
    // the last page (iabilet's pages hold ~25; a partial page means we've run
    // off the end).
    if (parsed.length < 20) break
    void kept
    if (page < MAX_PAGES) await new Promise(r => setTimeout(r, FETCH_GAP_MS))
  }

  return [...byUrl.values()]
}

export const iabilet: SourceAdapter = {
  name:    'iabilet',
  enabled: true,
  fetchEvents,
}
