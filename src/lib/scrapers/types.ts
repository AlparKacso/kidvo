// Contract every scraper source implements. Adapters fetch a public page,
// parse it, and return normalized RawEvents — they never touch the DB. The
// cron route is responsible for dedup + upserting into event_drafts.

export interface RawEvent {
  /** Stable per-source id (event id in the source URL, a slug, etc.). */
  externalId:    string
  title:         string
  description?:  string | null
  /** Source detail/event URL. */
  url?:          string | null
  startAt?:      string | null   // ISO 8601
  endAt?:        string | null   // ISO 8601
  venue?:        string | null
  priceLabel?:   string | null
  organizer?:    string | null
  coverImageUrl?: string | null
}

export interface SourceAdapter {
  /** Stable name — used in event_drafts.source as `scraper:<name>`. */
  name:    string
  /** Disabled adapters are skipped by the cron (safe placeholder default). */
  enabled: boolean
  fetchEvents(): Promise<RawEvent[]>
}
