import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-gold-lt text-gold-text',
  confirmed: 'bg-success-lt text-success',
  declined:  'bg-danger-lt text-danger',
  cancelled: 'bg-surface text-ink-muted',
}

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default async function ProviderBookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: providerRaw } = await supabase
    .from('providers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const provider = providerRaw as unknown as { id: string } | null

  if (!provider) redirect('/browse')

  // Get all listing IDs for this provider first
  const { data: providerListingsRaw } = await supabase
    .from('listings')
    .select('id')
    .eq('provider_id', provider.id)

  const providerListings = providerListingsRaw as unknown as { id: string }[] | null
  const listingIds = providerListings?.map(l => l.id) ?? []

  const { data: requestsRaw } = listingIds.length > 0
    ? await supabase
        .from('trial_requests')
        .select(`*, listing:listings(id, title, category:categories(name, accent_color)), parent:users(full_name, email)`)
        .in('listing_id', listingIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const requests = requestsRaw as unknown as any[] | null

  const total   = requests?.length ?? 0
  const pending = requests?.filter(r => r.status === 'pending').length ?? 0

  async function updateStatus(formData: FormData) {
    'use server'
    const id     = formData.get('id') as string
    const status = formData.get('status') as string
    const supabase = await createClient()
    await supabase.from('trial_requests').update({ status }).eq('id', id)
    revalidatePath('/listings/bookings')
  }

  return (
    <AppShell>
      <div>
        <div className="mb-6">
          <h1 className="font-display text-xl font-bold tracking-tight text-ink mb-0.5">Trials</h1>
          <p className="text-sm text-ink-muted">{total} total · {pending} pending response</p>
        </div>

        {total === 0 && (
          <div className="bg-white border border-border rounded-lg p-12 text-center">
            <div className="text-3xl mb-3">📬</div>
            <div className="font-display text-sm font-semibold text-ink-mid mb-1">No trial requests yet</div>
            <p className="text-sm text-ink-muted">When parents request a trial, they'll appear here.</p>
          </div>
        )}

        {total > 0 && (
          <div className="flex flex-col gap-3">
            {requests?.map(req => {
              const listing = req.listing as any
              const parent  = req.parent as any
              const isPending = req.status === 'pending'

              return (
                <div key={req.id} className="bg-white border border-border rounded-lg p-5">
                  <div className="flex items-start justify-between gap-4">

                    {/* Left — info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-flex px-2 py-0.5 rounded font-display text-[10px] font-semibold capitalize ${STATUS_STYLES[req.status] ?? ''}`}>
                          {req.status}
                        </span>
                        <span className="text-[11px] text-ink-muted">
                          {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      <div className="font-display text-sm font-bold text-ink mb-0.5">{parent?.full_name ?? '—'}</div>
                      <div className="text-[11px] text-ink-muted mb-3">{parent?.email}</div>

                      <div className="flex flex-wrap gap-3 text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: listing?.category?.accent_color }} />
                          <span className="text-ink-mid">{listing?.title}</span>
                        </div>
                        {req.preferred_day !== null && (
                          <span className="text-ink-muted">· {DAYS[req.preferred_day]}</span>
                        )}
                      </div>

                      {req.message && (
                        <div className="mt-3 px-3 py-2.5 bg-bg rounded text-sm text-ink-mid italic">
                          "{req.message}"
                        </div>
                      )}
                    </div>

                    {/* Right — actions */}
                    {isPending && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <form action={updateStatus}>
                          <input type="hidden" name="id" value={req.id} />
                          <input type="hidden" name="status" value="confirmed" />
                          <button type="submit" className="w-full px-4 py-2 rounded font-display text-xs font-semibold bg-success-lt text-success border border-success/20 hover:bg-success hover:text-white transition-colors">
                            ✓ Confirm
                          </button>
                        </form>
                        <form action={updateStatus}>
                          <input type="hidden" name="id" value={req.id} />
                          <input type="hidden" name="status" value="declined" />
                          <button type="submit" className="w-full px-4 py-2 rounded font-display text-xs font-semibold bg-danger-lt text-danger border border-danger/20 hover:bg-danger hover:text-white transition-colors">
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
      </div>
    </AppShell>
  )
}
