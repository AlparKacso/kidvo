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

export function fmtEventDate(date: Date, locale: Locale): EventDateParts {
  const day  = DAYS_SHORT[locale][date.getDay()]
  const dnum = date.getDate()
  const mo   = MONTHS_SHORT[locale][date.getMonth()]
  const hh   = String(date.getHours()).padStart(2, '0')
  const mm   = String(date.getMinutes()).padStart(2, '0')
  const time = `${hh}:${mm}`
  return { day, dnum, mo, time, compact: `${day} ${dnum} ${mo} · ${time}` }
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
  ro: { thisweek: 'Săptămâna aceasta', nextweek: 'Săptămâna viitoare' },
  en: { thisweek: 'This week',         nextweek: 'Next week' },
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
  chess: '♟️', gym: '🤸', gymnastics: '🤸', other: '✨',
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
