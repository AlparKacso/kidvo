import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { FeedbackForm } from '../main/FeedbackForm'
import { OnboardingWidget } from './OnboardingWidget'
import type { OnboardingStep } from './OnboardingWidget'
import { RecommendedCard } from '@/components/ui/RecommendedCard'
import { pickRecommendation } from '@/lib/recommendations'
import { PerformanceModal } from '@/components/ui/PerformanceModal'
import type { PerformanceRow } from '@/components/ui/PerformanceModal'
import { getTranslations } from 'next-intl/server'
import { CancelTrialButton } from './CancelTrialButton'

export const dynamic = 'force-dynamic'

/* ─────────────────────────────────────────────────────────────
   SHARED PRIMITIVES
───────────────────────────────────────────────────────────── */

function SectionCard({ title, sub, linkText, linkHref, extraHeader, children }: {
  title:        string
  sub?:         string
  linkText?:    string
  linkHref?:    string
  extraHeader?: React.ReactNode
  children:     React.ReactNode
}) {
  return (
    <div className="bg-white rounded-[22px] p-[22px]" style={{ boxShadow: '0 2px 16px rgba(90,70,140,.06)' }}>
      <div className="flex items-start justify-between mb-[18px]">
        <div>
          <div className="font-display text-[17px] font-extrabold tracking-[-0.3px] text-ink">{title}</div>
          {sub && <div className="font-display text-[12.5px] text-ink-muted mt-0.5">{sub}</div>}
        </div>
        {extraHeader}
        {linkText && linkHref && (
          <Link href={linkHref} className="font-display text-[12.5px] font-semibold text-blue whitespace-nowrap hover:opacity-80">
            {linkText}
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}

/* Stat cards — prototype: 4-col grid, purple/blue gradient or white */
function StatCard({ label, value, sub, accent = 'none' }: {
  label:   string
  value:   number | string
  sub?:    string
  accent?: 'purple' | 'blue' | 'none'
}) {
  const bg =
    accent === 'purple' ? 'linear-gradient(135deg, #5b21b6, #7c3aed)' :
    accent === 'blue'   ? 'linear-gradient(135deg, #0284c7, #2aa7ff)' : ''
  const isDark = accent !== 'none'

  return (
    <div
      className="rounded-[16px] p-[18px] bg-white"
      style={{ background: bg || undefined, boxShadow: '0 2px 16px rgba(90,70,140,.06)' }}
    >
      <div className={`font-display text-[11px] font-semibold uppercase tracking-[.06em] mb-2 ${isDark ? 'text-white/65' : 'text-ink-muted'}`}>
        {label}
      </div>
      <div className={`font-display text-[27px] font-extrabold leading-none tracking-[-1px] ${isDark ? 'text-white' : 'text-ink'}`}>
        {value}
      </div>
      {sub && (
        <div className={`font-display text-[11.5px] mt-[5px] ${isDark ? 'text-white/55' : 'text-ink-muted'}`}>
          {sub}
        </div>
      )}
    </div>
  )
}

/* Session badge */
function SessionBadge({ status, label }: { status: string; label: string }) {
  const clsMap: Record<string, string> = {
    pending:   'bg-[#fef9c3] text-[#92400e]',
    confirmed: 'bg-[#dcfce7] text-[#15803d]',
    declined:  'bg-[#fee2e2] text-[#b91c1c]',
  }
  const cls = clsMap[status] ?? clsMap.pending
  return (
    <span className={`ml-auto font-display text-[11px] font-bold px-[9px] py-[3px] rounded-full whitespace-nowrap flex-shrink-0 ${cls}`}>
      {label}
    </span>
  )
}

/* Session dot color by status */
const SESSION_COLOR: Record<string, string> = {
  confirmed: '#2aa7ff',
  pending:   '#f5c542',
  declined:  '#ef4444',
}

/* Category emoji map */
const CAT_EMOJI: Record<string, string> = {
  sport: '⚽', dance: '💃', music: '🎵', coding: '💻',
  arts: '🎨', languages: '🌍', chess: '♟️', gymnastics: '🤸',
  babysitting: '🍼', other: '✨',
}

/* Activity interest bar row — % of total saves */
function BarRow({ emoji, name, pct }: { emoji: string; name: string; pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[13px] w-[18px] flex-shrink-0 leading-none">{emoji}</span>
      <span className="font-display text-[11px] text-ink-mid w-[52px] flex-shrink-0 truncate capitalize">{name}</span>
      <div className="flex-1 h-[13px] rounded-[4px] overflow-hidden" style={{ background: '#f5f4fb' }}>
        <div className="h-full rounded-[4px]" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #7c3aed, #a855f7)' }} />
      </div>
      <span className="font-display text-[11px] font-bold w-[26px] text-right text-ink-mid">{pct}%</span>
    </div>
  )
}

/* Per-kid activity interest card (saves only) */
function ActivityInterestCard({ kidName, bars, titleText, subText }: {
  kidName: string
  bars: Array<{ slug: string; name: string; pct: number }>
  titleText: string
  subText: string
}) {
  return (
    <SectionCard title={titleText} sub={subText}>
      <div className="flex flex-col gap-[7px]">
        {bars.map(b => (
          <BarRow key={b.slug} emoji={CAT_EMOJI[b.slug] ?? '✨'} name={b.name} pct={b.pct} />
        ))}
      </div>
    </SectionCard>
  )
}

/* Donut ring chart */
function Donut({ pct, color, softColor, label }: { pct: number; color: string; softColor: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-[68px] h-[68px] rounded-full flex items-center justify-center"
        style={{ background: `conic-gradient(${color} 0% ${pct}%, ${softColor} ${pct}%)` }}
      >
        <div
          className="w-[50px] h-[50px] rounded-full bg-white flex items-center justify-center font-display text-[12.5px] font-extrabold text-ink"
        >
          {pct}%
        </div>
      </div>
      <span className="font-display text-[11.5px] text-ink-muted">{label}</span>
    </div>
  )
}

/* Per-kid activity mix card */
function ActivityMixCard({ kidName, items, othersCount, titleText, subText }: {
  kidName:     string
  items:       Array<{ slug: string; name: string; pct: number; color: string; soft: string }>
  othersCount: number
  titleText:   string
  subText:     string
}) {
  return (
    <SectionCard title={titleText} sub={subText}>
      <div className="flex items-end gap-5">
        {items.map(d => (
          <Donut key={d.slug} pct={d.pct} color={d.color} softColor={d.soft} label={d.name} />
        ))}
        {othersCount > 0 && (
          <span className="font-display text-[11.5px] text-ink-muted self-end pb-1">
            +{othersCount} other{othersCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </SectionCard>
  )
}

/* Progress row for kid card */
function ProgRow({ label, pct, color, val }: { label: string; pct: number; color: string; val: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-display text-[12.5px] font-semibold text-ink w-[88px] flex-shrink-0">{label}</span>
      <div className="flex-1 h-[7px] rounded-full overflow-hidden" style={{ background: '#f5f4fb' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-display text-[12px] font-bold w-8 text-right" style={{ color }}>{val}</span>
    </div>
  )
}

/* RecommendedCard and pickRecommendation imported from @/components/ui/RecommendedCard */

/* ─────────────────────────────────────────────────────────────
   PROVIDER STAT CARD
───────────────────────────────────────────────────────────── */
const IconBulb = () => (
  <svg width="16" height="16" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <path d="M7.5 1.5a4.5 4.5 0 0 1 2.5 8.2V11H5v-1.3A4.5 4.5 0 0 1 7.5 1.5Z" />
    <path d="M5.5 11h4M6 13h3" />
  </svg>
)

/* ─────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────── */
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const tDash = await getTranslations('dashboard')

  const { data: profileRaw } = await supabase
    .from('users').select('full_name, role, onboarding_dismissed').eq('id', user.id).single()
  const profile = profileRaw as { full_name: string; role: string; onboarding_dismissed: boolean } | null
  const role       = profile?.role ?? 'parent'
  const firstName  = profile?.full_name?.split(' ')[0] ?? ''
  const isProvider = role === 'provider' || role === 'both'

  /* ── Provider dashboard ───────────────────────────────────── */
  if (isProvider) {
    const { data: providerRaw } = await supabase
      .from('providers').select('id').eq('user_id', user.id).single()
    const provider = providerRaw as { id: string } | null

    let weekReach = 0, pendingTrials = 0, confirmedTrials = 0, tipBody = ''
    let provHasAnyListing = false, provHasAnyBooking = false, provHasAnyReview = false
    let allListings: { id: string; title: string; status: string }[] = []
    let viewMap    = new Map<string, number>()
    let revealMap  = new Map<string, number>()
    let trialMap   = new Map<string, number>()
    let pendingRequests: any[] = []

    if (provider) {
      const tipIndex = (new Date().getMonth() % 5) + 1
      const { data: listingsRaw } = await supabase
        .from('listings').select('id, title, status').eq('provider_id', provider.id).order('created_at', { ascending: false })
      allListings       = (listingsRaw ?? []) as { id: string; title: string; status: string }[]
      const listingIds  = allListings.map(l => l.id)
      provHasAnyListing = listingIds.length > 0

      if (listingIds.length > 0) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const [weekViewsRes, allViewsRes, revealsRes, pendingTrialsRes, allBookingsRes, reviewsRes, pendingReqRes, tipRes] = await Promise.all([
          supabase.from('listing_views').select('user_id').in('listing_id', listingIds).gte('viewed_at', sevenDaysAgo).not('user_id', 'is', null),
          supabase.from('listing_views').select('listing_id').in('listing_id', listingIds),
          supabase.from('contact_reveals').select('listing_id').in('listing_id', listingIds),
          supabase.from('trial_requests').select('id').in('listing_id', listingIds).eq('status', 'pending'),
          supabase.from('trial_requests').select('id', { count: 'exact', head: true }).in('listing_id', listingIds),
          supabase.from('reviews').select('id', { count: 'exact', head: true }).in('listing_id', listingIds),
          supabase.from('trial_requests')
            .select('id, created_at, listing:listings(id, title, category:categories(accent_color)), parent:users(full_name)')
            .in('listing_id', listingIds).eq('status', 'pending')
            .order('created_at', { ascending: true }).limit(3),
          supabase.from('tips').select('body').eq('id', tipIndex).single(),
        ])

        weekReach     = new Set((weekViewsRes.data ?? []).map((r: any) => r.user_id)).size
        pendingTrials = pendingTrialsRes.data?.length ?? 0
        tipBody       = (tipRes.data as any)?.body ?? ''
        provHasAnyBooking = (allBookingsRes.count ?? 0) > 0
        provHasAnyReview  = (reviewsRes.count ?? 0) > 0
        pendingRequests   = (pendingReqRes.data ?? []) as any[]

        ;(allViewsRes.data  ?? []).forEach((r: any) => viewMap.set(r.listing_id, (viewMap.get(r.listing_id)  ?? 0) + 1))
        ;(revealsRes.data   ?? []).forEach((r: any) => revealMap.set(r.listing_id, (revealMap.get(r.listing_id) ?? 0) + 1))
        // fetch trials per listing (with status for breakdown)
        const { data: allTrialsRaw } = await supabase.from('trial_requests').select('listing_id, status').in('listing_id', listingIds)
        ;(allTrialsRaw ?? []).forEach((r: any) => trialMap.set(r.listing_id, (trialMap.get(r.listing_id) ?? 0) + 1))
        confirmedTrials = (allTrialsRaw ?? []).filter((r: any) => r.status === 'confirmed').length
      } else {
        const tipRes = await supabase.from('tips').select('body').eq('id', tipIndex).single()
        tipBody = (tipRes.data as any)?.body ?? ''
      }
    }

    // Derived metrics
    const activeCount      = allListings.filter(l => l.status === 'active').length
    const pausedCount      = allListings.filter(l => l.status === 'paused').length
    const pendingListings  = allListings.filter(l => l.status === 'pending').length
    const totalAllViews    = [...viewMap.values()].reduce((s, n) => s + n, 0)
    const totalAllReveals  = [...revealMap.values()].reduce((s, n) => s + n, 0)
    const totalAllTrials   = [...trialMap.values()].reduce((s, n) => s + n, 0)
    const conversionPct    = totalAllViews > 0 ? Math.round((totalAllTrials / totalAllViews) * 100) : 0
    const sortedByViews    = [...allListings].sort((a, b) => (viewMap.get(b.id) ?? 0) - (viewMap.get(a.id) ?? 0))
    const topListing       = sortedByViews[0] ?? null
    const topListingsBars  = sortedByViews
      .filter(l => (viewMap.get(l.id) ?? 0) > 0)
      .slice(0, 3)
      .map(l => ({
        title: l.title,
        views: viewMap.get(l.id) ?? 0,
        pct:   totalAllViews > 0 ? Math.round(((viewMap.get(l.id) ?? 0) / totalAllViews) * 100) : 0,
      }))

    const provSteps: OnboardingStep[] = [
      { label: 'Create your first listing',  done: provHasAnyListing, href: '/listings/new' },
      { label: 'Receive your first booking', done: provHasAnyBooking },
      { label: 'Get your first review',      done: provHasAnyReview  },
    ]
    const provOnboardingDone = provSteps.every(s => s.done)
    const showProvOnboarding = !profile?.onboarding_dismissed && !provOnboardingDone

    const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

    const perfRows: PerformanceRow[] = allListings.map(l => ({
      id:      l.id,
      title:   l.title,
      status:  l.status,
      views:   viewMap.get(l.id)   ?? 0,
      reveals: revealMap.get(l.id) ?? 0,
      trials:  trialMap.get(l.id)  ?? 0,
    }))

    return (
      <AppShell>
        {/* ── 4 stat cards ──────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px] mb-[18px]">
          <StatCard
            label={tDash('providerActiveListings')}
            value={activeCount}
            sub={[pendingListings > 0 && tDash('pendingN', { n: pendingListings }), pausedCount > 0 && tDash('pausedN', { n: pausedCount })].filter(Boolean).join(' · ') || tDash('allActive')}
            accent="purple"
          />
          <StatCard
            label={tDash('providerTotalViews')}
            value={totalAllViews}
            sub={tDash('allTime')}
            accent="blue"
          />
          <StatCard
            label={tDash('providerTrialRequests')}
            value={totalAllTrials}
            sub={`${tDash('confirmedN', { n: confirmedTrials })} · ${tDash('pendingN', { n: pendingTrials })}`}
          />
          <StatCard
            label={tDash('providerContactReveals')}
            value={totalAllReveals}
            sub={tDash('parentsUnlocked')}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-[18px]">

          {/* ── Left column ───────────────────────────────── */}
          <div className="flex flex-col gap-[18px]">

            {/* Hero card */}
            <div className="rounded-[22px] px-7 py-7 relative overflow-hidden" style={{ background: '#1c1c27' }}>
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', transform: 'translate(20%, -30%)' }} />
              <p className="font-display text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.50)' }}>
                {weekReach > 0 ? tDash('heroReachedPre') : tDash('heroThisWeek')}
              </p>
              <div className="flex items-baseline gap-2 mb-3">
                {weekReach > 0 ? (
                  <>
                    <span className="font-display text-5xl font-bold leading-none" style={{ color: '#f5c542' }}>{weekReach}</span>
                    <span className="font-display text-2xl font-bold text-white">{tDash('heroParentsWeek')}</span>
                  </>
                ) : (
                  <span className="font-display text-2xl font-bold text-white">{tDash('heroNoViews')}</span>
                )}
              </div>
              <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.50)' }}>
                {pendingTrials > 0
                  ? tDash.rich('heroPendingTrials', { n: pendingTrials, b: (c) => <span className="text-white font-semibold">{c}</span> })
                  : activeCount > 0
                    ? tDash('heroKeepListings')
                    : tDash('heroListFirst')
                }
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                {pendingTrials > 0 && (
                  <Link href="/listings?tab=bookings" className="inline-flex items-center font-display text-sm font-bold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity" style={{ background: '#f5c542', color: '#1c1c27' }}>
                    {tDash('viewTrialRequests')}
                  </Link>
                )}
                {activeCount === 0 ? (
                  <Link href="/listings/new" className="inline-flex items-center font-display text-sm font-bold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity" style={{ background: '#f5c542', color: '#1c1c27' }}>
                    {tDash('listActivity')}
                  </Link>
                ) : (
                  <Link href="/listings" className="inline-flex items-center font-display text-sm font-semibold px-5 py-2.5 rounded-full border transition-colors" style={{ color: 'rgba(255,255,255,0.65)', borderColor: 'rgba(255,255,255,0.18)' }}>
                    {tDash('myActivities')}
                  </Link>
                )}
              </div>
            </div>

            {/* Pending trial requests */}
            <SectionCard
              title={tDash('trialRequestsTitle')}
              sub={tDash('pendingOldestFirst')}
              linkText={pendingTrials > 3 ? tDash('viewAllCount', { count: pendingTrials }) : undefined}
              linkHref="/listings?tab=bookings"
            >

              {pendingRequests.length === 0 ? (
                <div className="flex flex-col items-center py-6 gap-2">
                  <span className="text-2xl">📬</span>
                  <span className="font-display text-[13px] text-ink-muted">{tDash('noPendingRequests')}</span>
                </div>
              ) : (
                <div className="flex flex-col gap-[10px]">
                  {pendingRequests.map((req: any) => {
                    const hoursAgo = Math.floor((Date.now() - new Date(req.created_at).getTime()) / 3_600_000)
                    const isUrgent = hoursAgo >= 48
                    const accent   = (req.listing as any)?.category?.accent_color ?? '#7c3aed'
                    return (
                      <Link key={req.id} href="/listings?tab=bookings"
                        className="flex items-center gap-3 px-4 py-3 rounded-[14px] border border-border hover:border-primary/30 transition-colors"
                        style={{ background: '#f9f8fd' }}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: accent }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-display text-[13px] font-semibold text-ink truncate">{(req.parent as any)?.full_name ?? '—'}</div>
                          <div className="font-display text-[11.5px] text-ink-muted truncate">{(req.listing as any)?.title}</div>
                        </div>
                        <span className={`font-display text-[11px] font-semibold flex-shrink-0 ${isUrgent ? 'text-danger' : 'text-ink-muted'}`}>
                          {hoursAgo < 1 ? 'Just now' : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.floor(hoursAgo / 24)}d ago`}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </SectionCard>

            {/* ── Mobile-only: Top listings + Conversion (shown between requests and performance) ── */}
            {topListingsBars.length > 0 && totalAllViews > 0 && (
              <div className="lg:hidden">
                <SectionCard title={tDash('topListings')} sub={tDash('byShareOfViews')}>
                  <div className="flex flex-col gap-[10px]">
                    {topListingsBars.map(l => (
                      <div key={l.title} className="flex flex-col gap-[5px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-[12.5px] font-semibold text-ink truncate leading-snug">{l.title}</span>
                          <span className="font-display text-[12px] font-bold text-ink-muted flex-shrink-0">{l.pct}%</span>
                        </div>
                        <div className="h-[10px] rounded-full overflow-hidden" style={{ background: '#ece8f5' }}>
                          <div className="h-full rounded-full" style={{ width: `${l.pct}%`, background: 'linear-gradient(90deg, #5b21b6, #7c3aed)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            )}
            {totalAllViews > 0 && <div className="lg:hidden rounded-[22px] px-[22px] py-[22px] relative overflow-hidden" style={{ background: '#1c1c27', boxShadow: '0 2px 16px rgba(90,70,140,.06)' }}>
              <div className="font-display text-[11px] font-bold tracking-[.08em] uppercase mb-[6px]" style={{ color: 'rgba(255,255,255,0.40)' }}>{tDash('conversionTitle')}</div>
              <div className="font-display text-[10.5px] mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>{tDash('conversionSub')}</div>
              <div className="flex items-start gap-0 mb-5">
                {[
                  { label: 'Views',   value: totalAllViews,   color: '#a78bfa' },
                  { label: 'Reveals', value: totalAllReveals, color: '#60a5fa' },
                  { label: 'Trials',  value: totalAllTrials,  color: '#4ade80' },
                ].map((s, i) => (
                  <div key={s.label} className="flex-1 text-center">
                    <div className="font-display text-[20px] font-extrabold leading-none mb-1" style={{ color: s.color }}>{s.value}</div>
                    <div className="font-display text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.label}</div>
                    {i < 2 && <div className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>→</div>}
                  </div>
                ))}
              </div>
              <div className="rounded-[12px] px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <span className="font-display text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>{tDash('conversionRate')}</span>
                <span className="font-display text-[20px] font-extrabold text-white">{conversionPct}%</span>
              </div>
            </div>}

            {/* Per-listing performance table */}
            {allListings.length > 0 && (
              <SectionCard
                title={tDash('performance')}
                sub={tDash('performanceSub')}
                linkText={allListings.length <= 5 ? tDash('manageListings') : undefined}
                linkHref={allListings.length <= 5 ? '/listings' : undefined}
                extraHeader={allListings.length > 5 ? <PerformanceModal rows={perfRows} /> : undefined}
              >
                <div className="flex flex-col gap-0 -mx-[22px]">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-[22px] pb-[10px] border-b border-border">
                    <span className="font-display text-[10px] font-bold tracking-[.08em] uppercase text-ink-muted">Listing</span>
                    <span className="font-display text-[10px] font-bold tracking-[.08em] uppercase text-ink-muted text-center w-16">Status</span>
                    <span className="font-display text-[10px] font-bold tracking-[.08em] uppercase text-ink-muted text-center w-12">Views</span>
                    <span className="font-display text-[10px] font-bold tracking-[.08em] uppercase text-ink-muted text-center w-14">Reveals</span>
                    <span className="font-display text-[10px] font-bold tracking-[.08em] uppercase text-ink-muted text-center w-12">Trials</span>
                  </div>
                  {allListings.slice(0, 5).map((l, i, arr) => (
                    <div key={l.id} className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center px-[22px] py-[11px] ${i < arr.length - 1 ? 'border-b border-border' : ''}`}>
                      <div className="font-display text-[13px] font-semibold text-ink truncate min-w-0">{l.title}</div>
                      <div className="w-16 flex justify-center">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize font-display ${
                          l.status === 'active' ? 'bg-success-lt text-success' :
                          l.status === 'pending' ? 'bg-gold-lt text-gold-text' : 'bg-surface text-ink-muted'
                        }`}>{l.status}</span>
                      </div>
                      <span className="font-display text-[13px] font-bold text-ink text-center w-12 tabular-nums">{viewMap.get(l.id) ?? 0}</span>
                      <span className="font-display text-[13px] font-bold text-primary text-center w-14 tabular-nums">{revealMap.get(l.id) ?? 0}</span>
                      <span className="font-display text-[13px] font-bold text-ink text-center w-12 tabular-nums">{trialMap.get(l.id) ?? 0}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          {/* ── Right column ──────────────────────────────── */}
          <div className="flex flex-col gap-[18px]">

            {/* Top listings bar chart — desktop only (mobile copy lives in left col) */}
            {topListingsBars.length > 0 && (
              <div className="hidden lg:block">
              <SectionCard title={tDash('topListings')} sub={tDash('byShareOfViews')}>
                <div className="flex flex-col gap-[10px]">
                  {topListingsBars.map(l => (
                    <div key={l.title} className="flex flex-col gap-[5px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-[12.5px] font-semibold text-ink truncate leading-snug">{l.title}</span>
                        <span className="font-display text-[12px] font-bold text-ink-muted flex-shrink-0">{l.pct}%</span>
                      </div>
                      <div className="h-[10px] rounded-full overflow-hidden" style={{ background: '#ece8f5' }}>
                        <div className="h-full rounded-full" style={{ width: `${l.pct}%`, background: 'linear-gradient(90deg, #5b21b6, #7c3aed)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
              </div>
            )}

            {/* Conversion funnel — dark card */}
            {totalAllViews > 0 && <div className="hidden lg:block rounded-[22px] px-[22px] py-[22px] relative overflow-hidden" style={{ background: '#1c1c27', boxShadow: '0 2px 16px rgba(90,70,140,.06)' }}>
              <div className="font-display text-[11px] font-bold tracking-[.08em] uppercase mb-[6px]" style={{ color: 'rgba(255,255,255,0.40)' }}>{tDash('conversionTitle')}</div>
              <div className="font-display text-[10.5px] mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>{tDash('conversionSub')}</div>
              <div className="flex items-start gap-0 mb-5">
                {[
                  { label: 'Views',   value: totalAllViews,   color: '#a78bfa' },
                  { label: 'Reveals', value: totalAllReveals, color: '#60a5fa' },
                  { label: 'Trials',  value: totalAllTrials,  color: '#4ade80' },
                ].map((s, i) => (
                  <div key={s.label} className="flex-1 text-center">
                    <div className="font-display text-[20px] font-extrabold leading-none mb-1" style={{ color: s.color }}>{s.value}</div>
                    <div className="font-display text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.label}</div>
                    {i < 2 && <div className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>→</div>}
                  </div>
                ))}
              </div>
              <div className="rounded-[12px] px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <span className="font-display text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>{tDash('conversionRate')}</span>
                <span className="font-display text-[20px] font-extrabold text-white">{conversionPct}%</span>
              </div>
            </div>}

            {/* Top listing — white card */}
            {topListing && (
              <SectionCard title={tDash('topListing')} sub={tDash('mostViewedAllTime')} linkText={tDash('editKids')} linkHref={`/listings/${topListing.id}/edit`}>
                <div className="font-display text-[14px] font-extrabold text-ink mb-4 leading-snug">{topListing.title}</div>
                <div className="flex gap-2">
                  {[
                    { label: 'Views',   value: viewMap.get(topListing.id)   ?? 0, color: '#7c3aed' },
                    { label: 'Reveals', value: revealMap.get(topListing.id) ?? 0, color: '#2aa7ff' },
                    { label: 'Trials',  value: trialMap.get(topListing.id)  ?? 0, color: '#22c55e' },
                  ].map(s => (
                    <div key={s.label} className="flex-1 text-center rounded-[12px] py-3" style={{ background: '#f9f8fd' }}>
                      <div className="font-display text-[20px] font-extrabold leading-none" style={{ color: s.color }}>{s.value}</div>
                      <div className="font-display text-[10px] text-ink-muted mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Onboarding */}
            {showProvOnboarding && <OnboardingWidget steps={provSteps} />}

            {/* Tip */}
            {tipBody && (
              <div className="flex items-start gap-3 bg-white rounded-[22px] px-5 py-4" style={{ boxShadow: '0 2px 16px rgba(90,70,140,.06)' }}>
                <span className="w-8 h-8 rounded-lg bg-gold-lt flex items-center justify-center flex-shrink-0 text-gold-text">
                  <IconBulb />
                </span>
                <div>
                  <div className="font-display text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">{tDash('tipOfMonth')}</div>
                  <p className="text-sm text-ink">{tipBody}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </AppShell>
    )
  }

  /* ── Parent dashboard — fetch everything in parallel ──────── */
  const [childrenRes, trialsRes, savesRes, topListingRes, parentReviewsRes] = await Promise.all([
    supabase.from('children').select('id, name, birth_year, area_id, interests').eq('user_id', user.id).order('created_at'),
    supabase.from('trial_requests')
      .select('id, status, preferred_day, child_id, listing:listings(id, title, provider:providers(display_name), category:categories(name, slug, accent_color))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('saves')
      .select('id, kid_id, listing:listings(id, title, price_monthly, status, category:categories(name, slug, accent_color), area:areas(name), provider:providers(display_name))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('listings')
      .select('id, title, price_monthly, age_min, age_max, area_id, category_id, cover_image_url, trial_available, category:categories(name, slug, accent_color), provider:providers(display_name)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const children         = childrenRes.data ?? []
  const allTrialsRaw     = trialsRes.data ?? []
  const sessions         = allTrialsRaw.slice(0, 3)
  const allSaves         = (savesRes.data ?? []).filter((s: any) => s.listing && (s.listing as any).status === 'active')
  const savedCount       = allSaves.length
  const bookingsCount        = allTrialsRaw.length
  const confirmedTrialsCount = allTrialsRaw.filter((t: any) => t.status === 'confirmed').length
  const childCount           = children.length
  const parentReviews        = parentReviewsRes.count ?? 0

  /* ── Onboarding widget ────────────────────────────────────── */
  const parentSteps: OnboardingStep[] = [
    { label: 'Add your first child', done: childCount > 0,    href: '/kids'                              },
    { label: 'Book a trial',         done: bookingsCount > 0, href: '/browse'                            },
    { label: 'Leave a review',       done: parentReviews > 0, href: confirmedTrialsCount > 0 ? '/browse' : undefined },
  ]
  const parentOnboardingDone = parentSteps.every(s => s.done)
  const showParentOnboarding = !profile?.onboarding_dismissed && !parentOnboardingDone

  // Helper: count categories from a list of items with a .listing.category shape
  function buildCatCount(items: any[], getCat: (item: any) => any) {
    const map = new Map<string, { name: string; slug: string; count: number }>()
    items.forEach(item => {
      const cat = getCat(item)
      if (!cat) return
      const e = map.get(cat.slug) ?? { name: cat.name, slug: cat.slug, count: 0 }
      e.count++
      map.set(cat.slug, e)
    })
    return [...map.values()].sort((a, b) => b.count - a.count)
  }

  // Per-kid activity INTEREST (saves only) — top 5, real % of total saves
  const kidInterests = children.map((kid: any) => {
    const kidSaves = allSaves.filter((s: any) => s.kid_id === kid.id)
    const sorted   = buildCatCount(kidSaves, s => (s.listing as any)?.category)
    if (sorted.length === 0) return null
    const total = sorted.reduce((sum, c) => sum + c.count, 0)
    return {
      kidId:   kid.id as string,
      kidName: kid.name as string,
      bars: sorted.slice(0, 5).map(c => ({
        slug: c.slug,
        name: c.name,
        pct:  Math.round((c.count / total) * 100),
      })),
    }
  }).filter(Boolean) as Array<{ kidId: string; kidName: string; bars: Array<{ slug: string; name: string; pct: number }> }>

  // Per-kid activity MIX (bookings only) — top 3 donuts, real % of total, + N others
  const DONUT_PALETTE = [
    { color: '#7c3aed', soft: '#f0e8ff' },
    { color: '#2aa7ff', soft: '#e0f2ff' },
    { color: '#22c55e', soft: '#dcfce7' },
  ]
  const kidMixes = children.map((kid: any) => {
    const kidBookings = allTrialsRaw.filter((t: any) => t.child_id === kid.id)
    const sorted      = buildCatCount(kidBookings, t => (t.listing as any)?.category)
    if (sorted.length === 0) return null
    const total       = sorted.reduce((sum, c) => sum + c.count, 0)
    const top3        = sorted.slice(0, 3)
    return {
      kidId:       kid.id as string,
      kidName:     kid.name as string,
      othersCount: sorted.length > 3 ? sorted.length - 3 : 0,
      items: top3.map((c, i) => ({
        slug:  c.slug,
        name:  c.name,
        pct:   Math.round((c.count / total) * 100),
        color: DONUT_PALETTE[i].color,
        soft:  DONUT_PALETTE[i].soft,
      })),
    }
  }).filter(Boolean) as Array<{ kidId: string; kidName: string; othersCount: number; items: Array<{ slug: string; name: string; pct: number; color: string; soft: string }> }>

  // Merge per-kid for render: group interest + mix by kid, preserve children order
  const kidWidgets = children.map((kid: any) => ({
    kidId:    kid.id as string,
    interest: kidInterests.find(k => k.kidId === kid.id) ?? null,
    mix:      kidMixes.find(k => k.kidId === kid.id) ?? null,
  })).filter(k => k.interest || k.mix)

  // Recommended listing — random kid + shared pickRecommendation helper
  // Server component re-renders on every navigation → Math.random() rotates naturally
  const savedIds    = new Set(allSaves.map((s: any) => (s.listing as any)?.id))
  const bookedIds   = new Set((trialsRes.data ?? []).map((t: any) => (t.listing as any)?.id))
  const allListings = topListingRes.data ?? []

  const recKid = children.length > 0
    ? (children[Math.floor(Math.random() * children.length)] as any)
    : undefined

  const excludeIds     = new Set([...savedIds, ...bookedIds]) as Set<string>
  const recommended    = recKid ? pickRecommendation(recKid, allListings, excludeIds) : (allListings[0] ?? null)
  const recommendedFor = recKid?.name as string | undefined

  // First kid for profile card
  const firstKid     = children[0]
  const firstKidSaves = allSaves.filter((s: any) => s.kid_id === firstKid?.id).length
  const hasKids      = children.length > 0

  const kidNames = children.length === 1
    ? children[0].name
    : children.length === 2
      ? `${children[0].name} & ${children[1].name}`
      : children.length > 2
        ? `${children[0].name} & ${children.length - 1} more`
        : 'No kids yet'

  return (
    <AppShell>
      {/* Greeting */}
      <p className="font-display text-[13px] font-semibold text-ink-muted mb-4">
        {tDash('greeting', { name: firstName })}
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px] mb-[18px]">
        <StatCard label={tDash('activeSaved')}    value={savedCount}    sub={tDash('thisWeek')}    accent="purple" />
        <StatCard label={tDash('trialsBooked')}   value={bookingsCount} sub={tDash('seeUpcoming')} accent="blue"   />
        <StatCard label={tDash('kidsOnProfile')}  value={childCount}    sub={kidNames} />
        <StatCard label={tDash('reviewsWritten')} value={parentReviews} sub={parentReviews > 0 ? tDash('thankYou') : tDash('leaveFirst')} />
      </div>

      {/* Two-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_328px] gap-[18px]">

        {/* ── LEFT COLUMN — sessions + kid activity widgets ── */}
        <div className="flex flex-col gap-[18px]">
          <SectionCard
            title={tDash('upcomingSessions')}
            sub={tDash('confirmedPending')}
            linkText={bookingsCount > 3 ? tDash('viewAllCount', { count: bookingsCount }) : tDash('viewAll')}
            linkHref="/bookings"
          >
            {sessions.length === 0 ? (
              <p className="font-display text-sm text-ink-muted">
                {tDash('noTrialsYet')}{' '}
                <Link href="/browse" className="text-primary font-semibold hover:underline">{tDash('browseActivities')}</Link>
              </p>
            ) : (
              <div className="flex flex-col gap-[9px]">
                {sessions.map((s: any) => {
                  const listing  = s.listing as any
                  const dotColor = SESSION_COLOR[s.status] ?? '#f5c542'
                  return (
                    <div key={s.id} className="flex items-center gap-2.5 px-3 py-[11px] rounded-[12px] border border-border" style={{ background: '#f9f8fd' }}>
                      <span className="w-[9px] h-[9px] rounded-full flex-shrink-0" style={{ background: dotColor }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-[13.5px] font-semibold text-ink leading-snug truncate">
                          {listing?.title ?? tDash('activityFallback')}
                        </div>
                        <div className="font-display text-[11.5px] text-ink-muted mt-0.5">
                          {(listing?.provider as any)?.display_name}
                          {s.preferred_day != null ? ` · ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][s.preferred_day] ?? ''}` : ''}
                        </div>
                      </div>
                      <SessionBadge status={s.status} label={
                        s.status === 'confirmed' ? tDash('sessionConfirmed') :
                        s.status === 'declined'  ? tDash('sessionDeclined')  :
                        tDash('sessionPending')
                      } />
                      {(s.status === 'pending' || s.status === 'confirmed') && (
                        <CancelTrialButton trialId={s.id} />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* Per-kid [interest | mix] rows — same width as sessions */}
          {kidWidgets.length > 0 ? (
            kidWidgets.map(k => (
              <div key={k.kidId} className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
                {k.interest && (
                  <ActivityInterestCard kidName={k.interest.kidName} bars={k.interest.bars} titleText={tDash('activityInterest', { kidName: k.interest.kidName })} subText={tDash('basedOnSaves')} />
                )}
                {k.mix && (
                  <ActivityMixCard kidName={k.mix.kidName} items={k.mix.items} othersCount={k.mix.othersCount} titleText={tDash('activityMix', { kidName: k.mix.kidName })} subText={tDash('basedOnTrials')} />
                )}
              </div>
            ))
          ) : hasKids ? (
            <SectionCard title={tDash('activityInterestEmpty')} sub={tDash('activityInterestEmptySub')}>
              <p className="font-display text-sm text-ink-muted">
                <Link href="/browse" className="text-primary font-semibold hover:underline">{tDash('browseActivities')}</Link>
              </p>
            </SectionCard>
          ) : null}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="flex flex-col gap-[14px]">

          {/* Onboarding widget */}
          {showParentOnboarding && <OnboardingWidget steps={parentSteps} />}

          {/* Recommended dark card */}
          <RecommendedCard listing={recommended} forKid={recommendedFor} />

          {/* Kid profile card */}
          {hasKids && (
            <SectionCard
              title={children.length > 1 ? tDash('yourChildren') : tDash('yourChild')}
              linkText={tDash('editKids')}
              linkHref="/kids"
            >
              <div className="flex flex-col gap-[9px]">
                {(children as any[]).map((kid) => {
                  const kidSaves    = allSaves.filter((s: any) => s.kid_id === kid.id).length
                  const kidBookings = allTrialsRaw.filter((t: any) => t.child_id === kid.id).length
                  return (
                    <div key={kid.id} className="flex items-center gap-[11px] px-3 py-[11px] rounded-[12px] border border-border" style={{ background: '#f9f8fd' }}>
                      <div className="w-9 h-9 rounded-[10px] bg-primary-lt flex items-center justify-center flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary">
                          <circle cx="9" cy="5.5" r="3"/><path d="M2.5 16c0-3 2.9-5.5 6.5-5.5s6.5 2.5 6.5 5.5"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-[13.5px] font-semibold text-ink">{kid.name}</div>
                        <div className="font-display text-[11.5px] text-ink-muted">
                          {tDash('savedCount', { count: kidSaves })} · {tDash('trialsCount', { count: kidBookings })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          )}

          {/* CTA if no kids */}
          {!hasKids && (
            <div className="bg-white rounded-[22px] p-[22px] text-center" style={{ boxShadow: '0 2px 16px rgba(90,70,140,.06)' }}>
              <div className="font-display text-[15px] font-bold text-ink mb-1">{tDash('addYourKids')}</div>
              <p className="font-display text-[12.5px] text-ink-muted mb-4">{tDash('trackActivities')}</p>
              <Link href="/kids" className="inline-block font-display text-sm font-semibold bg-primary text-white px-4 py-2 rounded-full hover:opacity-90 transition-opacity">
                {tDash('addChild')}
              </Link>
            </div>
          )}

        </div>
      </div>

      {/* Feedback */}
      <div className="mt-5 mb-6">
        <div className="bg-white border border-border rounded-xl px-5 py-4">
          <p className="text-sm text-ink-muted mb-3">{tDash('feedbackPrompt')}</p>
          <FeedbackForm />
        </div>
      </div>
    </AppShell>
  )
}
