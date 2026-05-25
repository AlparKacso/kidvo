import type { SourceAdapter } from '../types'
import { exampleSource } from './example-source'
import { iabilet } from './iabilet'
import { onevent } from './onevent'
import { timisoreni } from './timisoreni'
import { zilesinopti } from './zilesinopti'

// Registry of scraper sources. Disabled adapters are listed but skipped by
// the cron. JSON-LD aggregators: onevent, zilesinopti, iabilet. API-driven:
// timisoreni (token bootstrap + X-Api-Token). The example template stays
// disabled.
export const SOURCE_ADAPTERS: SourceAdapter[] = [
  onevent,
  zilesinopti,
  timisoreni,
  iabilet,
  exampleSource,
]
