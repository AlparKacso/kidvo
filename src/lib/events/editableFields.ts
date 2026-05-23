import { bucharestLocalToUtcIso } from '@/lib/eventDate'
import { eventFingerprint } from '@/lib/scrapers/fingerprint'

// The editable event-card fields — shared by the event-drafts PATCH
// (pre-approval) and the listings PATCH (post-approval) so the two stay
// in sync. `event_url` and `source` are intentionally NOT editable:
// they're the integrity link to a scraped event's origin.
export interface EventEditPayload {
  title?:         string
  description?:   string
  eventStartAt?:  string   // <input type="datetime-local">, Timișoara wall time
  eventEndAt?:    string
  venueName?:     string
  priceLabel?:    string
  organizerName?: string
  coverImageUrl?: string
}

// Structural minimum for a card to render without looking broken.
export function missingEventFields(body: EventEditPayload): string[] {
  const missing: string[] = []
  if (!body.title?.trim()) missing.push('title')
  if (!body.eventStartAt)  missing.push('start')
  if (!body.eventEndAt)    missing.push('end')
  return missing
}

// Map the camelCase request body to a snake_case DB update patch. Only keys
// present in the body are written. Datetimes convert from Timișoara wall
// time to UTC (DST-safe). Also recomputes the cross-source `fingerprint`
// whenever title/start/venue is touched — otherwise the row's fingerprint
// would drift out of sync with its content.
export function buildEventUpdate(body: EventEditPayload): Record<string, unknown> {
  const u: Record<string, unknown> = {}
  if (body.title         !== undefined) u.title           = body.title.trim()
  if (body.description   !== undefined) u.description      = body.description || null
  if (body.eventStartAt  !== undefined) u.event_start_at   = bucharestLocalToUtcIso(body.eventStartAt)
  if (body.eventEndAt    !== undefined) u.event_end_at     = bucharestLocalToUtcIso(body.eventEndAt)
  if (body.venueName     !== undefined) u.venue_name       = body.venueName.trim() || null
  if (body.priceLabel    !== undefined) u.price_label      = body.priceLabel || null
  if (body.organizerName !== undefined) u.organizer_name   = body.organizerName || null
  if (body.coverImageUrl !== undefined) u.cover_image_url  = body.coverImageUrl.trim() || null

  // Recompute fingerprint when any of its inputs were touched.
  if (body.title !== undefined || body.eventStartAt !== undefined || body.venueName !== undefined) {
    const fp = eventFingerprint({
      title:     body.title,
      startAt:   u.event_start_at as string | null | undefined,
      venueName: body.venueName,
    })
    u.fingerprint = fp || null
  }

  return u
}
