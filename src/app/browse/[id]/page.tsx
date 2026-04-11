import type { Metadata }         from 'next'
import { notFound }             from 'next/navigation'
import Link                      from 'next/link'
import { Suspense }              from 'react'
import { AppShell }              from '@/components/layout/AppShell'
import { createClient }          from '@/lib/supabase/server'
import { TrialRequestButton }    from '@/components/TrialRequestButton'
import { SaveButton }            from '@/components/ui/SaveButton'
import { ContactProviderButton } from '@/components/ui/ContactProviderButton'
import { StarRating }            from '@/components/ui/StarRating'
import { ReviewForm }            from '@/components/ui/ReviewForm'
import { EditReviewForm }        from '@/components/ui/EditReviewForm'
import { EditableReview }        from '@/components/ui/EditableReview'
import { JsonLd }                from '@/components/ui/JsonLd'
import { getTranslations }       from 'next-intl/server'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: l } = await supabase
    .from('listings')
    .select('title, description, cover_image_url, price_monthly, age_min, age_max, category:categories(name), provider:providers(display_name), area:areas(name)')
    .eq('id', id)
    .single()

  if (!l) return { title: 'Activitate · kidvo' }

  const providerName = (l.provider as any)?.display_name ?? ''
  const categoryName = (l.category as any)?.name ?? ''
  const areaName     = (l.area as any)?.name ?? 'Timișoara'
  const title        = `${l.title} — ${providerName}`
  const description  = l.description
    ? l.description.slice(0, 155) + (l.description.length > 155 ? '…' : '')
    : `${l.title} în ${areaName}, Timișoara. Vârstă ${l.age_min}–${l.age_max} ani, ${l.price_monthly} RON/lună. Rezervă o ședință de probă gratuită pe kidvo.`

  return {
    title,
    description,
    keywords: [
      l.title.toLowerCase(),
      `${categoryName.toLowerCase()} copii timisoara`,
      `${categoryName.toLowerCase()} copii ${areaName.toLowerCase()}`,
      providerName.toLowerCase(),
      'activitati copii timisoara',
    ],
    alternates: { canonical: `https://kidvo.eu/browse/${id}` },
    openGraph: {
      type: 'website',
      title: `${title} · kidvo`,
      description,
      url: `https://kidvo.eu/browse/${id}`,
      siteName: 'kidvo',
      locale: 'ro_RO',
      ...(l.cover_image_url ? { images: [{ url: l.cover_image_url, width: 1200, height: 630, alt: l.title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} · kidvo`,
      description,
      ...(l.cover_image_url ? { images: [l.cover_image_url] } : {}),
    },
  }
}

export default async function ActivityDetailPage({ params }: Props) {
  const { id }   = await params
  const supabase = await createClient()
  const t = await getTranslations('detail')

  const [{ data: listingRaw }, { data: { user } }] = await Promise.all([
    supabase
      .from('listings')
      .select(`
        *,
        category:categories(*),
        area:areas(*),
        provider:providers(*),
        schedules:listing_schedules(*)
      `)
      .eq('id', id)
      .single(),
    supabase.auth.getUser(),
  ])

  const listing = listingRaw as unknown as any | null

  if (!listing) notFound()

  // Record a view — fire and forget (don't block page render)
  supabase.from('listing_views').insert({
    listing_id: id,
    user_id: user?.id ?? null,
  }).then(() => {})

  const { category, area, provider, schedules } = listing as any

  const isFull    = (listing.spots_available ?? 1) === 0
  const spotsLeft = listing.spots_available ?? null
  const accent    = category.accent_color

  // Parallel: save status + approved reviews + eligibility
  const [saveRowRaw, reviewsRaw, confirmedTrialRaw, ownReviewRaw] = await Promise.all([
    user
      ? supabase.from('saves').select('id').eq('user_id', user.id).eq('listing_id', id).maybeSingle().then(r => r.data)
      : Promise.resolve(null),
    supabase
      .from('reviews')
      .select('id, rating, comment, created_at')
      .eq('listing_id', id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false }),
    user
      ? supabase.from('trial_requests').select('id').eq('user_id', user.id).eq('listing_id', id).eq('status', 'confirmed').limit(1).maybeSingle().then(r => r.data)
      : Promise.resolve(null),
    user
      ? supabase.from('reviews').select('id, status, rating, comment').eq('user_id', user.id).eq('listing_id', id).maybeSingle().then(r => r.data)
      : Promise.resolve(null),
  ])

  const isSaved      = !!saveRowRaw
  const reviews      = (reviewsRaw.data ?? []) as { id: string; rating: number; comment: string | null; created_at: string }[]
  const ownReview    = ownReviewRaw as { id: string; status: string; rating: number; comment: string | null } | null
  const hasConfirmed = !!confirmedTrialRaw
  const canReview    = hasConfirmed && !ownReview
  const isOwner      = !!user && (provider as any)?.user_id === user.id

  const avgRating    = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  // Build Course JSON-LD for structured data
  const listingJsonLd = listing ? {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: listing.title,
    description: listing.description ?? `${listing.title} în Timișoara`,
    provider: {
      '@type': 'Organization',
      name: (listing.provider as any)?.display_name,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Timișoara',
        addressRegion: 'Timiș',
        addressCountry: 'RO',
      },
    },
    offers: {
      '@type': 'Offer',
      price: listing.price_monthly,
      priceCurrency: 'RON',
      availability: 'https://schema.org/InStock',
    },
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: 'student',
      suggestedMinAge: listing.age_min,
      suggestedMaxAge: listing.age_max,
    },
    ...(reviews.length > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: avgRating.toFixed(1),
        reviewCount: reviews.length,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
  } : null

  const DAY_LABELS = [
    t('days.0'), t('days.1'), t('days.2'), t('days.3'),
    t('days.4'), t('days.5'), t('days.6'),
  ]

  return (
    <AppShell>
      <div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-ink-muted mb-6 flex-wrap">
          <Link href="/browse" className="hover:text-primary transition-colors">{t('breadcrumb')}</Link>
          <span>›</span>
          <Link href={`/browse?category=${category.slug}`} className="hover:text-primary transition-colors">{category.name}</Link>
          <span>›</span>
          <span className="text-ink">{listing.title}</span>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6 items-start">

          {/* ── LEFT ── */}
          <div className="order-2 md:order-1 flex flex-col gap-4">

            {/* Header card */}
            <div className="bg-white border border-border rounded-lg overflow-hidden relative">
              {/* Cover photo */}
              {listing.cover_image_url && (
                <div className="h-[220px] overflow-hidden">
                  <img src={listing.cover_image_url} alt={listing.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent }} />
              <div className="pl-6 pr-5 py-5">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: accent }} />
                  <span className="text-xs text-ink-muted">{category.name} · {area.name} · Timișoara</span>
                  {!isFull && (
                    <span className="inline-flex px-1.5 py-0.5 rounded font-display text-[10px] font-semibold bg-success-lt text-success">{t('available')}</span>
                  )}
                  {isFull && (
                    <span className="inline-flex px-1.5 py-0.5 rounded font-display text-[10px] font-semibold bg-danger-lt text-danger">{t('full')}</span>
                  )}
                  {listing.featured && (
                    <span className="inline-flex px-1.5 py-0.5 rounded font-display text-[10px] font-semibold bg-gold-lt text-gold-text">{t('featured')}</span>
                  )}
                  {avgRating > 0 && (
                    <StarRating rating={avgRating} count={reviews.length} size="sm" />
                  )}
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-ink mb-3">{listing.title}</h1>
                <div className="flex flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-surface rounded text-xs text-ink-mid">
                    <svg width="11" height="11" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5a5 5 0 0 1 5 5c0 3.5-5 8-5 8s-5-4.5-5-8a5 5 0 0 1 5-5Z" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>
                    {area.name}
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-surface rounded text-xs text-ink-mid">
                    <svg width="11" height="11" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M2 13.5c0-2.5 2.4-4.5 5.5-4.5s5.5 2 5.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none"/></svg>
                    {t('ages')}{listing.age_min}–{listing.age_max}
                  </span>
                  {schedules?.length > 0 && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-surface rounded text-xs text-ink-mid">
                      <svg width="11" height="11" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7.5 4.5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                      {[...new Set(schedules.map((s: any) => DAY_LABELS[s.day_of_week]))].join(' & ')}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-surface rounded text-xs text-ink-mid">
                    🌐 {listing.language}
                  </span>
                </div>
              </div>
            </div>

            {/* About */}
            {listing.description && (
              <div className="bg-white border border-border rounded-lg p-5">
                <div className="font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted mb-3">{t('about')}</div>
                <p className="text-base text-ink-mid leading-relaxed whitespace-pre-line">{listing.description}</p>
              </div>
            )}

            {/* Schedule */}
            {schedules?.length > 0 && (
              <div className="bg-white border border-border rounded-lg p-5">
                <div className="font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted mb-3">{t('schedule')}</div>
                <table className="w-full text-sm">
                  <tbody>
                    {schedules.map((s: any, i: number) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="py-2.5 pr-4 font-display font-semibold text-ink w-28">{DAY_LABELS[s.day_of_week]}</td>
                        <td className="py-2.5 pr-4 text-ink-mid">{s.time_start?.slice(0,5)} – {s.time_end?.slice(0,5)}</td>
                        <td className="py-2.5 text-ink-muted">{s.group_label ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Details */}
            <div className="bg-white border border-border rounded-lg p-5">
              <div className="font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted mb-3">{t('details')}</div>
              <div className="flex flex-col gap-3">
                {listing.address && (
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded bg-surface flex items-center justify-center flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5a5 5 0 0 1 5 5c0 3.5-5 8-5 8s-5-4.5-5-8a5 5 0 0 1 5-5Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><circle cx="7.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>
                    </div>
                    <div>
                      <div className="text-[11px] text-ink-muted font-display font-semibold uppercase tracking-label mb-0.5">{t('location')}</div>
                      <div className="text-sm text-ink">{listing.address}</div>
                      {listing.maps_url && (
                        <a
                          href={listing.maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary font-display font-semibold mt-1 hover:underline"
                        >
                          <svg width="11" height="11" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5a5 5 0 0 1 5 5c0 3.5-5 8-5 8s-5-4.5-5-8a5 5 0 0 1 5-5Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><circle cx="7.5" cy="6.5" r="1.5" fill="currentColor"/></svg>
                          {t('viewOnMaps')}
                        </a>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded bg-surface flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M2 13.5c0-2.5 2.4-4.5 5.5-4.5s5.5 2 5.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none"/></svg>
                  </div>
                  <div>
                    <div className="text-[11px] text-ink-muted font-display font-semibold uppercase tracking-label mb-0.5">{t('ageRange')}</div>
                    <div className="text-sm text-ink">{listing.age_min} – {listing.age_max}{t('years')}</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded bg-surface flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="3" width="12" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M5 7.5h5M7.5 5.5v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  </div>
                  <div>
                    <div className="text-[11px] text-ink-muted font-display font-semibold uppercase tracking-label mb-0.5">{t('pricing')}</div>
                    <div className="text-sm text-ink">{listing.price_monthly}{listing.pricing_type === 'session' ? t('ronPerSession') : t('ronPerMonth')}{listing.trial_available ? t('trialSessionFree') : ''}</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded bg-surface flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M2 5h11M2 8h7M2 11h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  </div>
                  <div>
                    <div className="text-[11px] text-ink-muted font-display font-semibold uppercase tracking-label mb-0.5">{t('language')}</div>
                    <div className="text-sm text-ink">{listing.language}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* What's included */}
            {listing.includes?.length > 0 && (
              <div className="bg-white border border-border rounded-lg p-5">
                <div className="font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted mb-3">{t('whatsIncluded')}</div>
                <ul className="flex flex-col gap-2">
                  {listing.includes.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-ink-mid">
                      <div className="w-5 h-5 rounded-full bg-success-lt flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5.5l2 2 4-4" stroke="#1A7A4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reviews */}
            <div className="bg-white border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted">
                  {t('reviews')}
                </div>
                {avgRating > 0 && (
                  <StarRating rating={avgRating} count={reviews.length} size="md" />
                )}
              </div>

              {/* State: own review pending moderation */}
              {ownReview?.status === 'pending' && (
                <div className="mb-4">
                  <div className="flex items-start gap-2.5 bg-gold-lt border border-gold/20 rounded-lg px-3 py-2.5 mb-3">
                    <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6.5" fill="#F0A500" opacity=".2"/><path d="M7.5 4.5v4M7.5 10.5v.5" stroke="#8a6800" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    <p className="text-xs text-gold-text leading-relaxed">{t('reviewPending')}</p>
                  </div>
                  <EditReviewForm
                    reviewId={ownReview.id}
                    initialRating={ownReview.rating}
                    initialComment={ownReview.comment}
                    status="pending"
                  />
                </div>
              )}

              {/* State: own review rejected — show edit form to fix and resubmit */}
              {ownReview?.status === 'rejected' && (
                <div className="mb-4">
                  <div className="flex items-start gap-2.5 bg-danger-lt border border-danger/20 rounded-lg px-3 py-2.5 mb-3">
                    <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6.5" fill="#dc2626" opacity=".15"/><path d="M5 5l5 5M10 5l-5 5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    <p className="text-xs text-danger leading-relaxed">{t('reviewRejected')}</p>
                  </div>
                  <EditReviewForm
                    reviewId={ownReview.id}
                    initialRating={ownReview.rating}
                    initialComment={ownReview.comment}
                    status="rejected"
                  />
                </div>
              )}

              {/* State: eligible, no review yet — show form */}
              {canReview && (
                <>
                  <p className="text-sm text-ink-mid mb-3">{t('reviewInvite')}</p>
                  <ReviewForm listingId={listing.id} providerId={provider.id} />
                  {reviews.length > 0 && <div className="h-px bg-border my-4" />}
                </>
              )}

              {/* State: not logged in */}
              {!user && reviews.length === 0 && (
                <p className="text-sm text-ink-muted">
                  <a href="/auth/login" className="text-primary hover:underline">{t('reviewSignIn')}</a> {t('reviewSignInSub')}
                </p>
              )}

              {/* State: logged in but no confirmed trial */}
              {user && !hasConfirmed && !ownReview && reviews.length === 0 && (
                <p className="text-sm text-ink-muted">{t('noReviews')}</p>
              )}

              {/* State: has reviews to show */}
              {reviews.map(review => {
                if (ownReview?.id === review.id) {
                  return (
                    <EditableReview
                      key={review.id}
                      reviewId={review.id}
                      rating={review.rating}
                      comment={review.comment}
                      createdAt={review.created_at}
                    />
                  )
                }
                return (
                  <div key={review.id} className="py-3 border-b border-border last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StarRating rating={review.rating} size="sm" />
                      <span className="text-[11px] text-ink-muted">
                        {new Date(review.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-ink-mid leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                )
              })}
            </div>

          </div>

          {/* ── RIGHT — sticky ── */}
          <div className="order-1 md:order-2 flex flex-col gap-3 md:sticky md:top-[70px]">

            {/* CTA card */}
            <div className="bg-white border border-border rounded-lg p-5">
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <span className="font-display text-2xl font-bold text-ink">{listing.price_monthly} RON</span>
                <span className="text-sm text-ink-muted">{listing.pricing_type === 'session' ? t('perSession') : t('perMonth')}</span>
              </div>
              {listing.trial_available && (
                <div className="text-xs text-ink-muted mb-4">{t('trialFooter')}</div>
              )}

              {/* Availability */}
              <div className="flex items-center gap-2 mb-4 p-2.5 bg-bg rounded">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isFull ? 'bg-danger' : 'bg-success'}`} />
                <span className="text-xs text-ink-mid flex-1">{isFull ? t('noSpots') : t('spotsAvailable')}</span>
                {!isFull && spotsLeft !== null && (
                  <span className="font-display text-xs font-bold text-ink">{t('spotsLeft', { count: spotsLeft })}</span>
                )}
              </div>

              {listing.trial_available ? (
                <Suspense fallback={
                  <button disabled className="w-full py-2.5 rounded font-display text-sm font-semibold bg-primary text-white opacity-60">
                    {t('bookTrial')}
                  </button>
                }>
                  <TrialRequestButton
                    listingId={listing.id}
                    listingTitle={listing.title}
                    schedules={schedules ?? []}
                    isFull={isFull}
                    isLoggedIn={!!user}
                  />
                </Suspense>
              ) : (
                <div className="w-full text-center text-xs py-2 mb-1 px-3 rounded bg-surface border border-border text-ink-muted">
                  {listing.trial_disabled_reason === 'cohort'
                    ? t('trialCohort')
                    : listing.trial_disabled_reason === 'full'
                    ? t('trialFull')
                    : listing.trial_disabled_reason === 'contact_us'
                    ? t('trialContact')
                    : t('noTrialAvailable')}
                </div>
              )}
              <div className="mt-2">
                <ContactProviderButton
                  listingId={listing.id}
                  displayName={provider?.display_name ?? ''}
                  contactEmail={provider?.contact_email ?? ''}
                  contactPhone={provider?.contact_phone ?? null}
                  isLoggedIn={!!user}
                />
              </div>

              <div className="h-px bg-border my-4" />
              <div className="text-[11px] text-ink-muted text-center leading-relaxed">
                {t('providerResponds')}<br />{t('noPaymentRequired')}
              </div>
            </div>

            {/* Save */}
            <SaveButton listingId={listing.id} initialSaved={isSaved} variant="full" />

            {/* Provider mini-card */}
            {provider && (
              <div className="bg-white border border-border rounded-lg p-4">
                <div className="font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted mb-3">{t('provider')}</div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-lt border border-primary-border flex items-center justify-center font-display text-xs font-bold text-primary flex-shrink-0">
                    {provider.display_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-display text-sm font-semibold text-ink">{provider.display_name}</div>
                    <div className="text-[11px] text-ink-muted">
                      {t('listedSince')} {new Date(provider.listed_since).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                {provider.bio && (
                  <p className="text-xs text-ink-mid leading-relaxed mb-3">{provider.bio}</p>
                )}
                {provider.verified && (
                  <div className="flex items-center gap-1.5 text-[11px] text-success">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><circle cx="5.5" cy="5.5" r="5" fill="#D6F5E5"/><path d="M3 5.5l1.5 1.5 3-3" stroke="#1A7A4A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {t('verifiedProvider')}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Owner edit bar */}
        {isOwner && (
          <div className="mt-8 flex items-center justify-between gap-4 bg-primary-lt border border-primary/20 rounded-[16px] px-5 py-4">
            <div>
              <div className="font-display text-[13px] font-bold text-primary">{t('ownerBanner')}</div>
              <div className="font-display text-[11.5px] text-ink-muted mt-0.5">{t('ownerSub')}</div>
            </div>
            <Link
              href={`/listings/${id}/edit`}
              className="flex-shrink-0 bg-primary text-white font-display text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary-deep transition-colors"
            >
              {t('editListing')}
            </Link>
          </div>
        )}

      </div>

      {listingJsonLd && <JsonLd schema={listingJsonLd} />}
    </AppShell>
  )
}
