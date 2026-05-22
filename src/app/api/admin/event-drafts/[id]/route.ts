import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildEventUpdate, missingEventFields } from '@/lib/events/editableFields'

const ADMIN_EMAIL = 'alpar.kacso@gmail.com'

// Approve → promote an event_draft to a live listing owned by the system
// "Kidvo Events" provider. Reject → mark the draft rejected. Mirrors the
// auth pattern of /api/admin/listings/[id]/status.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { action, categoryId, areaId } = await request.json()

  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await supabase.from('users').select('email').eq('id', user.id).single()
  if ((userRow as { email?: string } | null)?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminDb = createAdminClient()

  const { data: draftRaw, error: draftErr } = await adminDb
    .from('event_drafts')
    .select('*')
    .eq('id', id)
    .single()

  if (draftErr || !draftRaw) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }
  const draft = draftRaw as Record<string, any>

  if (draft.status !== 'new') {
    return NextResponse.json({ error: `Draft already ${draft.status}` }, { status: 409 })
  }

  // ── Reject ────────────────────────────────────────────────────────────────
  if (action === 'reject') {
    const { error } = await adminDb
      .from('event_drafts')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      console.error('[event-drafts] reject error:', error.message)
      return NextResponse.json({ error: 'Failed to reject draft' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, status: 'rejected' })
  }

  // ── Approve → promote to a live listing ───────────────────────────────────
  if (!draft.title) {
    return NextResponse.json({ error: 'Draft has no title — cannot publish' }, { status: 400 })
  }
  // Scraped events have no internal detail page — the card links to the
  // source URL. Without it there's nowhere to send the user.
  const isScraped = typeof draft.source === 'string' && draft.source.startsWith('scraper:')
  if (isScraped && !draft.event_url) {
    return NextResponse.json(
      { error: 'Scraped event missing source URL — cannot publish' },
      { status: 400 },
    )
  }
  // Events promote with NULL category/area/age. Admin may still override via
  // the request body (existing UI), but it's no longer required.
  const finalCategory = categoryId || draft.suggested_category_id || null
  const finalArea     = areaId     || draft.suggested_area_id     || null

  const { data: prov, error: provErr } = await adminDb
    .from('providers')
    .select('id')
    .eq('display_name', 'Kidvo Events')
    .limit(1)
    .single()
  if (provErr || !prov) {
    return NextResponse.json(
      { error: 'Kidvo Events provider not found — run the events migration seed first' },
      { status: 500 },
    )
  }

  const { data: listing, error: insErr } = await adminDb
    .from('listings')
    .insert({
      provider_id:     (prov as { id: string }).id,
      category_id:     finalCategory,
      area_id:         finalArea,
      title:           draft.title,
      description:     draft.description,
      type:            'event',
      source:          draft.source,
      status:          'active',
      published_at:    new Date().toISOString(),
      event_start_at:  draft.event_start_at,
      event_end_at:    draft.event_end_at,
      event_url:       draft.event_url,
      venue_name:      draft.venue_name,
      price_label:     draft.price_label,
      organizer_name:  draft.organizer_name,
      cover_image_url: draft.cover_image_url,
      // Events promote with NULL age (no Age/Zone/Category at any point in
      // the events flow). The activity-shaped columns below stay defensive:
      // staging has them NOT NULL without defaults (schema drift).
      age_min:         null,
      age_max:         null,
      price_monthly:   0,
      pricing_type:    'month',
      language:        'Română',
      featured:        false,
      trial_available: false,
    })
    .select('id')
    .single()

  if (insErr || !listing) {
    console.error('[event-drafts] promote insert error:', insErr?.message, insErr?.details)
    return NextResponse.json(
      { error: 'Failed to create listing', detail: insErr?.message ?? null },
      { status: 500 },
    )
  }

  const listingId = (listing as { id: string }).id
  const { error: markErr } = await adminDb
    .from('event_drafts')
    .update({ status: 'approved', promoted_listing_id: listingId, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (markErr) {
    // Roll back the listing so we don't leave an orphaned event with the
    // draft still in "new" (would double-publish on a retry).
    await adminDb.from('listings').delete().eq('id', listingId)
    console.error('[event-drafts] mark-approved error, rolled back listing:', markErr.message)
    return NextResponse.json({ error: 'Failed to finalize approval' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status: 'approved', listingId })
}

// PATCH → inline-edit a still-pending draft's card fields before approval.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userRow } = await supabase.from('users').select('email').eq('id', user.id).single()
  if ((userRow as { email?: string } | null)?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const missing = missingEventFields(body)
  if (missing.length) {
    return NextResponse.json(
      { error: `Missing required field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}` },
      { status: 400 },
    )
  }

  const adminDb = createAdminClient()
  const { data: draftRaw } = await adminDb
    .from('event_drafts').select('status').eq('id', id).single()
  if (!draftRaw) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  if ((draftRaw as { status: string }).status !== 'new') {
    return NextResponse.json({ error: 'Only pending drafts can be edited' }, { status: 409 })
  }

  const update = { ...buildEventUpdate(body), updated_at: new Date().toISOString() }
  const { error } = await adminDb.from('event_drafts').update(update).eq('id', id)
  if (error) {
    console.error('[event-drafts] edit error:', error.message)
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
