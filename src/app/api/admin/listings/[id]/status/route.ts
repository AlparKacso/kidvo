import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendListingApprovedToProvider,
  sendListingRejectedToProvider,
} from '@/lib/email'

const ADMIN_EMAIL = 'alpar.kacso@gmail.com'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { status } = await request.json()

  const validStatuses = ['active', 'draft', 'paused']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Admin-only
  const { data: userRow } = await supabase.from('users').select('email').eq('id', user.id).single()
  if ((userRow as any)?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminDb = createAdminClient()

  // Fetch listing before updating so we know prevStatus and can notify provider.
  // Use two separate queries to avoid relying on join nullability.
  const { data: listingRaw, error: fetchErr } = await adminDb
    .from('listings')
    .select('id, title, status, provider_id')
    .eq('id', id)
    .single()

  if (fetchErr) console.error('[status] listing fetch error:', fetchErr.message)

  const listing    = listingRaw as any
  const prevStatus = listing?.status

  // Fetch provider + fallback email from users table
  let providerEmail  = ''
  let providerName   = ''
  let providerLocale = 'ro'
  if (listing?.provider_id) {
    const { data: prov, error: provErr } = await adminDb
      .from('providers')
      .select('display_name, contact_email, user:users(email, full_name, locale)')
      .eq('id', listing.provider_id)
      .single()
    if (provErr) console.error('[status] provider fetch error:', provErr.message)
    const pRaw = prov as any
    providerEmail = pRaw?.contact_email || pRaw?.user?.email || ''
    providerName  = pRaw?.display_name  || pRaw?.user?.full_name || providerEmail
    providerLocale = pRaw?.user?.locale === 'en' ? 'en' : 'ro'
  }

  // Build update — stamp published_at when going active for the first time
  const updateData: Record<string, unknown> = { status }
  if (status === 'active' && prevStatus !== 'active') {
    updateData.published_at = new Date().toISOString()
  }

  const { error } = await supabase.from('listings').update(updateData).eq('id', id)

  if (error) {
    console.error('Listing status update error:', error)
    return NextResponse.json({ error: 'Failed to update listing status' }, { status: 500 })
  }

  // Fire notification emails (non-blocking)
  if (providerEmail && listing?.title) {
    if (status === 'active' && prevStatus !== 'active') {
      sendListingApprovedToProvider({
        email:        providerEmail,
        providerName: providerName,
        listingTitle: listing.title,
        listingId:    id,
        locale:       providerLocale === 'en' ? 'en' : 'ro',
      }).catch(err => console.error('[status] approved email error:', err))
    }

    if (status === 'draft' && prevStatus === 'pending') {
      sendListingRejectedToProvider({
        email:        providerEmail,
        providerName: providerName,
        listingTitle: listing.title,
        locale:       providerLocale === 'en' ? 'en' : 'ro',
      }).catch(err => console.error('[status] rejected email error:', err))
    }
  } else {
    console.error('[status] skipping email — providerEmail:', providerEmail, 'title:', listing?.title)
  }

  return NextResponse.json({ ok: true, status })
}
