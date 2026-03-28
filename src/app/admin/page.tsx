import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { robots: { index: false, follow: false } }
import { AdminClient } from './AdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Check admin role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((profile as unknown as { role?: string } | null)?.role !== 'admin') redirect('/browse')

  const adminDb = createAdminClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const twoDaysAgo    = new Date(Date.now() -  2 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch all data in parallel
  const [
    listingsResult,
    pendingReviewsResult,
    usersPublicResult,
    authUsersResult,
    viewsResult,
    trialsResult,
    slowTrialsResult,
  ] = await Promise.all([
    // All listings with relations (for listing moderation panel)
    supabase
      .from('listings')
      .select(`*, category:categories(*), area:areas(*), provider:providers(display_name, contact_email)`)
      .order('created_at', { ascending: false }),

    // Pending reviews for moderation
    supabase
      .from('reviews')
      .select(`id, rating, comment, created_at, listing:listings(id, title), reviewer:users(full_name, email)`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),

    // Public users for role lookup
    supabase.from('users').select('id, role'),

    // Auth users for last_sign_in_at (active user counting)
    adminDb.auth.admin.listUsers({ perPage: 1000 }),

    // Platform-wide views in last 30 days
    supabase.from('listing_views').select('listing_id').gte('viewed_at', thirtyDaysAgo),

    // Platform-wide trial requests in last 30 days
    supabase.from('trial_requests').select('listing_id').gte('created_at', thirtyDaysAgo),

    // Pending requests older than 2 days — slow providers
    supabase
      .from('trial_requests')
      .select(`id, created_at, preferred_day,
        listing:listings(id, title, provider:providers(display_name, contact_email, contact_phone)),
        parent:users(full_name, email)`)
      .eq('status', 'pending')
      .lt('created_at', twoDaysAgo)
      .order('created_at', { ascending: true }),
  ])

  const listingsRaw    = (listingsResult.data    as unknown as { status: string }[] | null) ?? []
  const pendingReviews = (pendingReviewsResult.data as unknown as any[] | null)              ?? []
  const usersPublic    = (usersPublicResult.data  as unknown as { id: string; role: string }[] | null) ?? []
  const authUsers      = authUsersResult.data?.users ?? []
  const slowTrials     = (slowTrialsResult.data  as unknown as any[] | null) ?? []
  const slowProviderCount = new Set(slowTrials.map((t: any) => t.listing?.provider?.contact_email).filter(Boolean)).size

  const pending = listingsRaw.filter(l => l.status === 'pending')
  const active  = listingsRaw.filter(l => l.status === 'active')
  const paused  = listingsRaw.filter(l => l.status === 'paused')

  // Active user counts: cross-reference role from public.users with last_sign_in_at from auth.users
  const parentIds   = new Set(usersPublic.filter(u => u.role === 'parent').map(u => u.id))
  const providerIds = new Set(usersPublic.filter(u => u.role === 'provider').map(u => u.id))

  const activeParents   = authUsers.filter(u => parentIds.has(u.id)   && (u.last_sign_in_at ?? '') > thirtyDaysAgo).length
  const activeProviders = authUsers.filter(u => providerIds.has(u.id) && (u.last_sign_in_at ?? '') > thirtyDaysAgo).length
  const platformViews   = (viewsResult.data  ?? []).length
  const platformTrials  = (trialsResult.data ?? []).length

  const parentEmails = authUsers
    .filter(u => parentIds.has(u.id))
    .map(u => u.email)
    .filter((e): e is string => Boolean(e))
    .sort()

  return (
    <AdminClient
      pending={pending}
      active={active}
      paused={paused}
      pendingReviews={pendingReviews}
      parentEmails={parentEmails}
      slowTrials={slowTrials}
      slowProviderCount={slowProviderCount}
      stats={{
        activeParents,
        activeProviders,
        activeListings: active.length,
        platformViews,
        platformTrials,
      }}
    />
  )
}
