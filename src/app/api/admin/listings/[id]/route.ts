import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildEventUpdate, missingEventFields } from '@/lib/events/editableFields'

const ADMIN_EMAIL = 'alpar.kacso@gmail.com'

// PATCH → inline-edit a published event listing's card fields.
// Only `type='event'` rows are editable here; activities have their own
// provider-facing edit flow. event_url / source are never touched.
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
  const { data: listingRaw } = await adminDb
    .from('listings').select('type').eq('id', id).single()
  if (!listingRaw) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  if ((listingRaw as { type: string }).type !== 'event') {
    return NextResponse.json({ error: 'Only event listings are editable here' }, { status: 409 })
  }

  const update = { ...buildEventUpdate(body), updated_at: new Date().toISOString() }
  const { error } = await adminDb.from('listings').update(update).eq('id', id)
  if (error) {
    console.error('[listings] event edit error:', error.message)
    return NextResponse.json({ error: 'Failed to save listing' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
