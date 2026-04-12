import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAccountDeletedConfirmation, sendTrialCancelledProviderDeleted, sendAdminProviderLeft } from '@/lib/email'

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

  // Fetch name + locale before deletion so we can personalise the goodbye email
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, locale')
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
      .select('id, title')
      .eq('provider_id', providerData.id)

    if (listingRows?.length) {
      const ids = listingRows.map((l: any) => l.id)

      // Fetch pending trial requests with parent details before deletion
      const { data: pendingTrials } = await adminDb
        .from('trial_requests')
        .select('id, listing_id, users(email, full_name, locale)')
        .in('listing_id', ids)
        .eq('status', 'pending')

      await Promise.all([
        adminDb.from('saves').delete().in('listing_id', ids),
        adminDb.from('trial_requests').delete().in('listing_id', ids),
        adminDb.from('listing_schedules').delete().in('listing_id', ids),
      ])
      await adminDb.from('listings').delete().eq('provider_id', providerData.id)

      // Notify each affected parent (fire-and-forget)
      if (pendingTrials?.length) {
        const listingMap = Object.fromEntries(listingRows.map((l: any) => [l.id, l.title]))
        await Promise.allSettled(
          pendingTrials.map((tr: any) => {
            const parent = tr.users
            const title  = listingMap[tr.listing_id] ?? 'activitate'
            if (!parent?.email) return Promise.resolve()
            return sendTrialCancelledProviderDeleted({
              parentEmail:  parent.email,
              parentName:   parent.full_name ?? 'there',
              listingTitle: title,
              locale:       parent.locale === 'en' ? 'en' : 'ro',
            })
          })
        )
      }
    }
  }

  const { error } = await adminDb.auth.admin.deleteUser(user.id)

  if (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send goodbye email after successful deletion (fire-and-forget)
  const userLocale = (profile as any)?.locale === 'en' ? 'en' as const : 'ro' as const
  await sendAccountDeletedConfirmation({
    email:  user.email!,
    name:   (profile as any)?.full_name ?? 'there',
    locale: userLocale,
  }).catch(console.error)

  // Notify admin if a provider left
  if (providerData?.id) {
    await sendAdminProviderLeft({
      providerEmail: user.email!,
      providerName:  (profile as any)?.full_name ?? 'Unknown',
    }).catch(console.error)
  }

  return NextResponse.json({ ok: true })
}
