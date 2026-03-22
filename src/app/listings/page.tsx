import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { ListingCardMenu } from './ListingCardMenu'
import { sendTrialConfirmedToParent, sendTrialDeclinedToParent } from '@/lib/email'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-success-lt text-success',
  pending:   'bg-gold-lt text-gold-text',
  paused:    'bg-zinc-lt text-zinc',
  draft:     'bg-surface text-ink-muted',
  confirmed: 'bg-success-lt text-success',
  declined:  'bg-danger-lt text-danger',
  cancelled: 'bg-surface text-ink-muted',
}

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default async function ProviderListingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; submitted?: string }>
}) {
  const params   = searchParams ? await searchParams : {}
  const tab      = params.tab === 'bookings' ? 'bookings' : 'activities'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: providerRaw } = await supabase
    .from('providers').select('id').eq('user_id', user.id).single()
  const provider = providerRaw as unknown as { id: string } | null
  if (!provider) redirect('/browse')

  // ── Shared: listings ─────────────────────────────────────────
  const { data: listingsRaw } = await supabase
    .from('listings')
    .select('*, category:categories(*), area:areas(*)')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false })
  const listings = (listingsRaw ?? []) as any[]
  const listingIds = listings.map(l => l.id)

  const activeCount  = listings.filter(l => l.status === 'active').length
  const pendingCount = listings.filter(l => l.status === 'pending').length
  const pausedCount  = listings.filter(l => l.status === 'paused').length
  const total        = listings.filter(l => l.status !== 'draft').length

  // ── Pending count — always fetched so badge shows on Activities tab too ──
  const { count: pendingReqsCount } = listingIds.length > 0
    ? await supabase
        .from('trial_requests')
        .select('*', { count: 'exact', head: true })
        .in('listing_id', listingIds)
        .eq('status', 'pending')
    : { count: 0 }
  const pendingReqs = pendingReqsCount ?? 0

  // ── Bookings tab: fetch full requests ─────────────────────────
  let requests: any[] = []
  let totalReqs = 0

  if (tab === 'bookings') {
    const { data: requestsRaw } = listingIds.length > 0
      ? await supabase
          .from('trial_requests')
          .select('*, listing:listings(id, title, category:categories(name, accent_color)), parent:users(full_name, email, phone)')
          .in('listing_id', listingIds)
          .order('status', { ascending: true })
          .order('created_at', { ascending: false })
      : { data: [] }

    // Sort: pending first, then by date desc
    requests  = [...(requestsRaw ?? [])].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    totalReqs = requests.length
  }

  // ── Server action: update booking status ──────────────────────
  async function updateStatus(formData: FormData) {
    'use server'
    const id     = formData.get('id') as string
    const status = formData.get('status') as string
    const supabase = await createClient()

    const { data: reqRaw } = await supabase
      .from('trial_requests')
      .select('listing_id, listing:listings(id, title, provider:providers(display_name, contact_email, contact_phone)), parent:users(full_name, email)')
      .eq('id', id).single()

    await supabase.from('trial_requests').update({ status, responded_at: new Date().toISOString() }).eq('id', id)
    revalidatePath('/listings')

    const req = reqRaw as any
    if (req?.parent?.email && req?.listing?.title) {
      if (status === 'confirmed' && req.listing.provider) {
        await sendTrialConfirmedToParent({
          parentEmail:   req.parent.email,
          parentName:    req.parent.full_name ?? 'there',
          listingTitle:  req.listing.title,
          listingId:     req.listing.id,
          providerName:  req.listing.provider.display_name,
          providerEmail: req.listing.provider.contact_email,
          providerPhone: req.listing.provider.contact_phone ?? null,
        }).catch(console.error)
      } else if (status === 'declined') {
        await sendTrialDeclinedToParent({
          parentEmail:  req.parent.email,
          parentName:   req.parent.full_name ?? 'there',
          listingTitle: req.listing.title,
        }).catch(console.error)
      }
    }
  }

  return (
    <AppShell>
      <div>
        {/* Page header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">My Activities</h1>
          <Link
            href="/listings/new"
            className="bg-primary text-white font-display text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-primary-deep transition-colors"
          >
            + New activity
          </Link>
        </div>

        {/* Stat pills — only show Paused/Draft when non-zero */}
        {(() => {
          const stats = [
            { label: 'Active',  value: activeCount,  color: 'text-success'   },
            { label: 'Pending', value: pendingCount, color: 'text-gold-text' },
            ...(pausedCount > 0 ? [{ label: 'Paused', value: pausedCount, color: 'text-ink-muted' }] : []),
            { label: 'Total',   value: total,        color: 'text-ink'       },
          ]
          return (
            <div className="flex flex-wrap gap-2 mb-5">
              {stats.map(s => (
                <div
                  key={s.label}
                  className="bg-white rounded-[16px] p-[14px] flex-1 min-w-[72px]"
                  style={{ boxShadow: '0 2px 16px rgba(90,70,140,.06)' }}
                >
                  <div className="font-display text-[10px] font-bold tracking-[.08em] uppercase text-ink-muted mb-1">{s.label}</div>
                  <div className={`font-display text-xl font-extrabold ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
          )
        })()}

        {/* Tab strip */}
        <div className="flex gap-1 bg-surface rounded-[14px] p-1 mb-5 w-full">
          <Link
            href="/listings"
            className={`flex-1 text-center font-display text-[13px] font-semibold px-5 py-2 rounded-[10px] transition-all ${
              tab === 'activities' ? 'bg-primary text-white shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Activity Listings
          </Link>
          <Link
            href="/listings?tab=bookings"
            className={`flex-1 text-center font-display text-[13px] font-semibold px-5 py-2 rounded-[10px] transition-all flex items-center justify-center gap-1.5 ${
              tab === 'bookings' ? 'bg-primary text-white shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Trial Requests
            {pendingReqs > 0 && (
              <span className="leading-none" title={`${pendingReqs} pending`}>⚠️</span>
            )}
          </Link>
        </div>

        {/* ── Activities tab ─────────────────────────────────── */}
        {tab === 'activities' && (
          <>
            {params.submitted && (
              <div className="bg-gold-lt border border-gold-border rounded-[16px] px-4 py-3 mb-5 flex items-center gap-3">
                <span className="text-lg">🎉</span>
                <div>
                  <div className="font-display text-sm font-semibold text-gold-text">Your listing is under review 🎉</div>
                  <p className="text-xs text-gold-text/70">We&apos;ll review and activate it within 24 hours. You&apos;ll be notified by email once it&apos;s live.</p>
                </div>
              </div>
            )}

            {total === 0 ? (
              <div className="bg-white rounded-[22px] p-[22px] text-center" style={{ boxShadow: '0 2px 16px rgba(90,70,140,.06)' }}>
                <div className="text-3xl mb-3">🏫</div>
                <div className="font-display text-sm font-semibold text-ink-mid mb-1">No activities yet</div>
                <p className="text-sm text-ink-muted mb-5">List your first activity to start receiving trial requests from parents.</p>
                <Link href="/listings/new" className="inline-block bg-primary text-white font-display text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-primary-deep transition-colors">
                  + List an activity
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {listings.map(listing => (
                  <div key={listing.id} className="bg-white rounded-[22px] p-[22px] flex items-start justify-between gap-4" style={{ boxShadow: '0 2px 16px rgba(90,70,140,.06)' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: (listing.category as any)?.accent_color }} />
                        <span className="font-display text-[11px] font-bold tracking-[.08em] uppercase text-ink-muted">{(listing.category as any)?.name}</span>
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full font-display text-[10.5px] font-semibold capitalize ${STATUS_STYLES[listing.status] ?? ''}`}>
                          {listing.status}
                        </span>
                      </div>
                      <div className="font-display text-sm font-semibold text-ink mb-0.5">{listing.title}</div>
                      <div className="text-[11px] text-ink-muted">
                        {(listing.area as any)?.name} · Ages {listing.age_min}–{listing.age_max} · {listing.price_monthly} RON/mo
                        {listing.spots_available !== null && listing.spots_total !== null && (
                          <> · {listing.spots_available}/{listing.spots_total} spots</>
                        )}
                      </div>
                    </div>
                    <ListingCardMenu listingId={listing.id} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Bookings tab ───────────────────────────────────── */}
        {tab === 'bookings' && (
          <>
            {totalReqs === 0 ? (
              <div className="bg-white rounded-[22px] p-[22px] text-center" style={{ boxShadow: '0 2px 16px rgba(90,70,140,.06)' }}>
                <div className="text-3xl mb-3">📬</div>
                <div className="font-display text-sm font-semibold text-ink-mid mb-1">No trial requests yet</div>
                <p className="text-sm text-ink-muted">When parents request a trial, they&apos;ll appear here.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {requests.map(req => {
                  const listing   = req.listing as any
                  const parent    = req.parent as any
                  const isPending = req.status === 'pending'
                  const hoursAgo  = Math.floor((Date.now() - new Date(req.created_at).getTime()) / 3_600_000)
                  const isUrgent  = isPending && hoursAgo >= 48

                  return (
                    <div key={req.id} className={`bg-white rounded-[22px] p-[22px] ${isUrgent ? 'ring-1 ring-danger/30' : ''}`} style={{ boxShadow: '0 2px 16px rgba(90,70,140,.06)' }}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full font-display text-[10.5px] font-semibold capitalize ${STATUS_STYLES[req.status] ?? ''}`}>
                              {req.status}
                            </span>
                            <span className={`font-display text-[11px] ${isUrgent ? 'text-danger font-semibold' : 'text-ink-muted'}`}>
                              {hoursAgo < 1 ? 'Just now' : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.floor(hoursAgo / 24)}d ago`}
                              {isUrgent && ' · overdue'}
                            </span>
                          </div>

                          <div className="font-display text-[15px] font-extrabold text-ink mb-0.5">{parent?.full_name ?? '—'}</div>
                          <div className="font-display text-[11.5px] text-ink-muted mb-3">{parent?.email}</div>

                          <div className="flex flex-wrap gap-3 text-sm">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: listing?.category?.accent_color }} />
                              <span className="font-display text-[12.5px] font-semibold text-ink-mid">{listing?.title}</span>
                            </div>
                            {req.preferred_day !== null && (
                              <span className="font-display text-[12px] text-ink-muted">· Preferred: {DAYS[req.preferred_day]}</span>
                            )}
                          </div>

                          {req.message && (
                            <div className="mt-3 px-3 py-2.5 bg-bg rounded-[10px] font-display text-[12.5px] text-ink-mid italic">
                              &ldquo;{req.message}&rdquo;
                            </div>
                          )}

                          {req.status === 'confirmed' && (
                            <div className="mt-3 p-3 bg-success-lt border border-success/20 rounded-[12px]">
                              <div className="font-display text-[10px] font-bold tracking-[.08em] uppercase text-success mb-2">Parent contact</div>
                              <div className="flex items-center gap-2 font-display text-[12.5px]">
                                <span className="text-ink-muted">✉</span>
                                <a href={`mailto:${parent?.email}`} className="text-primary hover:underline font-semibold">{parent?.email}</a>
                              </div>
                              {parent?.phone && (
                                <div className="flex items-center gap-2 font-display text-[12.5px] mt-1">
                                  <span className="text-ink-muted">✆</span>
                                  <a href={`tel:${parent.phone}`} className="text-primary hover:underline font-semibold">{parent.phone}</a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {isPending && (
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <form action={updateStatus}>
                              <input type="hidden" name="id" value={req.id} />
                              <input type="hidden" name="status" value="confirmed" />
                              <button type="submit" className="w-full px-4 py-2 rounded-full font-display text-xs font-semibold bg-success-lt text-success border border-success/20 hover:bg-success hover:text-white transition-colors">
                                ✓ Confirm
                              </button>
                            </form>
                            <form action={updateStatus}>
                              <input type="hidden" name="id" value={req.id} />
                              <input type="hidden" name="status" value="declined" />
                              <button type="submit" className="w-full px-4 py-2 rounded-full font-display text-xs font-semibold bg-danger-lt text-danger border border-danger/20 hover:bg-danger hover:text-white transition-colors">
                                ✕ Decline
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
