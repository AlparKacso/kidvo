import * as cheerio from 'cheerio'
import type { RawEvent, SourceAdapter } from '../types'
import { fetchHtml, extractJsonLdEvents } from '../jsonld'

// zilesinopti's kids+Timișoara listing page has NO per-event JSON-LD, but
// each event *detail* page carries rich ChildrensEvent JSON-LD (one node
// per showtime). So: scrape the (already kid/Timișoara-filtered) listing
// for detail URLs, then parse each detail page's JSON-LD.
const LISTING = 'https://zilesinopti.ro/evenimente-copii-timisoara/'
const DETAIL_RE = /^https:\/\/zilesinopti\.ro\/evenimente\/([^/]+)\/?$/
const MAX_DETAILS = 30 // cap fetches per run (stays well within cron maxDuration)

async function fetchEvents(): Promise<RawEvent[]> {
  const listing = await fetchHtml(LISTING)
  const $ = cheerio.load(listing)

  const urls: string[] = []
  const seen = new Set<string>()
  $('a[href*="/evenimente/"]').each((_, a) => {
    let href = ($(a).attr('href') || '').split('#')[0].split('?')[0]
    const m = href.match(DETAIL_RE)
    if (!m) return
    if (m[1] === 'evenimente') return
    if (!href.endsWith('/')) href += '/'
    if (seen.has(href)) return
    seen.add(href)
    urls.push(href)
  })

  const out: RawEvent[] = []
  for (const url of urls.slice(0, MAX_DETAILS)) {
    try {
      const html = await fetchHtml(url)
      out.push(...extractJsonLdEvents(html, 'zilesinopti'))
    } catch (e) {
      console.error(`[scraper:zilesinopti] ${url} failed:`, e instanceof Error ? e.message : e)
    }
  }
  return out
}

export const zilesinopti: SourceAdapter = {
  name:    'zilesinopti',
  enabled: true,
  fetchEvents,
}
