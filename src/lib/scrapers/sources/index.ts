import type { SourceAdapter } from '../types'
import { exampleSource } from './example-source'

// Registry of scraper sources. Add one entry per public Timișoara event
// site. Disabled adapters are listed but skipped by the cron, so this is
// safe to ship before real source URLs are provided.
export const SOURCE_ADAPTERS: SourceAdapter[] = [
  exampleSource,
]
