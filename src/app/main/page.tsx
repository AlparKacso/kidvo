import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function MainPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileRaw } = await supabase
    .from('users').select('full_name, role').eq('id', user.id).single()
  const profile = profileRaw as { full_name: string; role: string } | null

  const role      = profile?.role ?? 'parent'
  const firstName = profile?.full_name?.split(' ')[0] ?? ''
  const isProvider = role === 'provider' || role === 'both' || role === 'admin'

  // ── Provider home ────────────────────────────────────────────────────────────
  if (isProvider) {
    const { data: providerRaw } = await supabase
      .from('providers').select('id').eq('user_id', user.id).single()
    const provider = providerRaw as { id: string } | null

    let weekReach    = 0
    let pendingTrials = 0

    if (provider) {
      const { data: listingsRaw } = await supabase
        .from('listings').select('id').eq('provider_id', provider.id)
      const listingIds = (listingsRaw ?? []).map((l: any) => l.id as string)

      if (listingIds.length > 0) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const [viewsRes, trialsRes] = await Promise.all([
          supabase
            .from('listing_views').select('user_id')
            .in('listing_id', listingIds)
            .gte('viewed_at', sevenDaysAgo)
            .not('user_id', 'is', null),
          supabase
            .from('trial_requests').select('id')
            .in('listing_id', listingIds)
            .eq('status', 'pending'),
        ])
        // Count distinct logged-in viewers as "parents reached"
        weekReach     = new Set((viewsRes.data ?? []).map((r: any) => r.user_id)).size
        pendingTrials = trialsRes.data?.length ?? 0
      }
    }

    const hasListings = !!provider

    return (
      <AppShell>
        <div className="max-w-2xl">

          {/* Provider hero banner */}
          <div className="rounded-xl px-7 py-7 mb-5" style={{ background: '#2A1A2E' }}>
            <p className="font-display text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Your activities reached
            </p>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-display text-5xl font-bold leading-none" style={{ color: '#F0A500' }}>
                {weekReach}
              </span>
              <span className="font-display text-2xl font-bold text-white">
                parents this week
              </span>
            </div>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {pendingTrials > 0 ? (
                <>
                  You have{' '}
                  <span className="text-white font-semibold">
                    {pendingTrials} new trial {pendingTrials === 1 ? 'request' : 'requests'}
                  </span>{' '}
                  waiting. Respond quickly — parents choose providers who reply fast.
                </>
              ) : hasListings ? (
                'Keep your listings complete and active to attract more families in Timișoara.'
              ) : (
                'List your first activity to start reaching parents in Timișoara.'
              )}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {pendingTrials > 0 && (
                <Link
                  href="/listings/bookings"
                  className="inline-flex items-center font-display text-sm font-bold px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90"
                  style={{ background: '#F0A500', color: '#1A0A1A' }}
                >
                  View trial requests →
                </Link>
              )}
              {!hasListings ? (
                <Link
                  href="/listings/new"
                  className="inline-flex items-center font-display text-sm font-bold px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90"
                  style={{ background: '#F0A500', color: '#1A0A1A' }}
                >
                  List an activity →
                </Link>
              ) : (
                <Link
                  href="/listings/analytics"
                  className="inline-flex items-center font-display text-sm font-semibold px-5 py-2.5 rounded-lg border transition-colors"
                  style={{ color: 'rgba(255,255,255,0.65)', borderColor: 'rgba(255,255,255,0.18)' }}
                >
                  Full analytics →
                </Link>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-3 gap-3">
            <Link href="/listings" className="bg-white border border-border rounded-lg p-4 hover:border-primary transition-colors">
              <div className="font-display text-sm font-semibold text-ink mb-0.5">My Activities</div>
              <div className="text-xs text-ink-muted">Manage listings</div>
            </Link>
            <Link href="/listings/bookings" className="bg-white border border-border rounded-lg p-4 hover:border-primary transition-colors">
              <div className="font-display text-sm font-semibold text-ink mb-0.5">Trial Requests</div>
              <div className="text-xs text-ink-muted">View &amp; respond</div>
            </Link>
            <Link href="/listings/analytics" className="bg-white border border-border rounded-lg p-4 hover:border-primary transition-colors">
              <div className="font-display text-sm font-semibold text-ink mb-0.5">Analytics</div>
              <div className="text-xs text-ink-muted">Views &amp; trends</div>
            </Link>
          </div>

        </div>
      </AppShell>
    )
  }

  // ── Parent home ──────────────────────────────────────────────────────────────
  const [childrenRes, trialsRes] = await Promise.all([
    supabase.from('children').select('id').eq('user_id', user.id),
    supabase.from('trial_requests').select('id').eq('user_id', user.id).eq('status', 'pending'),
  ])
  const children      = childrenRes.data ?? []
  const pendingTrials = trialsRes.data?.length ?? 0

  let savedCount = 0
  if (children.length > 0) {
    const childIds = children.map((c: any) => c.id)
    const { count } = await supabase
      .from('saves').select('id', { count: 'exact', head: true }).in('kid_id', childIds)
    savedCount = count ?? 0
  }

  return (
    <AppShell>
      <div className="max-w-2xl">

        {/* Parent hero banner */}
        <div className="rounded-xl px-7 py-7 mb-5" style={{ background: '#2A1A2E' }}>
          <p className="font-display text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Hi, {firstName}!
          </p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-display text-5xl font-bold leading-none" style={{ color: '#F0A500' }}>
              {savedCount}
            </span>
            <span className="font-display text-2xl font-bold text-white">
              {savedCount === 1 ? 'activity saved' : 'activities saved'} for your kids
            </span>
          </div>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {pendingTrials > 0 ? (
              <>
                You have{' '}
                <span className="text-white font-semibold">
                  {pendingTrials} trial {pendingTrials === 1 ? 'request' : 'requests'}
                </span>{' '}
                pending. Check what&apos;s coming up for your kids.
              </>
            ) : (
              'Discover activities in Timișoara and save the ones that fit your kids best.'
            )}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            {pendingTrials > 0 && (
              <Link
                href="/bookings"
                className="inline-flex items-center font-display text-sm font-bold px-5 py-2.5 rounded-lg transition-opacity hover:opacity-90"
                style={{ background: '#F0A500', color: '#1A0A1A' }}
              >
                View bookings →
              </Link>
            )}
            <Link
              href="/browse"
              className="inline-flex items-center font-display text-sm font-semibold px-5 py-2.5 rounded-lg border transition-colors"
              style={{ color: 'rgba(255,255,255,0.65)', borderColor: 'rgba(255,255,255,0.18)' }}
            >
              Browse activities →
            </Link>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-3 gap-3">
          <Link href="/browse" className="bg-white border border-border rounded-lg p-4 hover:border-primary transition-colors">
            <div className="font-display text-sm font-semibold text-ink mb-0.5">Browse</div>
            <div className="text-xs text-ink-muted">All activities</div>
          </Link>
          <Link href="/saved" className="bg-white border border-border rounded-lg p-4 hover:border-primary transition-colors">
            <div className="font-display text-sm font-semibold text-ink mb-0.5">Saved</div>
            <div className="text-xs text-ink-muted">Your saved list</div>
          </Link>
          <Link href="/bookings" className="bg-white border border-border rounded-lg p-4 hover:border-primary transition-colors">
            <div className="font-display text-sm font-semibold text-ink mb-0.5">Bookings</div>
            <div className="text-xs text-ink-muted">Trial requests</div>
          </Link>
        </div>

      </div>
    </AppShell>
  )
}
