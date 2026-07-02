import { createAdminClient } from '@/lib/supabase/admin'

// One normalized stream of a family's child↔class relationships, assembled from
// the v1 write tables (roster_members + waitlist_entries). This is the "two views
// of one record" read layer the calendar renders — the provider manager keeps
// mutating the same underlying rows.

export type CalendarStatus = 'enrolled' | 'pending' | 'waitlisted'

export interface FamilyCalendarChild {
  id:        string
  name:      string
  age:       number | null
  birthYear: number          // for accurate edit + recommendation scoring
  color:     string
  grade:     string | null   // school_grade — folded-in Kids profile
  areaId:    string | null
  interests: string[]        // category slugs
}

export interface CalendarEntry {
  id:         string          // stable block id (prefixed by source)
  status:     CalendarStatus
  childId:    string | null
  childName:  string
  title:      string
  provider:   string
  listingId:  string | null
  classId:    string | null
  days:       number[]        // 0=Mon..6=Sun
  timeStart:  string | null   // 'HH:MM'
  timeEnd:    string | null
  position:   number | null   // waitlist rank, when waitlisted
}

export interface FamilyCalendar {
  children: FamilyCalendarChild[]
  entries:  CalendarEntry[]
}

// Per-child colors. children has no color column, so assign stably by order.
// Pulled from the kidvo category-accent palette so blocks feel on-brand.
const CHILD_COLORS = [
  '#be123c', // rose
  '#2aa7ff', // blue
  '#065f46', // green
  '#7c3aed', // primary
  '#b45309', // amber
  '#0369a1', // deep blue
  '#523650', // plum
  '#92400e', // brown
]
export function childColor(index: number): string {
  return CHILD_COLORS[index % CHILD_COLORS.length]
}

const ageFromBirthYear = (year: number | null): number | null =>
  year ? new Date().getFullYear() - year : null

// HH:MM:SS / HH:MM → HH:MM (schedule/class times can carry seconds).
const trimTime = (t: string | null | undefined): string | null =>
  t ? t.slice(0, 5) : null

/**
 * Assemble a parent's family calendar. Reads through the service-role client
 * (scoped manually to `userId` / their children) rather than RLS: a parent
 * select policy on classes that references roster_members causes Postgres RLS
 * recursion, so these cross-table reads are done server-side instead. Call only
 * from a server context after authenticating `userId`.
 */
export async function getFamilyCalendar(userId: string): Promise<FamilyCalendar> {
  const db = createAdminClient()
  const { data: kidsRaw } = await db
    .from('children')
    .select('id, name, birth_year, school_grade, area_id, interests')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  const kids = (kidsRaw ?? []) as Array<{
    id: string; name: string; birth_year: number
    school_grade: string | null; area_id: string | null; interests: string[] | null
  }>
  const children: FamilyCalendarChild[] = kids.map((k, i) => ({
    id:        k.id,
    name:      k.name,
    age:       ageFromBirthYear(k.birth_year),
    birthYear: k.birth_year,
    color:     childColor(i),
    grade:     k.school_grade ?? null,
    areaId:    k.area_id ?? null,
    interests: k.interests ?? [],
  }))
  const childIds = kids.map(k => k.id)

  const entries: CalendarEntry[] = []

  // ── enrolled / pending (request-to-confirm) — from roster_members ──
  if (childIds.length > 0) {
    const { data: rosterRaw } = await db
      .from('roster_members')
      .select('id, status, child_id, child_name, class_id, classes(name, listing_id, days, time_start, time_end, providers(display_name))')
      .in('child_id', childIds)
      .in('status', ['requested', 'enrolled'])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (rosterRaw ?? []) as any[]) {
      const cls = r.classes
      if (!cls) continue
      entries.push({
        id:        `roster:${r.id}`,
        status:    r.status === 'enrolled' ? 'enrolled' : 'pending',
        childId:   r.child_id,
        childName: r.child_name,
        title:     cls.name,
        provider:  cls.providers?.display_name ?? '',
        listingId: cls.listing_id ?? null,
        classId:   r.class_id,
        days:      [...(cls.days ?? [])].sort((a: number, b: number) => a - b),
        timeStart: trimTime(cls.time_start),
        timeEnd:   trimTime(cls.time_end),
        position:  null,
      })
    }
  }

  // ── waitlisted — from waitlist_entries (waiting + offered) ─────────
  const { data: wlRaw } = await db
    .from('waitlist_entries')
    .select('id, status, child_id, child_name, listing_id, listings(title, providers(display_name), listing_schedules(day_of_week, time_start, time_end))')
    .eq('user_id', userId)
    .in('status', ['waiting', 'offered'])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const w of (wlRaw ?? []) as any[]) {
    const listing = w.listings
    if (!listing) continue
    const scheds = (listing.listing_schedules ?? []) as Array<{
      day_of_week: number; time_start: string; time_end: string
    }>
    const sorted = [...scheds].sort((a, b) => a.day_of_week - b.day_of_week)
    const days   = [...new Set(sorted.map(s => s.day_of_week))]

    let position: number | null = null
    if (w.status === 'waiting') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: pos } = await (db as any).rpc('waitlist_position', { p_entry_id: w.id })
      position = typeof pos === 'number' ? pos : null
    }

    entries.push({
      id:        `waitlist:${w.id}`,
      status:    'waitlisted',
      childId:   w.child_id,
      childName: w.child_name,
      title:     listing.title,
      provider:  listing.providers?.display_name ?? '',
      listingId: w.listing_id,
      classId:   null,
      days,
      timeStart: trimTime(sorted[0]?.time_start),
      timeEnd:   trimTime(sorted[0]?.time_end),
      position,
    })
  }

  return { children, entries }
}
