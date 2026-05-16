import { createHash } from 'node:crypto'

// Stable hash for event_drafts.dedup_hash (UNIQUE). Re-scraping the same
// event yields the same hash, so the cron's upsert is idempotent.
export function dedupHash(source: string, externalId: string): string {
  return createHash('sha256').update(`${source}|${externalId}`).digest('hex')
}
