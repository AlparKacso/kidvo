import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dedupHash } from '@/lib/scrapers/dedup'
import { bucharestLocalToUtcIso } from '@/lib/eventDate'

const ADMIN_EMAIL = 'alpar.kacso@gmail.com'

// Admin-only: create a manual event_draft from admin-entered fields
// (after they've prefilled via fetch-meta and corrected). Lands in the
// same review queue as scraped drafts.
export async function POST(request: Request) {
  const body = await request.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userRow } = await supabase.from('users').select('email').eq('id', user.id).single()
  if ((userRow as { email?: string } | null)?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Required fields per events rules (2026-05-21): title, start, end,
  // venue, cover image. Optional: organizer, price, description, event URL.
  const missing: string[] = []
  if (!body.title?.trim())         missing.push('title')
  if (!body.eventStartAt)          missing.push('start')
  if (!body.eventEndAt)            missing.push('end')
  if (!body.venueName?.trim())     missing.push('venue')
  if (!body.coverImageUrl?.trim()) missing.push('cover image')
  if (missing.length) {
    return NextResponse.json(
      { error: `Missing required field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}` },
      { status: 400 },
    )
  }

  const externalId = (body.eventUrl || `${body.title}|${body.eventStartAt}`).trim()
  const adminDb = createAdminClient()

  const { error } = await adminDb
    .from('event_drafts')
    .upsert({
      source:          'manual',
      external_id:     externalId,
      dedup_hash:      dedupHash('manual', externalId),
      raw_payload:     body,
      title:           body.title.trim(),
      description:     body.description || null,
      event_start_at:  bucharestLocalToUtcIso(body.eventStartAt),
      event_end_at:    bucharestLocalToUtcIso(body.eventEndAt),
      event_url:       body.eventUrl || null,
      venue_name:      body.venueName.trim(),
      price_label:     body.priceLabel || null,
      organizer_name:  body.organizerName || null,
      cover_image_url: body.coverImageUrl.trim(),
      status:          'new',
    }, { onConflict: 'dedup_hash' })

  if (error) {
    console.error('[event-drafts] assisted create error:', error.message)
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
