import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { FeedbackForm } from '../main/FeedbackForm'
import { OnboardingWidget } from './OnboardingWidget'
import type { OnboardingStep } from './OnboardingWidget'

export const dynamic = 'force-dynamic'

/* ─────────────────────────────────────────────────────────────
   SHARED PRIMITIVES
───────────────────────────────────────────────────────────── */

function SectionCard({ title, sub, linkText, linkHref, children }: {
  title:      string
  sub?:       string
  linkText?:  string
  linkHref?:  string
  children:   React.ReactNode
}) {
  return (
    <div className="bg-white rounded-[22px] p-[22px]" style={{ boxShadow: '0 2px 16px rgba(90,70,140,.06)' }}>
      <div className="flex items-start justify-between mb-[18px]">
        <div>
          <div className="font-display text-[17px] font-extrabold tracking-[-0.3px] text-ink">{title}</div>
          {sub && <div className="font-display text-[12.5px] text-ink-muted mt-0.5">{sub}</div>}
        </div>
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
function SessionBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:   { label: 'Pending',        cls: 'bg-[#fef9c3] text-[#92400e]' },
    confirmed: { label: 'Confirmed ✓',   cls: 'bg-[#dcfce7] text-[#15803d]' },
    declined:  { label: 'Declined',       cls: 'bg-[#fee2e2] text-[#b91c1c]' },
  }
  const s = map[status] ?? map.pending
  return (
    <span className={`ml-auto font-display text-[11px] font-bold px-[9px] py-[3px] rounded-full whitespace-nowrap flex-shrink-0 ${s.cls}`}>
      {s.label}
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
function ActivityInterestCard({ kidName, bars }: {
  kidName: string
  bars: Array<{ slug: string; name: string; pct: number }>
}) {
  return (
    <SectionCard title={`Activity interest · ${kidName}`} sub="Based on saves">
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
function ActivityMixCard({ kidName, items, othersCount }: {
  kidName:     string
  items:       Array<{ slug: string; name: string; pct: number; color: string; soft: string }>
  othersCount: number
}) {
  return (
    <SectionCard title={`Activity mix · ${kidName}`} sub="Based on booked trials">
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

/* Recommended (dark) card */
function RecommendedCard({ listing, forKid }: { listing: any; forKid?: string }) {
  if (!listing) return null
  const cat = listing.category as any
  return (
    <div className="rounded-[22px] p-[22px] text-white" style={{ background: '#1c1c27', boxShadow: '0 6px 28px rgba(90,70,140,.12)' }}>
      <div className="font-display text-[10.5px] font-bold tracking-[.1em] uppercase mb-2.5" style={{ color: '#f0e8ff' }}>
        ⚡ {forKid ? `FOR ${forKid.toUpperCase()}` : 'RECOMMENDED FOR YOU'}
      </div>
      <div
        className="w-[42px] h-[42px] rounded-[11px] flex items-center justify-center mb-3 text-xl"
        style={{ background: 'rgba(255,255,255,.1)' }}
      >
        {cat?.slug === 'sport' ? '⚽' : cat?.slug === 'dance' ? '💃' : cat?.slug === 'music' ? '🎵' : cat?.slug === 'coding' ? '💻' : cat?.slug === 'arts' ? '🎨' : cat?.slug === 'chess' ? '♟️' : cat?.slug === 'gymnastics' ? '🤸' : '✨'}
      </div>
      <div className="font-display text-[18px] font-extrabold tracking-[-0.4px] leading-[1.25] mb-1.5">
        {listing.title}
      </div>
      <div className="font-display text-[12px] leading-[1.55] mb-4" style={{ color: 'rgba(255,255,255,.5)' }}>
        {(listing.provider as any)?.display_name}{listing.trial_available ? ' · Trial session available' : ''}
      </div>
      <div className="flex gap-5 mb-4">
        {listing.price_monthly != null && (
          <div>
            <div className="font-display text-[20px] font-extrabold leading-none">{listing.price_monthly}</div>
            <div className="font-display text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,.4)' }}>RON/mo</div>
          </div>
        )}
        {listing.trial_available && (
          <div>
            <div className="font-display text-[20px] font-extrabold leading-none">Free</div>
            <div className="font-display text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,.4)' }}>Trial</div>
          </div>
        )}
      </div>
      <Link
        href={`/browse/${listing.id}`}
        className="block w-full text-center font-display text-[13.5px] font-bold text-white rounded-[12px] py-[11px] hover:opacity-90 transition-opacity"
        style={{ background: '#2aa7ff' }}
      >
        {listing.trial_available ? 'Book trial →' : 'View listing →'}
      </Link>
    </div>
  )
}

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

    let weekReach = 0, totalViews = 0, pendingTrials = 0, activeCount = 0, tipBody = ''
    let provHasAnyListing = false, provHasAnyBooking = false, provHasAnyReview = false

    if (provider) {
      const { data: listingsRaw } = await supabase
        .from('listings').select('id').eq('provider_id', provider.id)
      const listingIds = (listingsRaw ?? []).map((l: any) => l.id as string)
      const tipIndex   = (new Date().getMonth() % 5) + 1
      provHasAnyListing = listingIds.length > 0

      if (listingIds.length > 0) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const [viewsRes, trialsRes, activeRes, tipRes, allBookingsRes, reviewsRes] = await Promise.all([
          supabase.from('listing_views').select('user_id').in('listing_id', listingIds).gte('viewed_at', sevenDaysAgo).not('user_id', 'is', null),
          supabase.from('trial_requests').select('id').in('listing_id', listingIds).eq('status', 'pending'),
          supabase.from('listings').select('id', { count: 'exact', head: true }).eq('provider_id', provider.id).eq('status', 'active'),
          supabase.from('tips').select('body').eq('id', tipIndex).single(),
          supabase.from('trial_requests').select('id', { count: 'exact', head: true }).in('listing_id', listingIds),
          supabase.from('reviews').select('id', { count: 'exact', head: true }).in('listing_id', listingIds),
        ])
        weekReach          = new Set((viewsRes.data ?? []).map((r: any) => r.user_id)).size
        totalViews         = viewsRes.data?.length ?? 0
        pendingTrials      = trialsRes.data?.length ?? 0
        activeCount        = activeRes.count ?? 0
        tipBody            = (tipRes.data as any)?.body ?? ''
        provHasAnyBooking  = (allBookingsRes.count ?? 0) > 0
        provHasAnyReview   = (reviewsRes.count ?? 0) > 0
      } else {
        const tipRes = await supabase.from('tips').select('body').eq('id', tipIndex).single()
        tipBody = (tipRes.data as any)?.body ?? ''
      }
    }

    const provSteps: OnboardingStep[] = [
      { label: 'Create your first listing',    done: provHasAnyListing, href: '/listings/new' },
      { label: 'Receive your first booking',   done: provHasAnyBooking  },
      { label: 'Get your first review',        done: provHasAnyReview   },
    ]
    const provOnboardingDone      = provSteps.every(s => s.done)
    const showProvOnboarding      = !profile?.onboarding_dismissed && !provOnboardingDone

    return (
      <AppShell>
        <div className="max-w-3xl">
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
            <StatCard label="Parents reached" value={weekReach}     sub="+this week"  accent="purple" />
            <StatCard label="Total views"     value={totalViews}    sub="7-day window" accent="blue" />
            <StatCard label="Pending trials"  value={pendingTrials} sub={pendingTrials > 0 ? 'Awaiting reply' : 'All clear'} />
            <StatCard label="Active listings" value={activeCount}   />
          </div>

          {/* Hero banner */}
          <div className="rounded-2xl px-7 py-7 md:py-6 mb-5 relative overflow-hidden" style={{ background: '#1c1c27' }}>
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', transform: 'translate(20%, -30%)' }} />
            <p className="font-display text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.50)' }}>
              Your activities reached
            </p>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-display text-5xl font-bold leading-none" style={{ color: '#f5c542' }}>{weekReach}</span>
              <span className="font-display text-2xl font-bold text-white">parents this week</span>
            </div>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.50)' }}>
              {pendingTrials > 0 ? (
                <>You have <span className="text-white font-semibold">{pendingTrials} new trial {pendingTrials === 1 ? 'request' : 'requests'}</span> waiting. Reply fast — parents choose providers who respond quickly.</>
              ) : activeCount > 0 ? (
                'Keep your listings complete and active to attract more families in Timișoara.'
              ) : (
                'List your first activity to start reaching parents in Timișoara.'
              )}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {pendingTrials > 0 && (
                <Link href="/listings/bookings" className="inline-flex items-center font-display text-sm font-bold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity" style={{ background: '#f5c542', color: '#1c1c27' }}>
                  View trial requests →
                </Link>
              )}
              {activeCount === 0 ? (
                <Link href="/listings/new" className="inline-flex items-center font-display text-sm font-bold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity" style={{ background: '#f5c542', color: '#1c1c27' }}>
                  List an activity →
                </Link>
              ) : (
                <Link href="/listings/analytics" className="inline-flex items-center font-display text-sm font-semibold px-5 py-2.5 rounded-full border transition-colors" style={{ color: 'rgba(255,255,255,0.65)', borderColor: 'rgba(255,255,255,0.18)' }}>
                  Full analytics →
                </Link>
              )}
            </div>
          </div>

          {tipBody && (
            <div className="mt-4 flex items-start gap-3 bg-white border border-border rounded-xl px-5 py-4 mb-4">
              <span className="w-8 h-8 rounded-lg bg-gold-lt flex items-center justify-center flex-shrink-0 text-gold-text">
                <IconBulb />
              </span>
              <div>
                <div className="font-display text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">Tip of the month</div>
                <p className="text-sm text-ink">{tipBody}</p>
              </div>
            </div>
          )}

          {showProvOnboarding && (
            <div className="max-w-xs mb-4">
              <OnboardingWidget steps={provSteps} />
            </div>
          )}

          <div className="mb-6">
            <div className="bg-white border border-border rounded-xl px-5 py-4">
              <p className="text-sm text-ink-muted mb-3">Tell us what feature or section would help you use kidvo better.</p>
              <FeedbackForm />
            </div>
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
  const bookingsCount    = allTrialsRaw.length
  const childCount       = children.length
  const parentReviews    = parentReviewsRes.count ?? 0

  /* ── Onboarding widget ────────────────────────────────────── */
  const parentSteps: OnboardingStep[] = [
    { label: 'Add your first child', done: childCount > 0,    href: '/kids'     },
    { label: 'Book a trial',         done: bookingsCount > 0, href: '/browse'   },
    { label: 'Leave a review',       done: parentReviews > 0, href: '/bookings' },
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

  // Recommended listing — random kid + random pick from top-5 scored pool
  // Server component re-renders on every navigation → Math.random() rotates naturally
  const savedIds    = new Set(allSaves.map((s: any) => (s.listing as any)?.id))
  const bookedIds   = new Set((trialsRes.data ?? []).map((t: any) => (t.listing as any)?.id))
  const allListings = topListingRes.data ?? []

  // Pick a random kid each render
  const recKid = children.length > 0
    ? (children[Math.floor(Math.random() * children.length)] as any)
    : undefined
  const recKidYear:      number | undefined  = recKid?.birth_year
  const recKidAge:       number | null       = recKidYear ? new Date().getFullYear() - recKidYear : null
  const recKidInterests: string[]            = recKid?.interests ?? []
  const recKidAreaId:    string | null       = recKid?.area_id ?? null

  const scored = allListings
    .filter((l: any) => !savedIds.has(l.id) && !bookedIds.has(l.id))
    .map((l: any) => {
      const cat = (l.category as any)
      let score = 0
      if (recKidInterests.length > 0 && cat?.slug && recKidInterests.includes(cat.slug)) score += 3
      if (recKidAge !== null && l.age_min <= recKidAge && l.age_max >= recKidAge)          score += 2
      if (recKidAreaId && l.area_id === recKidAreaId)                                      score += 1
      return { ...l, _score: score }
    })
    .sort((a: any, b: any) => b._score - a._score)

  // Pick randomly from the top-5 so the card feels fresh each visit
  const topPool    = scored.slice(0, 5)
  const recListing = topPool.length > 0
    ? topPool[Math.floor(Math.random() * topPool.length)]
    : (allListings.find((l: any) => !savedIds.has(l.id)) ?? allListings[0])
  const recommended    = recListing
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
        Hello, {firstName}! Here&apos;s what&apos;s happening 👋
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px] mb-[18px]">
        <StatCard label="Activities saved" value={savedCount}    sub="+this week"    accent="purple" />
        <StatCard label="Trials booked"   value={bookingsCount} sub="See upcoming →" accent="blue"   />
        <StatCard label="Kids on profile" value={childCount}    sub={kidNames} />
        <StatCard label="Reviews left"    value={0}             sub="Nothing pending" />
      </div>

      {/* Two-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_328px] gap-[18px]">

        {/* ── LEFT COLUMN — sessions + kid activity widgets ── */}
        <div className="flex flex-col gap-[18px]">
          <SectionCard
            title="Upcoming sessions"
            sub="Confirmed & pending trials"
            linkText={bookingsCount > 3 ? `View all (${bookingsCount}) →` : 'View all →'}
            linkHref="/bookings"
          >
            {sessions.length === 0 ? (
              <p className="font-display text-sm text-ink-muted">
                No trial requests yet.{' '}
                <Link href="/browse" className="text-primary font-semibold hover:underline">Browse activities →</Link>
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
                          {listing?.title ?? 'Activity'}
                        </div>
                        <div className="font-display text-[11.5px] text-ink-muted mt-0.5">
                          {(listing?.provider as any)?.display_name}
                          {s.preferred_day ? ` · ${s.preferred_day}` : ''}
                        </div>
                      </div>
                      <SessionBadge status={s.status} />
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* Per-kid [interest | mix] rows — same width as sessions */}
          {kidWidgets.length > 0 ? (
            kidWidgets.map(k => (
              <div key={k.kidId} className="grid grid-cols-2 gap-[14px]">
                {k.interest && (
                  <ActivityInterestCard kidName={k.interest.kidName} bars={k.interest.bars} />
                )}
                {k.mix && (
                  <ActivityMixCard kidName={k.mix.kidName} items={k.mix.items} othersCount={k.mix.othersCount} />
                )}
              </div>
            ))
          ) : hasKids ? (
            <SectionCard title="Activity interest" sub="Save activities to see what your kids gravitate towards">
              <p className="font-display text-sm text-ink-muted">
                <Link href="/browse" className="text-primary font-semibold hover:underline">Browse activities →</Link>
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
          {hasKids && firstKid && (
            <SectionCard title="Your child" sub={children.length > 1 ? `+${children.length - 1} more on profile` : undefined}>
              <div className="flex items-center gap-[11px] mb-[13px] -mt-[4px]">
                <div className="w-10 h-10 rounded-[11px] bg-primary-lt flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary">
                    <circle cx="9" cy="5.5" r="3"/><path d="M2.5 16c0-3 2.9-5.5 6.5-5.5s6.5 2.5 6.5 5.5"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-display text-[15px] font-extrabold text-ink">{firstKid.name}</div>
                  <div className="font-display text-[11.5px] text-ink-muted">
                    {firstKidSaves} saved · {sessions.length} trial{sessions.length !== 1 ? 's' : ''} pending
                  </div>
                </div>
                <Link href="/kids" className="font-display text-[12px] font-semibold text-blue hover:opacity-80">Edit →</Link>
              </div>
            </SectionCard>
          )}

          {/* CTA if no kids */}
          {!hasKids && (
            <div className="bg-white rounded-[22px] p-[22px] text-center" style={{ boxShadow: '0 2px 16px rgba(90,70,140,.06)' }}>
              <div className="font-display text-[15px] font-bold text-ink mb-1">Add your kids</div>
              <p className="font-display text-[12.5px] text-ink-muted mb-4">Track activities and trials per child.</p>
              <Link href="/kids" className="inline-block font-display text-sm font-semibold bg-primary text-white px-4 py-2 rounded-full hover:opacity-90 transition-opacity">
                Add a child →
              </Link>
            </div>
          )}

        </div>
      </div>

      {/* Feedback */}
      <div className="mt-5 mb-6">
        <div className="bg-white border border-border rounded-xl px-5 py-4">
          <p className="text-sm text-ink-muted mb-3">Tell us what would help you find the right activities for your kids.</p>
          <FeedbackForm />
        </div>
      </div>
    </AppShell>
  )
}
