import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAccountDeletedConfirmation } from '@/lib/email'

// POST /api/auth/delete-account
// Permanently deletes the authenticated user's account.
// Uses the service-role admin client to bypass RLS and delete the auth user.
// Supabase cascades remove the users row and all dependent rows
// (providers, trial_requests, saves, reviews).
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch name before deletion so we can personalise the goodbye email
  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const adminDb = createAdminClient()

  // If user is a provider, explicitly delete their listings and all listing-level
  // dependents before deleting the auth user. Without this, listings may become
  // orphaned if the FK to providers lacks ON DELETE CASCADE.
  const { data: providerData } = await supabase
    .from('providers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (providerData?.id) {
    const { data: listingRows } = await adminDb
      .from('listings')
      .select('id')
      .eq('provider_id', providerData.id)

    if (listingRows?.length) {
      const ids = listingRows.map((l: any) => l.id)
      await Promise.all([
        adminDb.from('saves').delete().in('listing_id', ids),
        adminDb.from('trial_requests').delete().in('listing_id', ids),
        adminDb.from('listing_schedules').delete().in('listing_id', ids),
      ])
      await adminDb.from('listings').delete().eq('provider_id', providerData.id)
    }
  }

  const { error } = await adminDb.auth.admin.deleteUser(user.id)

  if (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send goodbye email after successful deletion (fire-and-forget)
  await sendAccountDeletedConfirmation({
    email: user.email!,
    name:  (profile as any)?.full_name ?? 'there',
  }).catch(console.error)

  return NextResponse.json({ ok: true })
}
