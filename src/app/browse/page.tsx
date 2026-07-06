import { Suspense } from 'react'
import { AppShell }      from '@/components/layout/AppShell'
import { ActivityCard }  from '@/components/ui/ActivityCard'
import { ComingUpBand }  from '@/components/ui/ComingUpBand'
import { CategoryPills } from '@/components/ui/CategoryPills'
import { SearchBar }     from '@/components/ui/SearchBar'
import { createClient }  from '@/lib/supabase/server'
import { getCategories, getAreas } from '@/lib/referenceData'
import { applyDerivedSpots } from '@/lib/availability'
import { eventsEnabled } from '@/lib/eventsEnabled'
import { getTranslations } from 'next-intl/server'
import type { ListingWithRelations } from '@/types/database'

interface BrowsePageProps {
  searchParams: Promise<{ category?: string; area?: string; age?: string; q?: string; lang?: string }>
}

import type { Metadata } from 'next'

// Category-specific copy so each filtered URL gets its own title + description
const CATEGORY_META: Record<string, { title: string; description: string }> = {
  sport:      { title: 'Sport pentru copii în Timișoara',       description: 'Descoperă activități sportive pentru copii în Timișoara — fotbal, înot, gimnastică, arte marțiale și mai mult. Rezervă o ședință de probă gratuită.' },
  dans:       { title: 'Dans pentru copii în Timișoara',        description: 'Cursuri de dans pentru copii în Timișoara — balet, dans modern, hip-hop și mai mult. Rezervă o ședință de probă gratuită pe kidvo.' },
  muzica:     { title: 'Muzică pentru copii în Timișoara',      description: 'Lecții de muzică și instrumente pentru copii în Timișoara — pian, chitară, vioară, canto și mai mult. Rezervă o probă gratuită.' },
  arte:       { title: 'Arte pentru copii în Timișoara',        description: 'Cursuri de artă, pictură și creativitate pentru copii în Timișoara. Descoperă și rezervă o ședință de probă gratuită pe kidvo.' },
  programare: { title: 'Programare pentru copii în Timișoara',  description: 'Cursuri de programare și coding pentru copii în Timișoara. Robotică, Scratch, Python și mai mult. Probă gratuită disponibilă.' },
  limbi:      { title: 'Limbi străine pentru copii în Timișoara', description: 'Cursuri de limbi străine pentru copii în Timișoara — engleză, franceză, germană și mai mult. Rezervă o probă gratuită pe kidvo.' },
}

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ category?: string; area?: string }> }
): Promise<Metadata> {
  const { category } = await searchParams
  const catMeta = category ? CATEGORY_META[category] : null

  const title       = catMeta?.title       ?? 'Activități pentru copii în Timișoara'
  const description = catMeta?.description ?? 'Explorează toate activitățile disponibile pentru copii în Timișoara — sport, dans, muzică, arte, programare, limbi străine și mai mult.'
  const url         = category ? `https://kidvo.eu/browse?category=${category}` : 'https://kidvo.eu/browse'

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} · kidvo`,
      description,
      url,
      images: [{ url: 'https://kidvo.eu/kidvo-og-image.png', width: 1200, height: 630, alt: `${title} · kidvo` }],
    },
  }
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params   = await searchParams
  const supabase = await createClient()
  const t = await getTranslations('browse')
  const tEvents = await getTranslations('events')

  const [categories, areas] = await Promise.all([
    getCategories(),
    getAreas(),
  ])

  const languages  = ['Romanian', 'Hungarian', 'Serbian', 'German', 'English']

  // Upcoming events for the "Coming up" band (separate from the activity grid).
  // Honors the NEXT_PUBLIC_EVENTS_ENABLED kill-switch — when disabled we
  // skip the fetch entirely so `events` stays empty and ComingUpBand renders
  // null (same as the zero-events guard's natural path).
  const nowIso = new Date().toISOString()
  let events: ListingWithRelations[] = []
  if (eventsEnabled()) {
    const { data: eventsRaw } = await supabase
      .from('listings')
      .select(`*, category:categories(*), area:areas(*), provider:providers(*), schedules:listing_schedules(*)`)
      .eq('status', 'active')
      .eq('type', 'event')
      .gte('event_end_at', nowIso)
      .order('event_start_at', { ascending: true })
    events = (eventsRaw as unknown as ListingWithRelations[] | null) ?? []
  }

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
    .eq('type', 'activity')
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
  function normalize(s: string) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  }

  const q = params.q?.toLowerCase().trim() ?? ''
  const qNorm = normalize(q)
  const listings = q
    ? allListings?.filter(l =>
        normalize(l.title ?? '').includes(qNorm) ||
        normalize(l.description ?? '').includes(qNorm) ||
        normalize((l.provider as any)?.display_name ?? '').includes(qNorm)
      )
    : allListings

  // Public availability is derived from each activity's groups (spots = Σ
  // capacity − Σ occupancy), so cards show real availability + the right
  // full/open state.
  await applyDerivedSpots((listings ?? []) as { id: string; spots_total: number | null; spots_available: number | null }[])

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
  ].slice(0, 8)
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
            {t('title')}
          </div>
        </div>

        {/* ── Coming up events band — a persistent, distinct "what's on" teaser;
             scrolls away above the sticky activity filters (never removed) ── */}
        <ComingUpBand events={events} />

        {/* ── Activities focus: grouped header + filters.
             Desktop: sticky just under the 54px Topbar so filters stay reachable
             as the cards scroll. Mobile: static (the Topbar filter icon jumps back
             here) so cards get the full screen. id = scroll target. ── */}
        <div
          id="browse-filters"
          className="flex flex-col gap-2.5 scroll-mt-[60px] md:sticky md:top-[54px] md:z-10 md:-mx-[28px] md:px-[28px] md:py-3 md:bg-bg/85 md:backdrop-blur-md md:border-b md:border-border"
        >
          {/* Grouped activities header — title + count on one line (only when an events band precedes it) */}
          {events.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border md:border-t-0 md:pt-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0" aria-hidden="true">
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" />
              </svg>
              <h2 className="font-display font-black text-ink leading-none m-0" style={{ fontSize: '20px', letterSpacing: '-0.7px' }}>
                {tEvents('activitiesTitle')}
              </h2>
              <span className="font-display text-[13px] font-medium text-ink-mid">· {tEvents('activitiesCount', { count: total })}</span>
            </div>
          )}

          <Suspense>
            <SearchBar areas={areas ?? []} languages={languages} />
            <CategoryPills categories={categories ?? []} />
          </Suspense>
        </div>

        {/* ── Empty state ── */}
        {total === 0 && (
          <div className="bg-white border border-border rounded-[16px] p-12 text-center shadow-card">
            <div className="text-2xl mb-3">🔍</div>
            <div className="font-display text-sm font-semibold text-ink-mid mb-1">
              {hasActiveFilters ? t('noResults') : t('noActivities')}
            </div>
            <div className="text-sm text-ink-muted">
              {hasActiveFilters ? t('noResultsSub') : t('noActivitiesSub')}
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
                  {t('featured')}
                </div>
                <div className="font-display text-ink-muted mt-0.5" style={{ fontSize: '12.5px' }}>
                  {t('featuredSub')}
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
                  {t('allActivities')}
                </div>
                <div className="font-display text-ink-muted mt-0.5" style={{ fontSize: '12.5px' }}>
                  {t('results', { count: rest.length })}
                  {params.category ? ` in ${categories?.find(c => c.slug === params.category)?.name ?? params.category}` : ''}
                </div>
              </div>
              {/* 'N total' badge removed — the sticky grouped header already shows
                  "Weekly programs · N activities", so it was a duplicate count. */}
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
