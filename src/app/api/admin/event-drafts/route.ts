import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dedupHash } from '@/lib/scrapers/dedup'
import { eventFingerprint } from '@/lib/scrapers/fingerprint'
import { bucharestLocalToUtcIso } from '@/lib/eventDate'

const ADMIN_EMAIL = 'alpar.kacso@gmail.com'

// Admin-only: create an assisted event_draft from admin-entered fields
// (after they've prefilled via fetch-meta and corrected). Lands in the
// same review queue as scraped drafts.
//
// Source is `scraper:assisted` — the `scraper:` prefix is the behavior
// switch that makes the published card link out to event_url (no internal
// detail page), show the external glyph, and fall back to "Found by Kidvo
// Events". An admin curating an external event is doing by hand what the
// scraper does, so it gets the same treatment. (No matching SOURCE_ADAPTER
// exists — the cron never produces this value.)
export async function POST(request: Request) {
  const body = await request.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userRow } = await supabase.from('users').select('email').eq('id', user.id).single()
  if ((userRow as { email?: string } | null)?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Required: title, start, end, venue, cover image, and event URL — the
  // last is the external link target a scraped-like card needs.
  const missing: string[] = []
  if (!body.title?.trim())         missing.push('title')
  if (!body.eventStartAt)          missing.push('start')
  if (!body.eventEndAt)            missing.push('end')
  if (!body.venueName?.trim())     missing.push('venue')
  if (!body.coverImageUrl?.trim()) missing.push('cover image')
  if (!body.eventUrl?.trim())      missing.push('event URL')
  if (missing.length) {
    return NextResponse.json(
      { error: `Missing required field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}` },
      { status: 400 },
    )
  }

  const startUtc   = bucharestLocalToUtcIso(body.eventStartAt)
  const endUtc     = bucharestLocalToUtcIso(body.eventEndAt)
  const externalId = body.eventUrl.trim()
  const adminDb    = createAdminClient()

  // Cross-source dedup — unless the admin explicitly overrides via
  // `forceCreate: true`, refuse to insert if an event with the same
  // fingerprint already exists (in a pending draft or an active/pending/
  // paused listing). The form surfaces the 409 and offers "Add anyway".
  const fingerprint = eventFingerprint({
    title:     body.title,
    startAt:   startUtc,
    venueName: body.venueName,
  })

  if (fingerprint && !body.forceCreate) {
    const [{ data: dupDraft }, { data: dupListing }] = await Promise.all([
      adminDb.from('event_drafts').select('id, title').eq('fingerprint', fingerprint).eq('status', 'new').limit(1).maybeSingle(),
      adminDb.from('listings').select('id, title').eq('type', 'event').eq('fingerprint', fingerprint).in('status', ['active', 'pending', 'paused']).limit(1).maybeSingle(),
    ])
    const dup = (dupListing ?? dupDraft) as { id: string; title: string } | null
    if (dup) {
      return NextResponse.json(
        {
          error:         'duplicate',
          duplicateId:   dup.id,
          duplicateKind: dupListing ? 'listing' : 'draft',
          duplicateTitle: dup.title,
        },
        { status: 409 },
      )
    }
  }

  const { error } = await adminDb
    .from('event_drafts')
    .upsert({
      source:          'scraper:assisted',
      fingerprint:     fingerprint || null,
      external_id:     externalId,
      dedup_hash:      dedupHash('scraper:assisted', externalId),
      raw_payload:     body,
      title:           body.title.trim(),
      description:     body.description || null,
      event_start_at:  startUtc,
      event_end_at:    endUtc,
      event_url:       body.eventUrl.trim(),
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
