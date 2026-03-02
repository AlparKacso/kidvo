import { Suspense } from 'react'
import Link from 'next/link'
import { AppShell }      from '@/components/layout/AppShell'
import { ActivityCard }  from '@/components/ui/ActivityCard'
import { CategoryPills } from '@/components/ui/CategoryPills'
import { SearchBar }     from '@/components/ui/SearchBar'
import { createClient }  from '@/lib/supabase/server'
import type { ListingWithRelations } from '@/types/database'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface BrowsePageProps {
  searchParams: Promise<{ category?: string; area?: string; age?: string; q?: string }>
}

export const metadata: Metadata = {
  title: 'Activități pentru copii în Timișoara',
  description: 'Explorează toate activitățile disponibile pentru copii în Timișoara — sport, dans, muzică, arte, programare, limbi străine și mai mult.',
  alternates: {
    canonical: 'https://kidvo.eu/browse',
  },
  openGraph: {
    title: 'Activități pentru copii în Timișoara · kidvo',
    description: 'Explorează toate activitățile disponibile pentru copii în Timișoara.',
    url: 'https://kidvo.eu/browse',
  },
}

// ── Inline SVG icons (15×15 viewBox, stroke-based) ───────────────────────────

const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
    <path d="M5.5 3.5L9.5 7.5L5.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IconTrials = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="1.5" y="3" width="12" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
    <path d="M5 3V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.3" fill="none"/>
    <path d="M5 7.5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const IconSaved = () => (
  <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
    <path d="M7.5 13S2 9 2 5.5a3.5 3.5 0 0 1 5.5-2.9A3.5 3.5 0 0 1 13 5.5C13 9 7.5 13 7.5 13Z" stroke="currentColor" strokeWidth="1.3" fill="none"/>
  </svg>
)

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params   = await searchParams
  const supabase = await createClient()

  const hasActiveFilters = !!(params.q || params.area || params.age || params.category)

  // ── User + personalisation data ──────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()

  let userFirstName   = ''
  let isParent        = false
  let pendingTrials   = 0
  let children: { id: string; name: string; birth_year: number }[] = []
  let savedByKid: Record<string, any[]>  = {}
  let newListings:     any[] = []
  let popularListings: any[] = []

  if (user) {
    const profileRes = await supabase
      .from('users').select('full_name, role').eq('id', user.id).single()
    const profile = profileRes.data as { full_name: string; role: string } | null
    if (profile) {
      userFirstName = profile.full_name.split(' ')[0]
      isParent      = profile.role === 'parent' || profile.role === 'both' || profile.role === 'admin'
    }
  }

  const showPersonalised = isParent && !hasActiveFilters && !!user

  if (showPersonalised) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [childrenRes, trialsRes, newRes, trialCountsRes] = await Promise.all([
      supabase
        .from('children').select('id, name, birth_year')
        .eq('user_id', user!.id).order('name'),
      supabase
        .from('trial_requests').select('id')
        .eq('user_id', user!.id).eq('status', 'pending'),
      supabase
        .from('listings')
        .select(`*, category:categories(*), area:areas(*), provider:providers(*), schedules:listing_schedules(*)`)
        .eq('status', 'active')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('trial_requests').select('listing_id'),
    ])

    children      = (childrenRes.data ?? []) as typeof children
    pendingTrials  = trialsRes.data?.length ?? 0
    newListings    = (newRes.data ?? []) as any[]

    // Popular: sort by trial request count; fallback to featured+newest
    const trialCountMap = new Map<string, number>()
    for (const r of trialCountsRes.data ?? []) {
      trialCountMap.set(r.listing_id, (trialCountMap.get(r.listing_id) ?? 0) + 1)
    }

    if (trialCountMap.size > 0) {
      const topIds = [...trialCountMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([id]) => id)
      const { data: popularRaw } = await supabase
        .from('listings')
        .select(`*, category:categories(*), area:areas(*), provider:providers(*), schedules:listing_schedules(*)`)
        .eq('status', 'active')
        .in('id', topIds)
        .limit(6)
      popularListings = ((popularRaw ?? []) as any[]).sort(
        (a, b) => (trialCountMap.get(b.id) ?? 0) - (trialCountMap.get(a.id) ?? 0)
      )
    } else {
      const { data: fallbackRaw } = await supabase
        .from('listings')
        .select(`*, category:categories(*), area:areas(*), provider:providers(*), schedules:listing_schedules(*)`)
        .eq('status', 'active')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6)
      popularListings = (fallbackRaw ?? []) as any[]
    }

    // Saved activities grouped by kid
    if (children.length > 0) {
      const childIds = children.map(c => c.id)
      const { data: savesRaw } = await supabase
        .from('saves')
        .select(`kid_id, listing:listings(*, category:categories(*), area:areas(*), provider:providers(*), schedules:listing_schedules(*))`)
        .in('kid_id', childIds)
      for (const save of savesRaw ?? []) {
        const listing = save.listing as any
        if (!listing || listing.status !== 'active') continue
        if (!savedByKid[save.kid_id]) savedByKid[save.kid_id] = []
        savedByKid[save.kid_id].push(listing)
      }
    }
  }

  // ── Main browse query ─────────────────────────────────────────────────────────
  const [{ data: categoriesRaw }, { data: areasRaw }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('areas').select('*').order('name'),
  ])

  const categories = categoriesRaw as unknown as any[] | null
  const areas      = areasRaw      as unknown as any[] | null

  let query = supabase
    .from('listings')
    .select(`*, category:categories(*), area:areas(*), provider:providers(*), schedules:listing_schedules(*)`)
    .eq('status', 'active')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (params.category) {
    const cat = categories?.find(c => c.slug === params.category)
    if (cat) query = query.eq('category_id', cat.id)
  }
  if (params.area) {
    const area = areas?.find(a => a.slug === params.area)
    if (area) query = query.eq('area_id', area.id)
  }
  if (params.age) {
    const age = parseInt(params.age)
    if (!isNaN(age)) query = query.lte('age_min', age).gte('age_max', age)
  }

  const { data: allListingsRaw } = await query
  const allListings = allListingsRaw as unknown as any[] | null

  const q = params.q?.toLowerCase().trim() ?? ''
  const listings = q
    ? allListings?.filter(l =>
        l.title?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q) ||
        (l.provider as any)?.display_name?.toLowerCase().includes(q)
      )
    : allListings

  const featured = listings?.filter(l => l.featured) ?? []
  const rest      = listings?.filter(l => !l.featured) ?? []
  const total     = listings?.length ?? 0

  // Ratings map — covers all listings shown (browse + personalised sections)
  const allIds = [...new Set([
    ...(listings ?? []).map((l: any) => l.id as string),
    ...newListings.map((l: any) => l.id as string),
    ...popularListings.map((l: any) => l.id as string),
    ...Object.values(savedByKid).flat().map((l: any) => l.id as string),
  ])]

  const ratingsMap: Record<string, { avg: number; count: number }> = {}
  if (allIds.length > 0) {
    const { data: reviewRows } = await supabase
      .from('reviews').select('listing_id, rating').in('listing_id', allIds)
    if (reviewRows) {
      for (const r of reviewRows) {
        if (!ratingsMap[r.listing_id]) ratingsMap[r.listing_id] = { avg: 0, count: 0 }
        ratingsMap[r.listing_id].count++
        ratingsMap[r.listing_id].avg += r.rating
      }
      for (const lid in ratingsMap) {
        ratingsMap[lid].avg = ratingsMap[lid].avg / ratingsMap[lid].count
      }
    }
  }

  const CURRENT_YEAR = new Date().getFullYear()

  return (
    <AppShell>
      <div>

        {/* ── Personalised home (logged-in parent, no active filters) ── */}
        {showPersonalised && (
          <>
            {/* Greeting */}
            <div className="mb-6">
              <h1 className="font-display text-xl font-bold tracking-tight text-ink mb-0.5">
                Hi, {userFirstName}!
              </h1>
              <p className="text-sm text-ink-muted">Find the right activities for your kids in Timișoara.</p>
            </div>

            {/* Pending trials callout */}
            {pendingTrials > 0 && (
              <Link
                href="/bookings"
                className="flex items-center gap-3 bg-gold-lt border border-gold-border rounded-lg px-4 py-3 mb-5 hover:opacity-90 transition-opacity"
              >
                <span className="text-gold-text flex-shrink-0"><IconTrials /></span>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm font-semibold text-gold-text">
                    {pendingTrials} pending trial {pendingTrials === 1 ? 'request' : 'requests'}
                  </div>
                  <div className="text-xs text-gold-text/70">Tap to view your upcoming sessions</div>
                </div>
                <span className="text-gold-text/60 flex-shrink-0"><IconChevronRight /></span>
              </Link>
            )}

            {/* Per-kid saved sections */}
            {children.map(child => {
              const saved = savedByKid[child.id] ?? []
              if (saved.length === 0) return null
              const age = CURRENT_YEAR - child.birth_year
              return (
                <div key={child.id} className="mb-7">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-ink-muted"><IconSaved /></span>
                      <div>
                        <div className="section-label leading-none">Saved for {child.name}</div>
                        <div className="text-[11px] text-ink-muted mt-0.5">{age} years old</div>
                      </div>
                    </div>
                    <Link href="/saved" className="font-display text-xs font-semibold text-primary hover:underline">
                      See all
                    </Link>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(272px,1fr))]">
                    {saved.slice(0, 4).map(listing => (
                      <div key={listing.id} className="flex-shrink-0 w-[240px] md:w-auto">
                        <ActivityCard
                          listing={listing as ListingWithRelations}
                          avgRating={ratingsMap[listing.id]?.avg ?? null}
                          reviewCount={ratingsMap[listing.id]?.count}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* New in Timișoara */}
            {newListings.length > 0 && (
              <div className="mb-7">
                <div className="section-label mb-3">New in Timișoara</div>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(272px,1fr))]">
                  {newListings.map(listing => (
                    <div key={listing.id} className="flex-shrink-0 w-[240px] md:w-auto">
                      <ActivityCard
                        listing={listing as ListingWithRelations}
                        avgRating={ratingsMap[listing.id]?.avg ?? null}
                        reviewCount={ratingsMap[listing.id]?.count}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Popular near you */}
            {popularListings.length > 0 && (
              <div className="mb-7">
                <div className="section-label mb-3">Popular near you</div>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(272px,1fr))]">
                  {popularListings.map(listing => (
                    <div key={listing.id} className="flex-shrink-0 w-[240px] md:w-auto">
                      <ActivityCard
                        listing={listing as ListingWithRelations}
                        avgRating={ratingsMap[listing.id]?.avg ?? null}
                        reviewCount={ratingsMap[listing.id]?.count}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Divider + "All activities" header */}
            <div className="border-t border-border pt-6 mb-5">
              <h2 className="font-display text-base font-bold tracking-tight text-ink mb-0.5">All activities</h2>
              <p className="text-sm text-ink-muted">
                {total} {total === 1 ? 'activity' : 'activities'} · search or filter below
              </p>
            </div>
          </>
        )}

        {/* ── Standard browse header (no personalised home) ── */}
        {!showPersonalised && (
          <>
            <h1 className="font-display text-xl font-bold tracking-tight text-ink mb-0.5">
              Browse Activities
            </h1>
            <p className="text-sm text-ink-muted mb-5">
              All ages · Updated today · {total} {total === 1 ? 'activity' : 'activities'} listed
            </p>
          </>
        )}

        <Suspense>
          <SearchBar areas={areas ?? []} />
          <CategoryPills categories={categories ?? []} />
        </Suspense>

        {total === 0 && (
          <div className="bg-white border border-border rounded-lg p-12 text-center">
            <div className="text-2xl mb-3">🔍</div>
            <div className="font-display text-sm font-semibold text-ink-mid mb-1">
              {hasActiveFilters ? 'No activities match your search' : 'No activities yet'}
            </div>
            <div className="text-sm text-ink-muted">
              {hasActiveFilters ? 'Try adjusting your filters or search term.' : 'Be the first to list an activity in Timișoara.'}
            </div>
          </div>
        )}

        {featured.length > 0 && (
          <>
            <div className="section-label mb-3">Featured</div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(272px,1fr))] gap-3.5 mb-8">
              {featured.map(listing => (
                <ActivityCard key={listing.id} listing={listing as ListingWithRelations} featured
                  avgRating={ratingsMap[listing.id]?.avg ?? null}
                  reviewCount={ratingsMap[listing.id]?.count}
                />
              ))}
            </div>
          </>
        )}

        {rest.length > 0 && (
          <>
            <div className="section-label mb-3">
              {featured.length > 0 ? 'All activities' : 'Activities'}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(272px,1fr))] gap-3.5">
              {rest.map(listing => (
                <ActivityCard key={listing.id} listing={listing as ListingWithRelations}
                  avgRating={ratingsMap[listing.id]?.avg ?? null}
                  reviewCount={ratingsMap[listing.id]?.count}
                />
              ))}
            </div>
          </>
        )}

      </div>
    </AppShell>
  )
}
