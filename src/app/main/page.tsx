import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ── Shared mini card ─────────────────────────────────────────────────────────
function MiniListingCard({ listing }: { listing: any }) {
  const cat      = listing.category as any
  const area     = listing.area as any
  const provider = listing.provider as any
  return (
    <Link
      href={`/browse/${listing.id}`}
      className="min-w-[200px] md:min-w-0 bg-white border border-border rounded-lg p-3.5 hover:border-primary transition-colors flex-shrink-0 block"
    >
      {cat && (
        <span
          className="inline-block font-display text-[10px] font-bold px-2 py-0.5 rounded-full mb-2"
          style={{ background: cat.accent_color + '22', color: cat.accent_color }}
        >
          {cat.name}
        </span>
      )}
      <div className="font-display text-sm font-semibold text-ink leading-snug line-clamp-2 mb-1">
        {listing.title}
      </div>
      <div className="text-xs text-ink-muted">{provider?.display_name}</div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-ink-muted">{area?.name}</span>
        {listing.price_monthly != null && (
          <span className="font-display text-xs font-semibold text-ink">{listing.price_monthly} RON/mo</span>
        )}
      </div>
    </Link>
  )
}

// ── Stat card (provider) ─────────────────────────────────────────────────────
function StatCard({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`bg-white border rounded-lg px-4 py-3 ${highlight ? 'border-gold' : 'border-border'}`}>
      <div
        className="font-display text-2xl font-bold leading-none mb-0.5"
        style={{ color: highlight ? '#F0A500' : '#523650' }}
      >
        {value}
      </div>
      <div className="text-xs text-ink-muted">{label}</div>
    </div>
  )
}

// ── Why kidvo works icons ─────────────────────────────────────────────────────
const IconReach    = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M2 13.5c0-2.5 2.4-4.5 5.5-4.5s5.5 2 5.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none"/></svg>
const IconReview   = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2L9.18 5.4l3.82.56-2.75 2.68.65 3.79L7.5 10.77l-3.4 1.66.65-3.79L2 6.96l3.82-.56L7.5 2Z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/></svg>
const IconCalendar = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="3" width="12" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M5 3V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M5 7.5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
const IconChart    = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 12l3.5-4 3 2.5L12 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>

const WHY_ITEMS = [
  { icon: <IconReach />,    label: 'Reach families',       desc: 'Connect with parents actively searching for activities in Timișoara.' },
  { icon: <IconReview />,   label: 'Trusted reviews',      desc: 'Build credibility with verified parent reviews after every trial.' },
  { icon: <IconCalendar />, label: 'Trial management',     desc: 'Manage trial requests and confirm bookings in one tap.' },
  { icon: <IconChart />,    label: 'Weekly analytics',     desc: 'Track views and parent reach week over week.' },
]

