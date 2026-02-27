import { notFound }             from 'next/navigation'
import Link                      from 'next/link'
import { Suspense }              from 'react'
import { AppShell }              from '@/components/layout/AppShell'
import { createClient }          from '@/lib/supabase/server'
import { TrialRequestButton }    from '@/components/TrialRequestButton'
import { SaveButton }            from '@/components/ui/SaveButton'
import { ContactProviderButton } from '@/components/ui/ContactProviderButton'

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface Props {
  params: Promise<{ id: string }>
}

export default async function ActivityDetailPage({ params }: Props) {
  const { id }   = await params
  const supabase = await createClient()

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

  const { category, area, provider, schedules } = listing as any

  const isFull    = (listing.spots_available ?? 1) === 0
  const spotsLeft = listing.spots_available ?? null
  const accent    = category.accent_color

  // Check if current user has saved this listing
  const saveRowRaw = user
    ? (await supabase.from('saves').select('id').eq('user_id', user.id).eq('listing_id', id).maybeSingle()).data
    : null
  const isSaved = !!saveRowRaw

  return (
    <AppShell>
      <div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-ink-muted mb-6">
          <Link href="/browse" className="hover:text-primary transition-colors">Browse</Link>
          <span>›</span>
          <Link href={`/browse?category=${category.slug}`} className="hover:text-primary transition-colors">{category.name}</Link>
          <span>›</span>
          <span className="text-ink">{listing.title}</span>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-[1fr_300px] gap-6 items-start">

          {/* ── LEFT ── */}
          <div className="flex flex-col gap-4">

            {/* Header card */}
            <div className="bg-white border border-border rounded-lg overflow-hidden relative">
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent }} />
              <div className="pl-6 pr-5 py-5">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: accent }} />
                  <span className="text-xs text-ink-muted">{category.name} · {area.name} · Timișoara</span>
                  {!isFull && (
                    <span className="inline-flex px-1.5 py-0.5 rounded font-display text-[10px] font-semibold bg-success-lt text-success">Available</span>
                  )}
                  {isFull && (
                    <span className="inline-flex px-1.5 py-0.5 rounded font-display text-[10px] font-semibold bg-danger-lt text-danger">Full</span>
                  )}
                  {listing.featured && (
                    <span className="inline-flex px-1.5 py-0.5 rounded font-display text-[10px] font-semibold bg-gold-lt text-gold-text">Featured</span>
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
                    Ages {listing.age_min}–{listing.age_max}
                  </span>
                  {schedules?.length > 0 && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-surface rounded text-xs text-ink-mid">
                      <svg width="11" height="11" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7.5 4.5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                      {[...new Set(schedules.map((s: any) => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][s.day_of_week]))].join(' & ')}
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
                <div className="font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted mb-3">About</div>
                <p className="text-base text-ink-mid leading-relaxed whitespace-pre-line">{listing.description}</p>
              </div>
            )}

            {/* Schedule */}
            {schedules?.length > 0 && (
              <div className="bg-white border border-border rounded-lg p-5">
                <div className="font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted mb-3">Schedule</div>
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
              <div className="font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted mb-3">Details</div>
              <div className="flex flex-col gap-3">
                {listing.address && (
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded bg-surface flex items-center justify-center flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5a5 5 0 0 1 5 5c0 3.5-5 8-5 8s-5-4.5-5-8a5 5 0 0 1 5-5Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><circle cx="7.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>
                    </div>
                    <div>
                      <div className="text-[11px] text-ink-muted font-display font-semibold uppercase tracking-label mb-0.5">Location</div>
                      <div className="text-sm text-ink">{listing.address}</div>
                    </div>
                  </div>
                )}
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded bg-surface flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M2 13.5c0-2.5 2.4-4.5 5.5-4.5s5.5 2 5.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none"/></svg>
                  </div>
                  <div>
                    <div className="text-[11px] text-ink-muted font-display font-semibold uppercase tracking-label mb-0.5">Age range</div>
                    <div className="text-sm text-ink">{listing.age_min} – {listing.age_max} years</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded bg-surface flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="3" width="12" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M5 7.5h5M7.5 5.5v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  </div>
                  <div>
                    <div className="text-[11px] text-ink-muted font-display font-semibold uppercase tracking-label mb-0.5">Pricing</div>
                    <div className="text-sm text-ink">{listing.price_monthly} RON / month{listing.trial_available ? ' · Trial session free' : ''}</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded bg-surface flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M2 5h11M2 8h7M2 11h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  </div>
                  <div>
                    <div className="text-[11px] text-ink-muted font-display font-semibold uppercase tracking-label mb-0.5">Language</div>
                    <div className="text-sm text-ink">{listing.language}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* What's included */}
            {listing.includes?.length > 0 && (
              <div className="bg-white border border-border rounded-lg p-5">
                <div className="font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted mb-3">What's included</div>
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

          </div>

          {/* ── RIGHT — sticky ── */}
          <div className="flex flex-col gap-3 sticky top-[70px]">

            {/* CTA card */}
            <div className="bg-white border border-border rounded-lg p-5">
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <span className="font-display text-2xl font-bold text-ink">{listing.price_monthly} RON</span>
                <span className="text-sm text-ink-muted">/ month</span>
              </div>
              {listing.trial_available && (
                <div className="text-xs text-ink-muted mb-4">First trial session is free · No commitment</div>
              )}

              {/* Availability */}
              <div className="flex items-center gap-2 mb-4 p-2.5 bg-bg rounded">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isFull ? 'bg-danger' : 'bg-success'}`} />
                <span className="text-xs text-ink-mid flex-1">{isFull ? 'No spots available' : 'Spots available'}</span>
                {!isFull && spotsLeft !== null && (
                  <span className="font-display text-xs font-bold text-ink">{spotsLeft} left</span>
                )}
              </div>

              <Suspense fallback={
                <button disabled className="w-full py-2.5 rounded font-display text-sm font-semibold bg-primary text-white opacity-60">
                  Book a trial session
                </button>
              }>
                <TrialRequestButton
                  listingId={listing.id}
                  listingTitle={listing.title}
                  schedules={schedules ?? []}
                  isFull={isFull}
                />
              </Suspense>
              <ContactProviderButton
                displayName={provider?.display_name ?? ''}
                contactEmail={provider?.contact_email ?? ''}
                contactPhone={provider?.contact_phone ?? null}
              />

              <div className="h-px bg-border my-4" />
              <div className="text-[11px] text-ink-muted text-center leading-relaxed">
                Provider responds within 24 hours.<br />No payment required to book a trial.
              </div>
            </div>

            {/* Save */}
            <SaveButton listingId={listing.id} initialSaved={isSaved} variant="full" />

            {/* Provider mini-card */}
            {provider && (
              <div className="bg-white border border-border rounded-lg p-4">
                <div className="font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted mb-3">Provider</div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-lt border border-primary-border flex items-center justify-center font-display text-xs font-bold text-primary flex-shrink-0">
                    {provider.display_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-display text-sm font-semibold text-ink">{provider.display_name}</div>
                    <div className="text-[11px] text-ink-muted">
                      Listed since {new Date(provider.listed_since).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                {provider.bio && (
                  <p className="text-xs text-ink-mid leading-relaxed mb-3">{provider.bio}</p>
                )}
                {provider.verified && (
                  <div className="flex items-center gap-1.5 text-[11px] text-success">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><circle cx="5.5" cy="5.5" r="5" fill="#D6F5E5"/><path d="M3 5.5l1.5 1.5 3-3" stroke="#1A7A4A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Verified provider
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </AppShell>
  )
}
