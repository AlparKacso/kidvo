// Event date / urgency helpers + per-category cover palette.
// Ported from the Claude Design prototype (data.js). Native Date only —
// no date library, matching the app's existing convention.

export type Locale = 'ro' | 'en'

const DAYS_SHORT: Record<Locale, string[]> = {
  ro: ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
}
const MONTHS_SHORT: Record<Locale, string[]> = {
  ro: ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

export interface EventDateParts {
  day:     string
  dnum:    number
  mo:      string
  time:    string
  compact: string
}

// All event times are Timișoara wall-clock (Europe/Bucharest), formatted in
// 24h. We always format in this zone so the server (UTC runtime) and the
// browser agree — otherwise an 18:00 event renders as 15:00 server-side.
const TZ = 'Europe/Bucharest'

export function fmtEventDate(date: Date, locale: Locale): EventDateParts {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(date).map(x => [x.type, x.value]),
  ) as Record<string, string>

  const Y = +p.year, Mo = +p.month, D = +p.day
  const hh = p.hour === '24' ? '00' : p.hour   // en-GB emits '24' at midnight
  const mm = p.minute
  const wd = new Date(Y, Mo - 1, D, 12).getDay()
  const day = DAYS_SHORT[locale][wd]
  const mo  = MONTHS_SHORT[locale][Mo - 1]
  const time = `${hh}:${mm}`
  return { day, dnum: D, mo, time, compact: `${day} ${D} ${mo} · ${time}` }
}

// Convert a <input type="datetime-local"> value ("YYYY-MM-DDTHH:mm"),
// entered as Timișoara wall time, to the correct UTC ISO instant — DST-safe.
export function bucharestLocalToUtcIso(local: string): string | null {
  if (!local) return null
  const [d, tm = '00:00'] = local.split('T')
  const [Y, M, D] = d.split('-').map(Number)
  const [h, mi]   = tm.split(':').map(Number)
  const asUtc = Date.UTC(Y, M - 1, D, h, mi)
  const ref   = new Date(asUtc)
  const tzWall  = new Date(ref.toLocaleString('en-US', { timeZone: TZ }))
  const utcWall = new Date(ref.toLocaleString('en-US', { timeZone: 'UTC' }))
  const offset  = tzWall.getTime() - utcWall.getTime()
  return new Date(asUtc - offset).toISOString()
}

// Inverse of bucharestLocalToUtcIso — render a stored UTC instant as a
// <input type="datetime-local"> value ("YYYY-MM-DDTHH:mm") in Timișoara
// wall time. DST-safe (uses the Intl zone formatter).
export function utcIsoToBucharestLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  const hour = get('hour') === '24' ? '00' : get('hour')
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`
}

// Two exhaustive buckets — every upcoming event is "this week" (starts
// within 7 days) or "next week" (everything later). No content is hidden.
export type UrgencyKey = 'thisweek' | 'nextweek'
export type UrgencyTone = 'warm' | 'cool'

export interface Urgency {
  key:   UrgencyKey
  tone:  UrgencyTone
  label: string
}

const URGENCY_LABEL: Record<Locale, Record<UrgencyKey, string>> = {
  ro: { thisweek: 'Săpt. curentă', nextweek: 'Săpt. viitoare' },
  en: { thisweek: 'This week',     nextweek: 'Next week' },
}

const DAY_MS = 86_400_000

export function urgencyFor(start: Date, now: Date, locale: Locale): Urgency {
  const ms = start.getTime() - now.getTime()
  if (ms < 7 * DAY_MS) {
    return { key: 'thisweek', tone: 'warm', label: URGENCY_LABEL[locale].thisweek }
  }
  return { key: 'nextweek', tone: 'cool', label: URGENCY_LABEL[locale].nextweek }
}

// Category emoji — mirrors the existing map in ActivityCard / ListingForm.
export const CATEGORY_EMOJI: Record<string, string> = {
  sport: '⚽', dance: '💃', music: '🎵', coding: '💻',
  arts: '🎨', 'arts-crafts': '🎨', language: '🌍', languages: '🌍',
  chess: '♟️', gym: '🤸', gymnastics: '🤸', health: '❤️', other: '✨',
}

export function categoryEmoji(slug: string | undefined | null): string {
  return (slug && CATEGORY_EMOJI[slug]) || '✨'
}

// Per-category cover palette [base, mid, accent]. The handoff allows a
// category-default palette when no per-event palette is stored (we don't
// store one — events reuse the listings table).
const CATEGORY_PALETTE: Record<string, [string, string, string]> = {
  sport:        ['#7c3aed', '#3b82f6', '#06b6d4'],
  dance:        ['#be123c', '#ef4444', '#fb7185'],
  music:        ['#4c1d95', '#7c3aed', '#c4b5fd'],
  coding:       ['#065f46', '#10b981', '#a7f3d0'],
  arts:         ['#b45309', '#f59e0b', '#fde68a'],
  'arts-crafts':['#b45309', '#f59e0b', '#fde68a'],
  language:     ['#0369a1', '#38bdf8', '#bae6fd'],
  gym:          ['#92400e', '#d97706', '#fde68a'],
  gymnastics:   ['#92400e', '#d97706', '#fde68a'],
  chess:        ['#374151', '#6b7280', '#d1d5db'],
  health:       ['#b91c1c', '#ef4444', '#fecaca'],
  other:        ['#fda4af', '#fb923c', '#fde047'],
}

export function categoryPalette(slug: string | undefined | null): [string, string, string] {
  return (slug && CATEGORY_PALETTE[slug]) || CATEGORY_PALETTE.other
}

// "Free" detection from the free-text price label (RO + EN).
export function isFreePrice(label: string | null | undefined): boolean {
  if (!label) return false
  const v = label.trim().toLowerCase()
  return v === 'gratuit' || v === 'free'
}
