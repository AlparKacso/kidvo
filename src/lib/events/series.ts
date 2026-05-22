import type { ListingWithRelations } from '@/types/database'

export interface EventGroup {
  /** The next-upcoming occurrence — the one the card represents. */
  lead:       ListingWithRelations
  /** Additional future occurrences in the same series (0 for standalone). */
  extraCount: number
}

// Group event listings by `series_id` so repeating occurrences collapse to
// one card. A NULL series_id is a standalone event (its own group). Within
// a series the "lead" is the earliest-starting occurrence. Input should
// already be filtered to active/future events; rows without a start are
// dropped. Output is sorted by the lead's start, ascending.
export function groupEventsBySeries(events: ListingWithRelations[]): EventGroup[] {
  const series = new Map<string, ListingWithRelations[]>()
  const groups: EventGroup[] = []

  for (const ev of events) {
    if (!ev.event_start_at) continue
    if (ev.series_id) {
      const arr = series.get(ev.series_id)
      if (arr) arr.push(ev)
      else series.set(ev.series_id, [ev])
    } else {
      groups.push({ lead: ev, extraCount: 0 })
    }
  }

  for (const arr of series.values()) {
    const sorted = [...arr].sort((a, b) =>
      (a.event_start_at ?? '').localeCompare(b.event_start_at ?? ''))
    groups.push({ lead: sorted[0], extraCount: sorted.length - 1 })
  }

  groups.sort((a, b) =>
    (a.lead.event_start_at ?? '').localeCompare(b.lead.event_start_at ?? ''))
  return groups
}
