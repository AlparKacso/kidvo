import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { ListingCardMenu } from './ListingCardMenu'

const STATUS_STYLES: Record<string, string> = {
  active:  'bg-success-lt text-success',
  pending: 'bg-gold-lt text-gold-text',
  paused:  'bg-zinc-lt text-zinc',
  draft:   'bg-surface text-ink-muted',
}

// ── SVG icons (15×15 viewBox, stroke-based, matching nav visual style) ────────

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
    <path d="M7.5 3C4 3 1.5 7.5 1.5 7.5S4 12 7.5 12 13.5 7.5 13.5 7.5 11 3 7.5 3Z" stroke="currentColor" strokeWidth="1.3" fill="none"/>
    <circle cx="7.5" cy="7.5" r="1.8" stroke="currentColor" strokeWidth="1.3" fill="none"/>
  </svg>
)

const IconTrialReq = () => (
  <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
    <rect x="1.5" y="3" width="12" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
    <path d="M5 3V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.3" fill="none"/>
    <path d="M5 7.5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const IconListing = () => (
  <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
    <rect x="2" y="1.5" width="11" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
    <path d="M5 5h5M5 7.5h5M5 10h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

export default async function ProviderListingsPage({ searchParams }: { searchParams?: Promise<{ submitted?: string }> }) {
  const params   = searchParams ? await searchParams : {}
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get provider record
  const { data: providerRaw } = await supabase
    .from('providers')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const provider = providerRaw as unknown as { id: string } | null
  if (!provider) redirect('/browse')

  // Get listings with schedules
  const { data: listingsRaw } = await supabase
    .from('listings')
    .select(`*, category:categories(*), area:areas(*), schedules:listing_schedules(*)`)
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false })

  const listings   = listingsRaw as unknown as any[] | null
  const listingIds = (listings ?? []).map((l: any) => l.id as string)

  const activeCount  = listings?.filter(l => l.status === 'active').length ?? 0
  const pendingCount = listings?.filter(l => l.status === 'pending').length ?? 0
  const total        = listings?.length ?? 0

  // Insight data — views this week + all-time per listing + pending trials
  // Gracefully handles the case where listing_views table doesn't exist yet
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const [viewsAllRes, weekViewsRes, trialsRes] = await Promise.all([
    listingIds.length
      ? supabase.from('listing_views').select('listing_id').in('listing_id', listingIds)
      : Promise.resolve({ data: [] as any[] }),
    listingIds.length
      ? supabase.from('listing_views').select('listing_id').in('listing_id', listingIds).gte('viewed_at', sevenDaysAgo)
      : Promise.resolve({ data: [] as any[] }),
    listingIds.length
      ? supabase.from('trial_requests').select('listing_id, status').in('listing_id', listingIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  // Build per-listing maps
  const viewMap  = new Map<string, number>()
  const trialMap = new Map<string, number>()
  ;(viewsAllRes.data  ?? []).forEach((r: any) => viewMap.set(r.listing_id,  (viewMap.get(r.listing_id)  ?? 0) + 1))
  ;(trialsRes.data    ?? []).forEach((r: any) => trialMap.set(r.listing_id, (trialMap.get(r.listing_id) ?? 0) + 1))

  const weekViews    = (weekViewsRes.data ?? []).length
  const pendingTrials = (trialsRes.data ?? []).filter((r: any) => r.status === 'pending').length

  return (
    <AppShell>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-ink mb-0.5">My Activities</h1>
            <p className="text-sm text-ink-muted">{total} {total === 1 ? 'listing' : 'listings'} · {activeCount} active · {pendingCount} pending</p>
          </div>
          <Link
            href="/listings/new"
            className="bg-primary text-white font-display text-sm font-semibold px-4 py-2 rounded hover:bg-primary-deep transition-colors"
          >
            + New activity
          </Link>
        </div>

        {/* Submitted banner */}
        {params.submitted && (
          <div className="bg-gold-lt border border-gold-border rounded-lg px-4 py-3 mb-5 flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 15 15" fill="none" className="text-gold-text flex-shrink-0">
              <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3" fill="none"/>
              <path d="M5 7.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <div className="font-display text-sm font-semibold text-gold-text">Your listing is under review</div>
              <p className="text-xs text-gold-text/70">We&apos;ll review and activate it within 24 hours. You&apos;ll be notified by email once it&apos;s live. In the meantime you can still edit it.</p>
            </div>
          </div>
        )}

        {/* Growth insight banner — only when there are listings */}
        {total > 0 && (
          <div className="bg-primary/[0.06] border border-primary/20 rounded-lg px-5 py-4 mb-6">
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <div className="flex items-center gap-2.5">
                <span className="text-primary"><IconEye /></span>
                <div>
                  <div className="font-display text-[15px] font-bold text-ink leading-none mb-0.5">{weekViews}</div>
                  <div className="font-display text-[10px] font-semibold uppercase tracking-label text-ink-muted">Views this week</div>
                </div>
              </div>
              <div className="w-px bg-border self-stretch hidden sm:block" />
              <div className="flex items-center gap-2.5">
                <span className="text-gold-text"><IconTrialReq /></span>
                <div>
                  <div className="font-display text-[15px] font-bold text-ink leading-none mb-0.5">{pendingTrials}</div>
                  <div className="font-display text-[10px] font-semibold uppercase tracking-label text-ink-muted">Pending trials</div>
                </div>
              </div>
              <div className="w-px bg-border self-stretch hidden sm:block" />
              <div className="flex items-center gap-2.5">
                <span className="text-success"><IconListing /></span>
                <div>
                  <div className="font-display text-[15px] font-bold text-ink leading-none mb-0.5">{activeCount}</div>
                  <div className="font-display text-[10px] font-semibold uppercase tracking-label text-ink-muted">Active listings</div>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-end">
                <Link href="/listings/analytics" className="font-display text-xs font-semibold text-primary hover:underline whitespace-nowrap">
                  Full analytics →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {total === 0 && (
          <div className="bg-white border border-border rounded-lg p-10">
            <div className="max-w-[340px] mx-auto text-center mb-8">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 text-primary">
                <IconListing />
              </div>
              <div className="font-display text-base font-bold text-ink mb-1">List your first activity</div>
              <p className="text-sm text-ink-muted mb-5">Reach parents in Timișoara actively searching for activities like yours.</p>
              <Link href="/listings/new" className="inline-block bg-primary text-white font-display text-sm font-semibold px-5 py-2.5 rounded hover:bg-primary-deep transition-colors">
                + List an activity
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border pt-6">
              {[
                {
                  icon: <IconEye />,
                  title: 'Get discovered',
                  text: 'Parents search by category, area and age group — your listing appears in front of the right families.',
                },
                {
                  icon: <IconTrialReq />,
                  title: 'Receive trial requests',
                  text: 'Interested families book a free trial directly through kidvo — no phone tag, no friction.',
                },
                {
                  icon: <IconListing />,
                  title: 'Grow with insights',
                  text: 'Track views and trial requests per listing to see what resonates and where to focus.',
                },
              ].map(b => (
                <div key={b.title} className="flex flex-col items-center text-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-ink-mid">{b.icon}</div>
                  <div className="font-display text-xs font-bold text-ink">{b.title}</div>
                  <p className="text-[11px] text-ink-muted leading-relaxed">{b.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mobile card list */}
        {total > 0 && (
          <div className="md:hidden flex flex-col gap-3">
            {listings?.map(listing => (
              <div key={listing.id} className="bg-white border border-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: (listing.category as any)?.accent_color }} />
                      <span className="text-xs text-ink-muted">{(listing.category as any)?.name} · {(listing.area as any)?.name}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded font-display text-[10px] font-semibold capitalize ${STATUS_STYLES[listing.status] ?? ''}`}>
                        {listing.status}
                      </span>
                    </div>
                    <div className="font-display text-sm font-semibold text-ink">{listing.title}</div>
                    <div className="text-[11px] text-ink-muted mt-0.5">
                      Ages {listing.age_min}–{listing.age_max} · {listing.price_monthly} RON/mo
                      {listing.spots_available !== null && listing.spots_total !== null && (
                        <> · {listing.spots_available}/{listing.spots_total} spots</>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-[11px] text-ink-muted">
                        <span className="text-ink-mid/70"><IconEye /></span>
                        {viewMap.get(listing.id) ?? 0} views
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-ink-muted">
                        <span className="text-ink-mid/70"><IconTrialReq /></span>
                        {trialMap.get(listing.id) ?? 0} trials
                      </span>
                    </div>
                  </div>
                  <ListingCardMenu listingId={listing.id} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Desktop table */}
        {total > 0 && (
          <div className="hidden md:block bg-white border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted">Activity</th>
                  <th className="text-left px-4 py-3 font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted">Category</th>
                  <th className="text-left px-4 py-3 font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted">Area</th>
                  <th className="text-left px-4 py-3 font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted">Price</th>
                  <th className="text-left px-4 py-3 font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted">Spots</th>
                  <th className="text-right px-4 py-3 font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted">Views</th>
                  <th className="text-right px-4 py-3 font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted">Trials</th>
                  <th className="text-left px-4 py-3 font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {listings?.map((listing, i) => (
                  <tr key={listing.id} className={`border-b border-border last:border-0 hover:bg-bg transition-colors ${i % 2 === 0 ? '' : 'bg-bg/40'}`}>
                    <td className="px-5 py-3.5">
                      <div className="font-display text-sm font-semibold text-ink">{listing.title}</div>
                      <div className="text-[11px] text-ink-muted mt-0.5">Ages {listing.age_min}–{listing.age_max} · {listing.language}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: (listing.category as any)?.accent_color }} />
                        <span className="text-sm text-ink-mid">{(listing.category as any)?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-ink-mid">{(listing.area as any)?.name}</td>
                    <td className="px-4 py-3.5 font-display text-sm font-semibold text-ink">{listing.price_monthly} RON</td>
                    <td className="px-4 py-3.5 text-sm text-ink-mid">
                      {listing.spots_available !== null && listing.spots_total !== null
                        ? `${listing.spots_available} / ${listing.spots_total}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-display text-sm font-bold text-ink tabular-nums">
                      {viewMap.get(listing.id) ?? 0}
                    </td>
                    <td className="px-4 py-3.5 text-right font-display text-sm font-bold text-ink tabular-nums">
                      {trialMap.get(listing.id) ?? 0}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded font-display text-[10px] font-semibold capitalize ${STATUS_STYLES[listing.status] ?? ''}`}>
                        {listing.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <Link href={`/browse/${listing.id}`} className="text-[11px] font-display font-semibold text-ink-muted hover:text-primary transition-colors">
                          Preview
                        </Link>
                        <Link href={`/listings/${listing.id}/edit`} className="text-[11px] font-display font-semibold text-ink-muted hover:text-primary transition-colors">
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}
