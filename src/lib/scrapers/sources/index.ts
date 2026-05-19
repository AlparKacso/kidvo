import type { SourceAdapter } from '../types'
import { exampleSource } from './example-source'
import { onevent } from './onevent'
import { zilesinopti } from './zilesinopti'

// Registry of scraper sources. Disabled adapters are listed but skipped by
// the cron. Both live aggregators parse schema.org Event JSON-LD (robust,
// no fragile CSS selectors); the example template stays disabled.
export const SOURCE_ADAPTERS: SourceAdapter[] = [
  onevent,
  zilesinopti,
  exampleSource,
]
