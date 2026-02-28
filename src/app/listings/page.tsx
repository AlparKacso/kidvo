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

  const listings = listingsRaw as unknown as any[] | null

  const active  = listings?.filter(l => l.status === 'active').length ?? 0
  const pending = listings?.filter(l => l.status === 'pending').length ?? 0
  const total   = listings?.length ?? 0

  return (
    <AppShell>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-ink mb-0.5">My Activities</h1>
            <p className="text-sm text-ink-muted">{total} {total === 1 ? 'listing' : 'listings'} · {active} active · {pending} pending</p>
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
            <span className="text-lg">🎉</span>
            <div>
              <div className="font-display text-sm font-semibold text-gold-text">Your listing is under review 🎉</div>
              <p className="text-xs text-gold-text/70">We'll review and activate it within 24 hours. You'll be notified by email once it's live. In the meantime you can still edit it.</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {total === 0 && (
          <div className="bg-white border border-border rounded-lg p-12 text-center">
            <div className="text-3xl mb-3">🏫</div>
            <div className="font-display text-sm font-semibold text-ink-mid mb-1">No activities yet</div>
            <p className="text-sm text-ink-muted mb-5">List your first activity to start receiving trial requests from parents.</p>
            <Link href="/listings/new" className="inline-block bg-primary text-white font-display text-sm font-semibold px-4 py-2 rounded hover:bg-primary-deep transition-colors">
              + List an activity
            </Link>
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