// ── Page ─────────────────────────────────────────────────────────────────────
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

  // ── Provider home ───────────────────────────────────────────────────────────
  if (isProvider) {
    const { data: providerRaw } = await supabase
      .from('providers').select('id').eq('user_id', user.id).single()
    const provider = providerRaw as { id: string } | null

    let weekReach     = 0
    let totalViews    = 0
    let pendingTrials = 0
    let activeCount   = 0
    let tipBody       = ''

    if (provider) {
      const { data: listingsRaw } = await supabase
        .from('listings').select('id').eq('provider_id', provider.id)
      const listingIds = (listingsRaw ?? []).map((l: any) => l.id as string)

      const currentMonth = new Date().getMonth() // 0-11
      const tipIndex     = (currentMonth % 6) + 1  // cycles 1–6

      if (listingIds.length > 0) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const [viewsRes, trialsRes, activeRes, tipRes] = await Promise.all([
          supabase
            .from('listing_views').select('user_id')
            .in('listing_id', listingIds)
            .gte('viewed_at', sevenDaysAgo)
            .not('user_id', 'is', null),
          supabase
            .from('trial_requests').select('id')
            .in('listing_id', listingIds)
            .eq('status', 'pending'),
          supabase
            .from('listings').select('id', { count: 'exact', head: true })
            .eq('provider_id', provider.id).eq('status', 'active'),
          supabase.from('tips').select('body').eq('id', tipIndex).single(),
        ])
        weekReach     = new Set((viewsRes.data ?? []).map((r: any) => r.user_id)).size
        totalViews    = viewsRes.data?.length ?? 0
        pendingTrials = trialsRes.data?.length ?? 0
        activeCount   = activeRes.count ?? 0
        tipBody       = (tipRes.data as any)?.body ?? ''
      } else {
        // No listings yet — still fetch tip
        const tipRes = await supabase.from('tips').select('body').eq('id', tipIndex).single()
        tipBody = (tipRes.data as any)?.body ?? ''
      }
    }

    const hasListings = !!provider && activeCount > 0

    return (
      <AppShell>
        <div className="max-w-2xl">

          {/* Provider hero banner */}
          <div className="rounded-xl px-7 py-7 md:py-5 mb-5" style={{ background: '#3D2840' }}>
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

          {/* Performance this week */}
          <div className="mt-6">
            <p className="font-display text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
              Performance this week
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Parents reached" value={weekReach} />
              <StatCard label="Total views"     value={totalViews} />
              <StatCard label="Pending trials"  value={pendingTrials} highlight={pendingTrials > 0} />
              <StatCard label="Active listings" value={activeCount} />
            </div>
          </div>

          {/* Why kidvo works for providers */}
          <div className="mt-6">
            <p className="font-display text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">
              Why kidvo works for providers
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {WHY_ITEMS.map(item => (
                <div key={item.label} className="flex items-start gap-3 bg-white border border-border rounded-lg p-4">
                  <span className="w-8 h-8 rounded-md bg-bg flex items-center justify-center flex-shrink-0 text-ink-mid">
                    {item.icon}
                  </span>
                  <div>
                    <div className="font-display text-sm font-semibold text-ink">{item.label}</div>
                    <div className="text-xs text-ink-muted mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tip of the month */}
          {tipBody && (
            <div className="mt-4 mb-4 flex items-start gap-3 bg-white border border-border rounded-lg px-5 py-4">
              <span className="text-lg flex-shrink-0" style={{ color: '#F0A500' }}>💡</span>
              <div>
                <div className="font-display text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
                  Tip of the month
                </div>
                <p className="text-sm text-ink">{tipBody}</p>
              </div>
            </div>
          )}

        </div>
      </AppShell>
    )
  }

  // ── Parent home ─────────────────────────────────────────────────────────────
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [childrenRes, trialsRes, savesRes, newListingsRes] = await Promise.all([
    supabase.from('children').select('id, name').eq('user_id', user.id).order('created_at'),
    supabase.from('trial_requests').select('id').eq('user_id', user.id).eq('status', 'pending'),
    supabase.from('saves').select(`
      id, kid_id,
      listing:listings(
        id, title, price_monthly, status,
        category:categories(name, accent_color),
        area:areas(name),
        provider:providers(display_name)
      )
    `).eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('listings').select(`
      id, title, price_monthly,
      category:categories(name, accent_color),
      area:areas(name),
      provider:providers(display_name)
    `).eq('status', 'active')
     .gte('created_at', monthStart)
     .order('created_at', { ascending: false })
     .limit(6),
  ])

  const children    = childrenRes.data ?? []
  const pendingTrials = trialsRes.data?.length ?? 0
  const allSaves    = (savesRes.data ?? []).filter((s: any) => s.listing && (s.listing as any).status === 'active')
  const newListings = newListingsRes.data ?? []
  const savedCount  = allSaves.length

  // Popular: aggregate by listing_id across all saves, top 5
  const saveCountMap = new Map<string, number>()
  allSaves.forEach((s: any) => {
    const id = (s.listing as any)?.id
    if (id) saveCountMap.set(id, (saveCountMap.get(id) ?? 0) + 1)
  })
  const popularIds = [...saveCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)

  const popularListings: any[] = popularIds.length > 0
    ? ((await supabase.from('listings').select(`
        id, title, price_monthly,
        category:categories(name, accent_color),
        area:areas(name),
        provider:providers(display_name)
      `).in('id', popularIds).eq('status', 'active')).data ?? [])
    : []

  return (
    <AppShell>
      <div className="max-w-4xl">

        {/* Parent hero banner */}
        <div className="rounded-xl px-7 py-7 md:py-5 mb-5" style={{ background: '#3D2840' }}>
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

        {/* Per-kid saved activities */}
        {children.map((kid: any) => {
          const kidSaves = allSaves
            .filter((s: any) => s.kid_id === kid.id)
            .slice(0, 10)
          return (
            <div key={kid.id} className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="font-display text-sm font-semibold text-ink">
                  {kid.name}&apos;s saved activities
                </p>
                <Link href="/kids" className="text-xs font-display font-semibold text-primary hover:underline">
                  See all →
                </Link>
              </div>
              {kidSaves.length === 0 ? (
                <div className="text-sm text-ink-muted bg-white border border-border rounded-lg px-4 py-3">
                  No saved activities yet.{' '}
                  <Link href="/browse" className="text-primary font-semibold hover:underline">Browse →</Link>
                </div>
              ) : (
                <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible">
                  {kidSaves.map((s: any) => (
                    <MiniListingCard key={s.id} listing={s.listing} />
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* No kids yet */}
        {children.length === 0 && (
          <div className="mt-6 bg-white border border-border rounded-lg px-5 py-4 text-sm text-ink-muted">
            Add your kids in{' '}
            <Link href="/kids" className="text-primary font-semibold hover:underline">My Kids</Link>
            {' '}to track saved activities per child.
          </div>
        )}

        {/* New in Timișoara this month */}
        {newListings.length > 0 && (
          <div className="mt-6">
            <p className="font-display text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
              New in Timișoara this month
            </p>
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible">
              {newListings.map((l: any) => (
                <MiniListingCard key={l.id} listing={l} />
              ))}
            </div>
          </div>
        )}

        {/* Popular in Timișoara */}
        {popularListings.length > 0 && (
          <div className="mt-6 mb-4">
            <p className="font-display text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
              Popular in Timișoara
            </p>
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible">
              {popularListings.map((l: any) => (
                <MiniListingCard key={l.id} listing={l} />
              ))}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  )
}
