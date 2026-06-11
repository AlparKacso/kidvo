import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Db = SupabaseClient<Database>

/** Shape needed to decide whether the waitlist is open for a listing. */
export interface WaitlistGate {
  spots_available?:       number | null
  trial_available?:       boolean | null
  trial_disabled_reason?: string | null
}

/**
 * The "Join the waitlist" CTA shows when a listing is full OR when the provider
 * disabled trials with the "at capacity" reason (`trial_disabled_reason === 'full'`,
 * kidvo's canonical "At capacity" value). Other disabled reasons (cohort, contact_us)
 * do NOT open the waitlist.
 */
export function isWaitlistOpen(listing: WaitlistGate): boolean {
  const full         = (listing.spots_available ?? 1) === 0
  const atCapacityNoTrial =
    listing.trial_available === false && listing.trial_disabled_reason === 'full'
  return full || atCapacityNoTrial
}

/** Occupancy of a class = roster members that are offered or enrolled. */
export function computeOccupancy(members: { status: string }[]): number {
  return members.filter(m => m.status === 'offered' || m.status === 'enrolled').length
}

/**
 * Ensure every active activity listing for a provider has a matching "listed"
 * class row (lazy sync — runs when the manager loads). Manual classes are left
 * untouched. Safe to call repeatedly; only inserts classes that don't exist yet.
 */
export async function syncListedClasses(db: Db, providerId: string): Promise<void> {
  const [{ data: listingsRaw }, { data: existingRaw }] = await Promise.all([
    db.from('listings')
      .select('id, title, category_id, area_id, age_min, age_max, spots_total, language')
      .eq('provider_id', providerId)
      .eq('status', 'active')
      .eq('type', 'activity'),
    db.from('classes')
      .select('listing_id')
      .eq('provider_id', providerId)
      .not('listing_id', 'is', null),
  ])

  const listings = (listingsRaw ?? []) as Array<{
    id: string; title: string; category_id: string | null; area_id: string | null
    age_min: number | null; age_max: number | null; spots_total: number | null; language: string | null
  }>
  const existing = new Set((existingRaw ?? []).map((r: { listing_id: string | null }) => r.listing_id))
  const missing  = listings.filter(l => !existing.has(l.id))
  if (missing.length === 0) return

  // Pull schedules to populate day chips + time on the new class rows.
  const { data: schedRaw } = await db
    .from('listing_schedules')
    .select('listing_id, day_of_week, time_start, time_end')
    .in('listing_id', missing.map(l => l.id))
  const schedules = (schedRaw ?? []) as Array<{
    listing_id: string; day_of_week: number; time_start: string; time_end: string
  }>

  const rows = missing.map(l => {
    const sched = schedules.filter(s => s.listing_id === l.id).sort((a, b) => a.day_of_week - b.day_of_week)
    const days  = [...new Set(sched.map(s => s.day_of_week))]
    return {
      provider_id: providerId,
      listing_id:  l.id,
      name:        l.title,
      category_id: l.category_id,
      area_id:     l.area_id,
      age_min:     l.age_min,
      age_max:     l.age_max,
      capacity:    l.spots_total,
      days,
      time_start:  sched[0]?.time_start ?? null,
      time_end:    sched[0]?.time_end ?? null,
      language:    l.language,
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.from('classes').insert(rows as any)
}

/**
 * Return the class id backing a listing's roster, creating the "listed" class
 * lazily if the provider hasn't opened the manager yet (which is what normally
 * triggers syncListedClasses). Pass a service-role client — parents can't write
 * classes under RLS, but a parent enrolling must still resolve/create the class.
 * Returns null if the listing doesn't exist.
 */
export async function ensureClassForListing(db: Db, listingId: string): Promise<string | null> {
  const { data: existing } = await db
    .from('classes').select('id').eq('listing_id', listingId).maybeSingle()
  if (existing) return (existing as { id: string }).id

  const { data: lRaw } = await db
    .from('listings')
    .select('id, provider_id, title, category_id, area_id, age_min, age_max, spots_total, language')
    .eq('id', listingId).single()
  const l = lRaw as {
    id: string; provider_id: string; title: string; category_id: string | null
    area_id: string | null; age_min: number | null; age_max: number | null
    spots_total: number | null; language: string | null
  } | null
  if (!l) return null

  const { data: schedRaw } = await db
    .from('listing_schedules')
    .select('day_of_week, time_start, time_end')
    .eq('listing_id', listingId)
  const sched = ((schedRaw ?? []) as Array<{ day_of_week: number; time_start: string; time_end: string }>)
    .sort((a, b) => a.day_of_week - b.day_of_week)
  const days = [...new Set(sched.map(s => s.day_of_week))]

  const { data: created } = await db
    .from('classes')
    .insert({
      provider_id: l.provider_id,
      listing_id:  l.id,
      name:        l.title,
      category_id: l.category_id,
      area_id:     l.area_id,
      age_min:     l.age_min,
      age_max:     l.age_max,
      capacity:    l.spots_total,
      days,
      time_start:  sched[0]?.time_start ?? null,
      time_end:    sched[0]?.time_end ?? null,
      language:    l.language,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .select('id')
    .single()
  return (created as { id: string } | null)?.id ?? null
}

/**
 * 1-based position of a waitlist entry among the still-waiting families for the
 * same listing, ordered first-come-first-served (by created_at). Returns the
 * count of waiting families when the entry can't be located.
 */
export async function waitlistPosition(db: Db, listingId: string, entryId: string): Promise<number> {
  const { data } = await db
    .from('waitlist_entries')
    .select('id')
    .eq('listing_id', listingId)
    .eq('status', 'waiting')
    .order('created_at', { ascending: true })
  const ids = (data ?? []).map((r: { id: string }) => r.id)
  const idx = ids.indexOf(entryId)
  return idx >= 0 ? idx + 1 : ids.length
}
