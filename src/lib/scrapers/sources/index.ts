import type { SourceAdapter } from '../types'
import { exampleSource } from './example-source'
import { onevent } from './onevent'
import { timisoreni } from './timisoreni'
import { zilesinopti } from './zilesinopti'

// Registry of scraper sources. Disabled adapters are listed but skipped by
// the cron. onevent + zilesinopti parse schema.org JSON-LD; timisoreni uses
// the site's private API (token bootstrap + X-Api-Token header). The
// example template stays disabled.
export const SOURCE_ADAPTERS: SourceAdapter[] = [
  onevent,
  zilesinopti,
  timisoreni,
  exampleSource,
]
