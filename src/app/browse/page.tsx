import { Suspense } from 'react'
import { AppShell }      from '@/components/layout/AppShell'
import { ActivityCard }  from '@/components/ui/ActivityCard'
import { CategoryPills } from '@/components/ui/CategoryPills'
import { SearchBar }     from '@/components/ui/SearchBar'
import { createClient }  from '@/lib/supabase/server'
import type { ListingWithRelations } from '@/types/database'

interface BrowsePageProps {
  searchParams: Promise<{ category?: string; area?: string; age?: string; q?: string }>
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

  const { data: allListingsRaw } = await query
  const allListings = allListingsRaw as unknown as any[] | null

  // Text search — client-side on the already-filtered set (sufficient for MVP scale)
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

  const hasActiveFilters = params.q || params.area || params.age || params.category

  return (
    <AppShell>
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight text-ink mb-0.5">
          Browse Activities
        </h1>
        <p className="text-sm text-ink-muted mb-5">
          All ages · Updated today · {total} {total === 1 ? 'activity' : 'activities'} listed
        </p>

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
                <ActivityCard key={listing.id} listing={listing as ListingWithRelations} featured />
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
                <ActivityCard key={listing.id} listing={listing as ListingWithRelations} />
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
