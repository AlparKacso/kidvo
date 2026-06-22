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
 * Resolve the class a parent is enrolling into for a listing (storefront model —
 * a listing may front MANY classes, or none):
 *   - `classId` given & valid (belongs to the listing) -> that class
 *   - listing has exactly one class                     -> that class
 *   - listing has many & no `classId`                   -> null (the parent must
 *                                                          pick — Phase 2)
 *   - listing has none                                  -> lazily create a default
 *                                                          class from the listing
 *                                                          (back-compat for simple
 *                                                          single-class listings)
 * Pass a service-role client — parents can't write classes under RLS. Returns
 * null when it can't resolve a single class (incl. ambiguous / listing missing).
 */
export async function ensureClassForListing(db: Db, listingId: string, classId?: string | null): Promise<string | null> {
  // Explicit pick (Phase 2 parent selection) — must belong to this listing.
  if (classId) {
    const { data } = await db
      .from('classes').select('id').eq('id', classId).eq('listing_id', listingId).maybeSingle()
    return (data as { id: string } | null)?.id ?? null
  }

  // A listing can front many classes now — only resolve when unambiguous.
  const { data: existingRaw } = await db.from('classes').select('id').eq('listing_id', listingId)
  const existing = (existingRaw ?? []) as { id: string }[]
  if (existing.length > 1)  return null            // ambiguous — caller must pass a classId
  if (existing.length === 1) return existing[0].id

  // 0 classes: lazily create a default class from the listing.

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
