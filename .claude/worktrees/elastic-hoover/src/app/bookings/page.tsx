import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'

const STATUS_STYLES: Record<string, { pill: string; label: string; icon: string }> = {
  pending:   { pill: 'bg-gold-lt text-gold-text',    label: 'Awaiting response', icon: '⏳' },
  confirmed: { pill: 'bg-success-lt text-success',   label: 'Confirmed',         icon: '✅' },
  declined:  { pill: 'bg-danger-lt text-danger',     label: 'Declined',          icon: '❌' },
  cancelled: { pill: 'bg-surface text-ink-muted',    label: 'Cancelled',         icon: '—'  },
}

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

export default async function ParentBookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: requestsRaw } = await supabase
    .from('trial_requests')
    .select(`
      *,
      listing:listings(
        id, title, price_monthly, trial_available,
        category:categories(name, accent_color),
        area:areas(name),
        provider:providers(display_name, contact_email, contact_phone)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const requests = requestsRaw as unknown as any[] | null

  const total     = requests?.length ?? 0
  const pending   = requests?.filter(r => r.status === 'pending').length ?? 0
  const confirmed = requests?.filter(r => r.status === 'confirmed').length ?? 0

  return (
    <AppShell>
      <div>
        <div className="mb-6">
          <h1 className="font-display text-xl font-bold tracking-tight text-ink mb-0.5">My Bookings</h1>
          <p className="text-sm text-ink-muted">{total} total · {confirmed} confirmed · {pending} pending</p>
        </div>

        {total === 0 && (
          <div className="bg-white border border-border rounded-lg p-12 text-center">
            <div className="text-3xl mb-3">📅</div>
            <div className="font-display text-sm font-semibold text-ink-mid mb-1">No trial requests yet</div>
            <p className="text-sm text-ink-muted mb-5">Browse activities and book a free trial session.</p>
            <Link href="/browse" className="inline-block bg-primary text-white font-display text-sm font-semibold px-4 py-2 rounded hover:bg-primary-deep transition-colors">
              Browse activities
            </Link>
          </div>
        )}

        {total > 0 && (
          <div className="flex flex-col gap-3">
            {requests?.map(req => {
              const listing  = req.listing as any
              const category = listing?.category
              const area     = listing?.area
              const provider = listing?.provider
              const status   = STATUS_STYLES[req.status] ?? STATUS_STYLES.pending

              return (
                <div key={req.id} className={`bg-white border rounded-lg p-5 ${req.status === 'confirmed' ? 'border-success/30' : 'border-border'}`}>
                  <div className="flex items-start gap-4">

                    {/* Accent bar */}
                    <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: category?.accent_color ?? '#ccc' }} />

                    <div className="flex-1 min-w-0">
                      {/* Status + date */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-display text-[10px] font-semibold ${status.pill}`}>
                          {status.icon} {status.label}
                        </span>
                        <span className="text-[11px] text-ink-muted">
                          Requested {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>

                      {/* Title */}
                      <Link href={`/browse/${listing?.id}`} className="font-display text-base font-bold text-ink hover:text-primary transition-colors">
                        {listing?.title}
                      </Link>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-ink-muted">
                        {category && <span>{category.name}</span>}
                        {area && <span>· {area.name}</span>}
                        {listing?.price_monthly && <span>· {listing.price_monthly} RON/mo</span>}
                        {req.preferred_day !== null && <span>· Preferred: {DAYS[req.preferred_day]}</span>}
                      </div>

                      {/* Message sent */}
                      {req.message && (
                        <div className="mt-3 px-3 py-2 bg-bg rounded text-sm text-ink-mid italic">
                          Your message: "{req.message}"
                        </div>
                      )}

                      {/* Provider contact — show when confirmed */}
                      {req.status === 'confirmed' && provider && (
                        <div className="mt-3 p-3 bg-success-lt border border-success/20 rounded-lg">
                          <div className="font-display text-[10px] font-semibold tracking-label uppercase text-success mb-2">
                            {provider.display_name}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-ink-muted">✉</span>
                            <a href={`mailto:${provider.contact_email}`} className="text-primary hover:underline font-medium">
                              {provider.contact_email}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 text-sm mt-1">
                            <span className="text-ink-muted">✆</span>
                            {provider.contact_phone
                              ? <a href={`tel:${provider.contact_phone}`} className="text-primary hover:underline font-medium">{provider.contact_phone}</a>
                              : <span className="text-ink-muted italic">No phone provided</span>
                            }
                          </div>
                        </div>
                      )}

                      {/* Declined message */}
                      {req.status === 'declined' && (
                        <div className="mt-3 px-3 py-2 bg-danger-lt rounded text-xs text-danger">
                          The provider couldn't accommodate this request. Try another activity or a different time.
                        </div>
                      )}
                    </div>
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
