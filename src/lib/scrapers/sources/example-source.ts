import * as cheerio from 'cheerio'
import type { RawEvent, SourceAdapter } from '../types'

// Template adapter for a public Timișoara events page. Disabled until a real
// source URL + selectors are supplied. Copy this file per source, fill the
// SOURCE_URL + the SELECTORS block, set `enabled: true`, and register it in
// ./index.ts. The cron skips disabled adapters, so this is safe to ship.

const SOURCE_URL = '' // TODO: e.g. 'https://example.ro/evenimente-copii'

// TODO: fill these CSS selectors against the real page structure.
const SELECTORS = {
  item:       '.event-card',          // each event container
  title:      '.event-title',
  link:       'a',                    // href resolved against SOURCE_URL
  date:       'time',                 // prefer a [datetime] attribute
  venue:      '.event-venue',
  description:'.event-desc',
  image:      'img',                  // src/srcset
}

async function fetchEvents(): Promise<RawEvent[]> {
  if (!SOURCE_URL) return []

  const res = await fetch(SOURCE_URL, {
    headers: { 'User-Agent': 'kidvo-events-bot/1.0 (+https://kidvo.eu)' },
  })
  if (!res.ok) {
    console.error(`[scraper:example] ${SOURCE_URL} → ${res.status}`)
    return []
  }
  const $ = cheerio.load(await res.text())

  const out: RawEvent[] = []
  $(SELECTORS.item).each((_, el) => {
    const node  = $(el)
    const title = node.find(SELECTORS.title).text().trim()
    if (!title) return

    const href = node.find(SELECTORS.link).attr('href') ?? ''
    const url  = href ? new URL(href, SOURCE_URL).toString() : SOURCE_URL
    const dt   = node.find(SELECTORS.date).attr('datetime') ?? node.find(SELECTORS.date).text().trim()
    const start = dt ? new Date(dt) : null

    out.push({
      // Stable id: prefer the source's own id from the URL; fall back to the
      // detail URL so the dedup hash is stable across re-scrapes.
      externalId:    url,
      title,
      description:   node.find(SELECTORS.description).text().trim() || null,
      url,
      startAt:       start && !isNaN(start.getTime()) ? start.toISOString() : null,
      endAt:         null,
      venue:         node.find(SELECTORS.venue).text().trim() || null,
      priceLabel:    null,
      organizer:     null,
      coverImageUrl: node.find(SELECTORS.image).attr('src') || null,
    })
  })
  return out
}

export const exampleSource: SourceAdapter = {
  name:    'example',
  enabled: false, // ← flip to true once SOURCE_URL + SELECTORS are filled
  fetchEvents,
}
