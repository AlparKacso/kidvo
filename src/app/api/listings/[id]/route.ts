import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminDb = createAdminClient()

  // Verify this listing belongs to the authenticated user's provider profile
  const { data: listing } = await adminDb
    .from('listings')
    .select('id, provider:providers!inner(user_id)')
    .eq('id', id)
    .single()

  const providerRaw = listing?.provider
  const provider = (Array.isArray(providerRaw) ? providerRaw[0] : providerRaw) as { user_id: string } | null
  if (!provider || provider.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Cascade-delete dependents then the listing itself
  await adminDb.from('listing_views').delete().eq('listing_id', id)
  await adminDb.from('listing_schedules').delete().eq('listing_id', id)
  await adminDb.from('saves').delete().eq('listing_id', id)
  await adminDb.from('trial_requests').delete().eq('listing_id', id)

  const { error } = await adminDb.from('listings').delete().eq('id', id)
  if (error) {
    console.error('Delete listing error:', error)
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
