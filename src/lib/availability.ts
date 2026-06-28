import { createAdminClient } from '@/lib/supabase/admin'

// Derive an Activity's public availability from its Groups (the decided model:
// an Activity's spots are the sum of its groups, not a separately-typed number).
//
//   total     = Σ group.capacity
//   available = total − Σ occupancy   (occupancy = enrolled + offered roster members)
//
// A listing with no groups — or whose groups have no capacity set — keeps its
// stored (provider-set) spots, so simple single-activity listings still work.
//
// Computed read-time with the service-role client so it can count rosters
// (which are PII-protected under RLS) without ever sending member rows to the
// browser — only the aggregate counts are used. Server-only.

export interface DerivedSpots { total: number; available: number }

export async function deriveSpotsForListings(listingIds: string[]): Promise<Map<string, DerivedSpots>> {
  const out = new Map<string, DerivedSpots>()
  const ids = [...new Set(listingIds)].filter(Boolean)
  if (ids.length === 0) return out

  const db = createAdminClient()
  const { data: classesRaw } = await db
    .from('classes').select('id, listing_id, capacity').in('listing_id', ids)
  const classes = (classesRaw ?? []) as { id: string; listing_id: string; capacity: number | null }[]
  if (classes.length === 0) return out

  const classIds = classes.map(c => c.id)
  const { data: membersRaw } = await db
    .from('roster_members').select('class_id, status').in('class_id', classIds)
  const occByClass = new Map<string, number>()
  for (const m of (membersRaw ?? []) as { class_id: string; status: string }[]) {
    if (m.status === 'enrolled' || m.status === 'offered') {
      occByClass.set(m.class_id, (occByClass.get(m.class_id) ?? 0) + 1)
    }
  }

  const agg = new Map<string, { total: number; occ: number; hasCap: boolean }>()
  for (const c of classes) {
    const a = agg.get(c.listing_id) ?? { total: 0, occ: 0, hasCap: false }
    if (c.capacity != null) { a.total += c.capacity; a.hasCap = true }
    a.occ += occByClass.get(c.id) ?? 0
    agg.set(c.listing_id, a)
  }
  for (const [lid, a] of agg) {
    if (!a.hasCap) continue // groups exist but none have a capacity → keep stored value
    out.set(lid, { total: a.total, available: Math.max(0, a.total - a.occ) })
  }
  return out
}

/**
 * Overwrite `spots_total` / `spots_available` in place with the values derived
 * from each listing's Groups. Listings with no capacity-bearing groups are left
 * as-is (stored fallback). Returns the same array for convenience.
 */
export async function applyDerivedSpots<T extends { id: string; spots_total: number | null; spots_available: number | null }>(
  listings: T[],
): Promise<T[]> {
  const derived = await deriveSpotsForListings(listings.map(l => l.id))
  for (const l of listings) {
    const d = derived.get(l.id)
    if (d) { l.spots_total = d.total; l.spots_available = d.available }
  }
  return listings
}
