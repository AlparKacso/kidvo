import { createHash } from 'node:crypto'

// Cross-source event fingerprint — stable across adapters.
//
// Used to detect when two sources report the same real-world event (so we
// skip the duplicate at insert). The fingerprint is intentionally lossy:
// it rounds the start time to a 30-min slot and normalizes title + venue
// so minor cross-source disagreements still collide.
//
// Distinct showtimes of the same event still produce DIFFERENT fingerprints
// (different start times after 30-min rounding), so multi-occurrence
// siblings remain separate listings rows — the admin "merge into series"
// tool then groups them.

const PREFIX_RE = /^(reprogramat|am[aâ]nat|eveniment|new|nou)\s*[:!.\-–—]\s*/i
const COMBINING = /[̀-ͯ]/g

export function normalizeTitle(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .normalize('NFD').replace(COMBINING, '') // strip diacritics
    .toLowerCase()
    .replace(PREFIX_RE, '')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeVenue(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .normalize('NFD').replace(COMBINING, '')
    .toLowerCase()
    .replace(/\s+timisoara\b/g, '') // common suffix some sources append
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Round to nearest 30 minutes. Returns "YYYY-MM-DDTHH:mm" in UTC (the
// timezone is irrelevant for dedup — same instant = same bucket).
export function roundStartToSlot(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const slotMs = 30 * 60_000
  const slot = Math.round(d.getTime() / slotMs) * slotMs
  return new Date(slot).toISOString().slice(0, 16)
}

export interface FingerprintInput {
  title?:     string | null
  startAt?:   string | null
  venueName?: string | null
}

// Empty string when title OR start is missing — callers treat empty as
// "no fingerprint, don't dedup" rather than as a hash collision.
export function eventFingerprint(ev: FingerprintInput): string {
  const t = normalizeTitle(ev.title)
  const s = roundStartToSlot(ev.startAt)
  const v = normalizeVenue(ev.venueName)
  if (!t || !s) return ''
  return createHash('sha256').update(`${t}|${s}|${v}`).digest('hex')
}
