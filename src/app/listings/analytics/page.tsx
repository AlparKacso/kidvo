import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// ── Inline helpers ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active:  'bg-success-lt text-success',
  pending: 'bg-gold-lt text-gold-text',
  paused:  'bg-zinc-lt text-zinc',
  draft:   'bg-surface text-ink-muted',
}

function StatCard({ label, value, sub, accent }: { label: string; value: number; sub?: string; accent?: boolean }) {
  return (
    <div className={cn('border rounded-lg p-4', accent ? 'bg-primary-lt border-primary/20' : 'bg-white border-border')}>
      <div className="font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted mb-1">{label}</div>
      <div className={cn('font-display text-2xl font-bold', accent ? 'text-primary' : 'text-ink')}>{value}</div>
      {sub && <div className="text-[11px] text-ink-muted mt-0.5">{sub}</div>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: providerData } = await supabase
    .from('providers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!providerData) redirect('/listings')

  // Provider's listings
  const { data: listingsRaw } = await supabase
    .from('listings')
    .select('id, title, status')
    .eq('provider_id', (providerData as any).id)
    .order('created_at', { ascending: false })

  const listings   = (listingsRaw ?? []) as { id: string; title: string; status: string }[]
  const listingIds = listings.map(l => l.id)

  // Views + reveals + trial requests (in parallel)
  const [viewsRes, revealsRes, trialsRes] = await Promise.all([
    listingIds.length
      ? supabase.from('listing_views').select('listing_id').in('listing_id', listingIds)
      : Promise.resolve({ data: [] as { listing_id: string }[] }),
    listingIds.length
      ? supabase.from('contact_reveals').select('listing_id').in('listing_id', listingIds)
      : Promise.resolve({ data: [] as { listing_id: string }[] }),
    listingIds.length
      ? supabase.from('trial_requests').select('listing_id').in('listing_id', listingIds)
      : Promise.resolve({ data: [] as { listing_id: string }[] }),
  ])

  // Build maps: listing_id → count
  const viewMap   = new Map<string, number>()
  const revealMap = new Map<string, number>()
  const trialMap  = new Map<string, number>()
  ;(viewsRes.data   ?? []).forEach((r: any) => viewMap.set(  r.listing_id, (viewMap.get(r.listing_id)   ?? 0) + 1))
  ;(revealsRes.data ?? []).forEach((r: any) => revealMap.set(r.listing_id, (revealMap.get(r.listing_id) ?? 0) + 1))
  ;(trialsRes.data  ?? []).forEach((r: any) => trialMap.set( r.listing_id, (trialMap.get(r.listing_id)  ?? 0) + 1))

  const activeCount   = listings.filter(l => l.status === 'active').length
  const pendingCount  = listings.filter(l => l.status === 'pending').length
  const pausedCount   = listings.filter(l => l.status === 'paused').length
  const totalViews    = [...viewMap.values()].reduce((s, n)   => s + n, 0)
  const totalReveals  = [...revealMap.values()].reduce((s, n) => s + n, 0)
  const totalTrials   = [...trialMap.values()].reduce((s, n)  => s + n, 0)

  return (
    <AppShell>
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight text-ink mb-0.5">Analytics</h1>
        <p className="text-sm text-ink-muted mb-6">Performance insights for your listings.</p>

        {/* Summary stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
          <StatCard label="Active listings" value={activeCount}  />
          <StatCard label="Pending"         value={pendingCount} />
          <StatCard label="Paused"          value={pausedCount}  />
        </div>

        {/* Funnel row: Views → Contact Reveals → Trial Requests */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Total views"       value={totalViews}   sub="Card → detail page clicks" />
          <StatCard label="Contact reveals"   value={totalReveals} sub="Parents who unlocked details" accent />
          <StatCard label="Trial requests"    value={totalTrials}  sub="Conversion goal" />
        </div>

        {/* Per-listing performance table */}
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          {listings.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-3xl mb-3">📊</div>
              <div className="font-display text-sm font-semibold text-ink-mid mb-1">No listings yet</div>
              <p className="text-sm text-ink-muted">Create your first listing to start seeing analytics here.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-left font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted px-4 py-2.5">Listing</th>
                  <th className="text-left font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted px-4 py-2.5">Status</th>
                  <th className="text-right font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted px-4 py-2.5">Views</th>
                  <th className="text-right font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted px-4 py-2.5 text-primary">Reveals</th>
                  <th className="text-right font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted px-4 py-2.5">Trials</th>
                </tr>
              </thead>
              <tbody>
                {listings.map(l => (
                  <tr key={l.id} className="border-b border-border last:border-0 hover:bg-surface transition-colors">
                    <td className="px-4 py-3 font-display font-semibold text-ink">{l.title}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex px-2 py-0.5 rounded font-display text-[10px] font-semibold capitalize',
                        STATUS_STYLES[l.status] ?? 'bg-surface text-ink-muted',
                      )}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-display font-bold text-ink tabular-nums">
                      {viewMap.get(l.id) ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right font-display font-bold tabular-nums text-primary">
                      {revealMap.get(l.id) ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right font-display font-bold text-ink tabular-nums">
                      {trialMap.get(l.id) ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  )
}
