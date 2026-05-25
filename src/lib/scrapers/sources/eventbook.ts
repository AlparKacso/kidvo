import * as cheerio from 'cheerio'
import type { RawEvent, SourceAdapter } from '../types'
import { fetchHtml, extractJsonLdEvents } from '../jsonld'

// eventbook.ro lists Timișoara events at /city/timisoara (paginated). The
// listing page is HTML-only — no JSON-LD on the listing — so we use it to
// harvest detail URLs and then parse each detail page's Event JSON-LD.
//
// Mixed-audience listing (cinema, opera, comedy, debates, kids shows). We
// prune the URL list with a kids regex before fetching detail pages so we
// don't burn the cron's time budget on irrelevant rows.

const LISTING_BASE = 'https://eventbook.ro/city/timisoara'
const SITE         = 'https://eventbook.ro'
const MAX_PAGES    = 6        // ~10 cards/page; covers the full Timi feed
const MAX_DETAILS  = 30       // cap detail-page fetches per run (cron budget)

// URL-slug patterns that strongly signal a kids event. The most reliable
// is "weekendul-copiilor" — Cinema Victoria's kids weekend programme.
const URL_KIDS_RE   = /(?:weekendul[-_]copiilor|pentru[-_]copii|de[-_]copii|p[ăa]pu[șs]i|marionet|junior)/i

// Title-level kid keywords — same shape as the iabilet filter.
const TITLE_KIDS_RE = /\b(copii|copil|junior|micu[țt]|prich|pitic|frozen|scufi[țt]|prin[țt]es|purcelu[șs]i|ursule[țt]|p[ăa]pu[șs]i|marionet|basm|f[ăa]t[\s\-]?frumos|feerie|harry\s+potter|alad[iî]n|mo[șs]|cr[ăa]ciun|hansel|zootopia|aristocrat)\b/i

// Skip these URL prefixes outright (not events, or low-signal categories).
const SKIP_PREFIXES = ['/other/', '/hall/', '/city/', '/tag/', '/program/']

function isKidCandidate(href: string, title: string): boolean {
  if (URL_KIDS_RE.test(href)) return true
  if (TITLE_KIDS_RE.test(title)) return true
  return false
}

function absolute(href: string): string {
  return href.startsWith('http') ? href : `${SITE}${href}`
}

async function fetchEvents(): Promise<RawEvent[]> {
  // ── Phase 1: harvest detail URLs from the listing pages ────────────────
  const candidates: { url: string; title: string }[] = []
  const seen = new Set<string>()

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? LISTING_BASE : `${LISTING_BASE}?page=${page}`
    let html: string
    try {
      html = await fetchHtml(url)
    } catch (e) {
      console.error(`[scraper:eventbook] ${url} failed:`, e instanceof Error ? e.message : e)
      break
    }
    const $ = cheerio.load(html)
    let pageMatches = 0
    $('a.event-title').each((_, el) => {
      const href  = ($(el).attr('href') ?? '').split('#')[0].split('?')[0]
      const title = $(el).text().trim()
      if (!href || !title) return
      pageMatches++
      if (SKIP_PREFIXES.some(p => href.startsWith(p))) return
      if (!isKidCandidate(href, title)) return
      const full = absolute(href)
      if (seen.has(full)) return
      seen.add(full)
      candidates.push({ url: full, title })
    })
    // Last page (or empty) → stop.
    if (pageMatches === 0) break
  }

  // ── Phase 2: fetch each detail page + parse its Event JSON-LD ──────────
  const out: RawEvent[] = []
  for (const { url } of candidates.slice(0, MAX_DETAILS)) {
    try {
      const html = await fetchHtml(url)
      const events = extractJsonLdEvents(html, 'eventbook')
      for (const ev of events) {
        // Sanity: only keep events whose location address is Timișoara.
        // extractJsonLdEvents already drops past events for us.
        out.push(ev)
      }
    } catch (e) {
      console.error(`[scraper:eventbook] ${url} failed:`, e instanceof Error ? e.message : e)
    }
  }
  return out
}

export const eventbook: SourceAdapter = {
  name:    'eventbook',
  enabled: true,
  fetchEvents,
}
