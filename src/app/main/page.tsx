import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { FeedbackForm } from './FeedbackForm'
import { CategoryIconChip } from '@/components/ui/CategoryIcon'

export const dynamic = 'force-dynamic'

// ── Shared mini card ─────────────────────────────────────────────────────────
function MiniListingCard({ listing }: { listing: any }) {
  const cat      = listing.category as any
  const area     = listing.area as any
  const provider = listing.provider as any
  const accent   = cat?.accent_color ?? '#7c3aed'
  return (
    <Link
      href={`/browse/${listing.id}`}
      className="relative min-w-[200px] md:min-w-0 bg-white border border-border rounded-xl pl-5 pr-3.5 py-3.5 hover:border-primary/30 hover:shadow-card transition-all flex-shrink-0 block overflow-hidden"
    >
      {/* Category accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ background: accent }} />

      {cat && (
        <div className="mb-2">
          <CategoryIconChip slug={cat.slug} name={cat.name} accentColor={accent} />
        </div>
      )}
      <div className="font-display text-sm font-bold text-ink leading-snug line-clamp-2 mb-1">
        {listing.title}
      </div>
      <div className="text-xs text-ink-muted">{provider?.display_name}</div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-ink-muted">{area?.name}</span>
        {listing.price_monthly != null && (
          <span className="font-display text-xs font-bold text-ink">{listing.price_monthly} RON/mo</span>
        )}
      </div>
    </Link>
  )
}

// ── Stat card (provider) ─────────────────────────────────────────────────────
interface StatCardProps {
  label:     string
  value:     number
  accent?:   'purple' | 'blue' | 'gold' | 'none'
}

function StatCard({ label, value, accent = 'none' }: StatCardProps) {
  const styles = {
    purple: { card: 'bg-primary text-white border-primary', value: 'text-white', label: 'text-white/70' },
    blue:   { card: 'bg-blue text-white border-blue', value: 'text-white', label: 'text-white/70' },
    gold:   { card: 'bg-white border-gold-deep/30', value: 'text-gold', label: 'text-ink-muted' },
    none:   { card: 'bg-white border-border', value: 'text-ink', label: 'text-ink-muted' },
  }
  const s = styles[accent]

  return (
    <div className={`border rounded-xl px-4 py-3.5 ${s.card}`}>
      <div className={`font-display text-2xl font-bold leading-none mb-0.5 ${s.value}`}>
        {value}
      </div>
      <div className={`text-xs ${s.label}`}>{label}</div>
    </div>
  )
}

// ── Why kidvo works icons ─────────────────────────────────────────────────────
const IconReach    = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M2 13.5c0-2.5 2.4-4.5 5.5-4.5s5.5 2 5.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none"/></svg>
const IconReview   = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2L9.18 5.4l3.82.56-2.75 2.68.65 3.79L7.5 10.77l-3.4 1.66.65-3.79L2 6.96l3.82-.56L7.5 2Z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/></svg>
const IconCalendar = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="3" width="12" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M5 3V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M5 7.5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
const IconChart    = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 12l3.5-4 3 2.5L12 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>

const WHY_PROVIDER = [
  { icon: <IconReach />,    label: 'Reach families',       desc: 'Connect with parents actively searching for activities in Timișoara.' },
  { icon: <IconReview />,   label: 'Trusted reviews',      desc: 'Build credibility with verified parent reviews after every trial.' },
  { icon: <IconCalendar />, label: 'Trial management',     desc: 'Manage trial requests and confirm bookings in one tap.' },
  { icon: <IconChart />,    label: 'Weekly analytics',     desc: 'Track views and parent reach week over week.' },
]

const IconSearch = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><line x1="11" y1="11" x2="14" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
const IconKid    = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M2 13.5c0-2.5 2.4-4.5 5.5-4.5s5.5 2 5.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none"/></svg>
const IconHeart  = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 13S2 9 2 5.5a3.5 3.5 0 0 1 5.5-2.9A3.5 3.5 0 0 1 13 5.5C13 9 7.5 13 7.5 13Z" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>

const WHY_PARENT = [
  { icon: <IconSearch />,   label: 'Curated activities',   desc: 'Discover vetted activities for kids in Timișoara, all in one place.' },
  { icon: <IconKid />,      label: 'Organised per child',  desc: 'Save and track activities separately for each of your kids.' },
  { icon: <IconCalendar />, label: 'Free trials first',    desc: 'Book a trial class before committing — no pressure.' },
  { icon: <IconHeart />,    label: 'Honest reviews',       desc: 'Read real reviews from other parents before you decide.' },
]

// ── Tip bulb icon ─────────────────────────────────────────────────────────────
const IconBulb = () => (
  <svg width="16" height="16" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <path d="M7.5 1.5a4.5 4.5 0 0 1 2.5 8.2V11H5v-1.3A4.5 4.5 0 0 1 7.5 1.5Z" />
    <path d="M5.5 11h4M6 13h3" />
  </svg>
)

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function MainPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileRaw } = await supabase
    .from('users').select('full_name, role').eq('id', user.id).single()
  const profile = profileRaw as { full_name: string; role: string } | null

  const role       = profile?.role ?? 'parent'
  const firstName  = profile?.full_name?.split(' ')[0] ?? ''
  const isProvider = role === 'provider' || role === 'both'

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
      const tipIndex     = (currentMonth % 5) + 1  // cycles 1–5

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
        <div className="max-w-3xl">

          {/* Provider hero banner */}
          <div className="rounded-2xl px-7 py-7 md:py-6 mb-5 relative overflow-hidden" style={{ background: '#1c1c27' }}>
            {/* Decorative gradient orb */}
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', transform: 'translate(20%, -30%)' }} />

            <p className="font-display text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.50)' }}>
              Your activities reached
            </p>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-display text-5xl font-bold leading-none" style={{ color: '#f5c542' }}>
                {weekReach}
              </span>
              <span className="font-display text-2xl font-bold text-white">
                parents this week
              </span>
            </div>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.50)' }}>
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
                  className="inline-flex items-center font-display text-sm font-bold px-5 py-2.5 rounded-full transition-opacity hover:opacity-90"
                  style={{ background: '#f5c542', color: '#1c1c27' }}
                >
                  View trial requests →
                </Link>
              )}
              {!hasListings ? (
                <Link
                  href="/listings/new"
                  className="inline-flex items-center font-display text-sm font-bold px-5 py-2.5 rounded-full transition-opacity hover:opacity-90"
                  style={{ background: '#f5c542', color: '#1c1c27' }}
                >
                  List an activity →
                </Link>
              ) : (
                <Link
                  href="/listings/analytics"
                  className="inline-flex items-center font-display text-sm font-semibold px-5 py-2.5 rounded-full border transition-colors"
                  style={{ color: 'rgba(255,255,255,0.65)', borderColor: 'rgba(255,255,255,0.18)' }}
                >
                  Full analytics →
                </Link>
              )}
            </div>
          </div>

          {/* Performance this week */}
          <div className="mt-6">
            <p className="font-display text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
              Performance this week
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Parents reached" value={weekReach}     accent="purple" />
              <StatCard label="Total views"     value={totalViews}    accent="blue" />
              <StatCard label="Pending trials"  value={pendingTrials} accent={pendingTrials > 0 ? 'gold' : 'none'} />
              <StatCard label="Active listings" value={activeCount} />
            </div>
          </div>

          {/* Why kidvo works for providers */}
          <div className="mt-6">
            <p className="font-display text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">
              Why kidvo works for providers
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {WHY_PROVIDER.map(item => (
                <div key={item.label} className="flex items-start gap-3 bg-white border border-border rounded-xl p-4">
                  <span className="w-8 h-8 rounded-lg bg-primary-lt flex items-center justify-center flex-shrink-0 text-primary">
                    {item.icon}
                  </span>
                  <div>
                    <div className="font-display text-sm font-bold text-ink">{item.label}</div>
                    <div className="text-xs text-ink-muted mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tip of the month */}
          {tipBody && (
            <div className="mt-4 flex items-start gap-3 bg-white border border-border rounded-xl px-5 py-4">
              <span className="w-8 h-8 rounded-lg bg-gold-lt flex items-center justify-center flex-shrink-0 text-gold-text flex-shrink-0">
                <IconBulb />
              </span>
              <div>
                <div className="font-display text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
                  Tip of the month
                </div>
                <p className="text-sm text-ink">{tipBody}</p>
              </div>
            </div>
          )}

          {/* Provider feedback */}
          <div className="mt-4 mb-6">
            <p className="font-display text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
              Missing something?
            </p>
            <div className="bg-white border border-border rounded-xl px-5 py-4">
              <p className="text-sm text-ink-muted mb-3">
                Tell us what feature or section would help you use kidvo better.
              </p>
              <FeedbackForm />
            </div>
          </div>

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
        category:categories(name, slug, accent_color),
        area:areas(name),
        provider:providers(display_name)
      )
    `).eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('listings').select(`
      id, title, price_monthly,
      category:categories(name, slug, accent_color),
      area:areas(name),
      provider:providers(display_name)
    `).eq('status', 'active')
     .gte('created_at', monthStart)
     .order('created_at', { ascending: false })
     .limit(6),
  ])

  const children     = childrenRes.data ?? []
  const pendingTrials = trialsRes.data?.length ?? 0
  const allSaves     = (savesRes.data ?? []).filter((s: any) => s.listing && (s.listing as any).status === 'active')
  const newListings  = newListingsRes.data ?? []
  const savedCount   = allSaves.length

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
        category:categories(name, slug, accent_color),
        area:areas(name),
        provider:providers(display_name)
      `).in('id', popularIds).eq('status', 'active')).data ?? [])
    : []

  return (
    <AppShell>
      <div className="max-w-3xl">

        {/* Parent hero banner */}
        <div className="rounded-2xl px-7 py-7 md:py-6 mb-5 relative overflow-hidden" style={{ background: '#1c1c27' }}>
          {/* Decorative gradient orb */}
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #2aa7ff 0%, transparent 70%)', transform: 'translate(20%, -30%)' }} />

          <p className="font-display text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.50)' }}>
            Hi, {firstName}!
          </p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-display text-5xl font-bold leading-none" style={{ color: '#f5c542' }}>
              {savedCount}
            </span>
            <span className="font-display text-2xl font-bold text-white">
              {savedCount === 1 ? 'activity saved' : 'activities saved'} for your kids
            </span>
          </div>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.50)' }}>
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
                className="inline-flex items-center font-display text-sm font-bold px-5 py-2.5 rounded-full transition-opacity hover:opacity-90"
                style={{ background: '#f5c542', color: '#1c1c27' }}
              >
                View bookings →
              </Link>
            )}
            <Link
              href="/browse"
              className="inline-flex items-center font-display text-sm font-semibold px-5 py-2.5 rounded-full border transition-colors"
              style={{ color: 'rgba(255,255,255,0.65)', borderColor: 'rgba(255,255,255,0.18)' }}
            >
              Browse activities →
            </Link>
          </div>
        </div>

        {/* Per-kid saved activities */}
        {children.map((kid: any) => {
          const kidSaves = allSaves
            .filter((s: any) => s.kid_id === kid.id)
            .slice(0, 10)
          return (
            <div key={kid.id} className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="font-display text-sm font-bold text-ink">
                  {kid.name}&apos;s saved activities
                </p>
                <Link href="/kids" className="text-xs font-display font-semibold text-primary hover:underline">
                  See all →
                </Link>
              </div>
              {kidSaves.length === 0 ? (
                <div className="text-sm text-ink-muted bg-white border border-border rounded-xl px-4 py-3">
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
          <div className="mt-6 bg-white border border-border rounded-xl px-5 py-4 text-sm text-ink-muted">
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
          <div className="mt-6">
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

        {/* Why kidvo works for parents */}
        <div className="mt-6">
          <p className="font-display text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">
            Why kidvo works for parents
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {WHY_PARENT.map(item => (
              <div key={item.label} className="flex items-start gap-3 bg-white border border-border rounded-xl p-4">
                <span className="w-8 h-8 rounded-lg bg-primary-lt flex items-center justify-center flex-shrink-0 text-primary">
                  {item.icon}
                </span>
                <div>
                  <div className="font-display text-sm font-bold text-ink">{item.label}</div>
                  <div className="text-xs text-ink-muted mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Parent feedback */}
        <div className="mt-4 mb-6">
          <p className="font-display text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
            Missing something?
          </p>
          <div className="bg-white border border-border rounded-xl px-5 py-4">
            <p className="text-sm text-ink-muted mb-3">
              Tell us what would help you find the right activities for your kids.
            </p>
            <FeedbackForm />
          </div>
        </div>

      </div>
    </AppShell>
  )
}
