import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

  // Fetch listing + provider info before updating (to know previous status + get contact details)
  const { data: listingRaw } = await supabase
    .from('listings')
    .select('id, title, status, provider:providers(display_name, contact_email)')
    .eq('id', id)
    .single()

  const listing    = listingRaw as any
  const prevStatus = listing?.status
  const provider   = listing?.provider

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
  if (provider?.contact_email && listing?.title) {
    // V2a: listing approved → notify provider
    if (status === 'active' && prevStatus !== 'active') {
      sendListingApprovedToProvider({
        email:        provider.contact_email,
        providerName: provider.display_name ?? provider.contact_email,
        listingTitle: listing.title,
        listingId:    id,
      }).catch(err => console.error('V2a email error:', err))
    }

    // V2b: listing rejected (pending → draft) → notify provider
    if (status === 'draft' && prevStatus === 'pending') {
      sendListingRejectedToProvider({
        email:        provider.contact_email,
        providerName: provider.display_name ?? provider.contact_email,
        listingTitle: listing.title,
      }).catch(err => console.error('V2b email error:', err))
    }
  }

  return NextResponse.json({ ok: true, status })
}
