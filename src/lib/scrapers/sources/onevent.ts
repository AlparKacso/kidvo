import type { RawEvent, SourceAdapter } from '../types'
import { fetchHtml, extractJsonLdEvents } from '../jsonld'

// onevent.ro embeds one schema.org Event JSON-LD block per event directly
// in the kids/family + Timișoara listing page — single fetch, fully
// structured (name, start/end, image, description, location, organizer).
const LISTING = 'https://www.onevent.ro/timisoara/copii-si-parinti/'

async function fetchEvents(): Promise<RawEvent[]> {
  const html = await fetchHtml(LISTING)
  return extractJsonLdEvents(html, 'onevent')
}

export const onevent: SourceAdapter = {
  name:    'onevent',
  enabled: true,
  fetchEvents,
}
