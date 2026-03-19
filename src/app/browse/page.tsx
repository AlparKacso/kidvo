import { Suspense } from 'react'
import { AppShell }      from '@/components/layout/AppShell'
import { ActivityCard }  from '@/components/ui/ActivityCard'
import { CategoryPills } from '@/components/ui/CategoryPills'
import { SearchBar }     from '@/components/ui/SearchBar'
import { createClient }  from '@/lib/supabase/server'
import type { ListingWithRelations } from '@/types/database'

interface BrowsePageProps {
  searchParams: Promise<{ category?: string; area?: string; age?: string; q?: string; lang?: string }>
}

import type { Metadata } from 'next'

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

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params   = await searchParams
  const supabase = await createClient()

  const [{ data: categoriesRaw }, { data: areasRaw }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('areas').select('*').order('name'),
  ])

  const languages  = ['Romanian', 'Hungarian', 'Serbian', 'German', 'English']
  const categories = categoriesRaw as unknown as any[] | null
  const areas      = areasRaw      as unknown as any[] | null

  // Build query
  let query = supabase
    .from('listings')
    .select(`
      *,
      category:categories(*),
      area:areas(*),
      provider:providers(*),
      schedules:listing_schedules(*)
    `)
    .eq('status', 'active')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })

  // Category filter
  if (params.category) {
    const cat = categories?.find(c => c.slug === params.category)
    if (cat) query = query.eq('category_id', cat.id)
  }

  // Area filter
  if (params.area) {
    const area = areas?.find(a => a.slug === params.area)
    if (area) query = query.eq('area_id', area.id)
  }

  // Age filter
  if (params.age) {
    const age = parseInt(params.age)
    if (!isNaN(age)) {
      query = query.lte('age_min', age).gte('age_max', age)
    }
  }

  // Language filter
  if (params.lang) {
    query = query.eq('language', params.lang)
  }

  const { data: allListingsRaw } = await query
  const allListings = allListingsRaw as unknown as any[] | null

  // Text search — client-side on the already-filtered set
  const q = params.q?.toLowerCase().trim() ?? ''
  const listings = q
    ? allListings?.filter(l =>
        l.title?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q) ||
        (l.provider as any)?.display_name?.toLowerCase().includes(q)
      )
    : allListings

  // Fetch aggregate ratings for all visible listings (must come before featured split)
  const listingIds = (listings ?? []).map((l: any) => l.id as string)
  const ratingsMap: Record<string, { avg: number; count: number }> = {}
  if (listingIds.length > 0) {
    const { data: reviewRows } = await supabase
      .from('reviews')
      .select('listing_id, rating')
      .in('listing_id', listingIds)
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

  // Hybrid featured: manual flag OR quality floor (photo + description + ≥1 review)
  // Within auto-featured, sort by review count descending (engagement proxy)
  const manualFeaturedIds = new Set((listings ?? []).filter(l => l.featured).map(l => l.id))
  const autoFeatured = (listings ?? [])
    .filter(l => !manualFeaturedIds.has(l.id) && l.cover_image_url && l.description?.trim())
    .filter(l => (ratingsMap[l.id]?.count ?? 0) >= 1)
    .sort((a, b) => (ratingsMap[b.id]?.count ?? 0) - (ratingsMap[a.id]?.count ?? 0))
  const featured = [
    ...(listings ?? []).filter(l => l.featured),
    ...autoFeatured,
  ]
  const featuredIds = new Set(featured.map(l => l.id))
  const rest        = (listings ?? []).filter(l => !featuredIds.has(l.id))
  const total       = listings?.length ?? 0

  const hasActiveFilters = params.q || params.area || params.age || params.category || params.lang

  return (
    <AppShell>
      <div className="flex flex-col gap-5">

        {/* ── Page header ── */}
        <div>
          <div
            className="font-display font-extrabold text-ink"
            style={{ fontSize: '21px', letterSpacing: '-0.5px' }}
          >
            Browse activities
          </div>
          <div className="font-display text-ink-muted mt-0.5" style={{ fontSize: '12.5px' }}>
            Timișoara · {total} {total === 1 ? 'activity' : 'activities'} available
          </div>
        </div>

        {/* ── Search + filters ── */}
        <Suspense>
          <div className="flex flex-col gap-2">
            <SearchBar areas={areas ?? []} languages={languages} />
            <CategoryPills categories={categories ?? []} />
          </div>
        </Suspense>

        {/* ── Empty state ── */}
        {total === 0 && (
          <div className="bg-white border border-border rounded-[16px] p-12 text-center shadow-card">
            <div className="text-2xl mb-3">🔍</div>
            <div className="font-display text-sm font-semibold text-ink-mid mb-1">
              {hasActiveFilters ? 'No activities match your search' : 'No activities yet'}
            </div>
            <div className="text-sm text-ink-muted">
              {hasActiveFilters
                ? 'Try adjusting your filters or search term.'
                : 'Be the first to list an activity in Timișoara.'}
            </div>
          </div>
        )}

        {/* ── Featured section ── */}
        {featured.length > 0 && (
          <div className="bg-white rounded-[22px] p-[22px] shadow-card">
            {/* Section header */}
            <div className="flex items-start justify-between mb-[18px]">
              <div>
                <div
                  className="font-display font-extrabold text-ink"
                  style={{ fontSize: '17px', letterSpacing: '-0.3px' }}
                >
                  Featured activities
                </div>
                <div className="font-display text-ink-muted mt-0.5" style={{ fontSize: '12.5px' }}>
                  Handpicked by kidvo
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {featured.map(listing => (
                <ActivityCard
                  key={listing.id}
                  listing={listing as ListingWithRelations}
                  featured
                  avgRating={ratingsMap[listing.id]?.avg ?? null}
                  reviewCount={ratingsMap[listing.id]?.count}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── All activities section ── */}
        {rest.length > 0 && (
          <div className="bg-white rounded-[22px] p-[22px] shadow-card">
            {/* Section header */}
            <div className="flex items-start justify-between mb-[18px]">
              <div>
                <div
                  className="font-display font-extrabold text-ink"
                  style={{ fontSize: '17px', letterSpacing: '-0.3px' }}
                >
                  {featured.length > 0 ? 'All activities' : 'Activities'}
                </div>
                <div className="font-display text-ink-muted mt-0.5" style={{ fontSize: '12.5px' }}>
                  {rest.length} {rest.length === 1 ? 'result' : 'results'}
                  {params.category ? ` in ${categories?.find(c => c.slug === params.category)?.name ?? params.category}` : ''}
                </div>
              </div>
              <span
                className="font-display text-[12.5px] font-semibold whitespace-nowrap mt-0.5"
                style={{ color: '#2aa7ff' }}
              >
                {total} total
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {rest.map(listing => (
                <ActivityCard
                  key={listing.id}
                  listing={listing as ListingWithRelations}
                  avgRating={ratingsMap[listing.id]?.avg ?? null}
                  reviewCount={ratingsMap[listing.id]?.count}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  )
}
