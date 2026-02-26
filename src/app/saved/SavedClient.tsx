'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatSchedule(schedules: any[]): string {
  if (!schedules?.length) return '—'
  const days = [...new Set(schedules.map((s: any) => DAY_LABELS[s.day_of_week]))]
  const first = schedules[0]
  return `${days.join(' & ')} · ${first.time_start.slice(0, 5)}–${first.time_end.slice(0, 5)}`
}

interface Props {
  initialSaves: any[]
}

export function SavedClient({ initialSaves }: Props) {
  const [saves, setSaves] = useState(initialSaves)

  async function handleRemove(saveId: string, listingId: string) {
    setSaves(prev => prev.filter(s => s.id !== saveId))
    await fetch('/api/saves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId }),
    })
  }

  const total = saves.length

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold tracking-tight text-ink mb-0.5">Saved Activities</h1>
        <p className="text-sm text-ink-muted">{total} {total === 1 ? 'activity' : 'activities'} saved</p>
      </div>

      {total === 0 && (
        <div className="bg-white border border-border rounded-lg p-12 text-center">
          <div className="text-3xl mb-3">🤍</div>
          <div className="font-display text-sm font-semibold text-ink-mid mb-1">Nothing saved yet</div>
          <p className="text-sm text-ink-muted mb-5">Tap the heart on any activity to save it here.</p>
          <Link href="/browse" className="inline-block bg-primary text-white font-display text-sm font-semibold px-4 py-2 rounded hover:bg-primary-deep transition-colors">
            Browse activities
          </Link>
        </div>
      )}

      {total > 0 && (
        <div className="flex flex-col gap-3">
          {saves.map(save => {
            const listing  = save.listing as any
            const category = listing?.category
            const area     = listing?.area
            const accent   = category?.accent_color ?? '#ccc'
            const isFull   = (listing?.spots_available ?? 1) === 0

            return (
              <div key={save.id} className="bg-white border border-border rounded-lg overflow-hidden">

                {/* Mobile layout */}
                <div className="md:hidden p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-1" style={{ background: accent }} />
                      <div className="flex-1 min-w-0">
                        <Link href={`/browse/${listing?.id}`} className="font-display text-sm font-bold text-ink hover:text-primary transition-colors block">
                          {listing?.title}
                        </Link>
                        {listing?.provider?.display_name && (
                          <div className="text-xs text-ink-muted mt-0.5">{listing.provider.display_name}</div>
                        )}
                        <div className="text-xs text-ink-muted mt-0.5">
                          {[category?.name, `Ages ${listing?.age_min}–${listing?.age_max}`, area?.name].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(save.id, listing?.id)}
                      className="w-6 h-6 rounded flex items-center justify-center border border-border text-ink-muted hover:border-danger/50 hover:text-danger hover:bg-danger-lt transition-all flex-shrink-0"
                    >
                      <svg width="9" height="9" viewBox="0 0 15 15" fill="none"><path d="M3 3l9 9M12 3l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <span className="font-display text-sm font-bold text-ink">{listing?.price_monthly} RON</span>
                      <span className="text-xs text-ink-muted">/mo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('inline-flex px-2 py-0.5 rounded font-display text-[10px] font-semibold', isFull ? 'bg-danger-lt text-danger' : 'bg-success-lt text-success')}>
                        {isFull ? 'Full' : 'Available'}
                      </span>
                      {!isFull && (
                        <Link href={`/browse/${listing?.id}?book=1`} className="px-2.5 py-1.5 rounded font-display text-xs font-semibold bg-primary text-white hover:bg-primary-deep transition-colors">
                          Book trial
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden md:flex items-center gap-4 px-5 py-3.5">
                  <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: accent }} />
                  <div className="flex-1 min-w-0">
                    <Link href={`/browse/${listing?.id}`} className="font-display text-sm font-bold text-ink hover:text-primary transition-colors">
                      {listing?.title}
                    </Link>
                    {listing?.provider?.display_name && (
                      <div className="text-xs text-ink-muted mt-0.5">{listing.provider.display_name}</div>
                    )}
                    <div className="text-xs text-ink-muted mt-0.5">
                      {[category?.name, `Ages ${listing?.age_min}–${listing?.age_max}`, area?.name, formatSchedule(listing?.schedules ?? [])].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right mr-1">
                      <span className="font-display text-sm font-bold text-ink">{listing?.price_monthly} RON</span>
                      <span className="text-xs text-ink-muted">/mo</span>
                    </div>
                    <span className={cn('inline-flex px-2 py-0.5 rounded font-display text-[10px] font-semibold', isFull ? 'bg-danger-lt text-danger' : 'bg-success-lt text-success')}>
                      {isFull ? 'Full' : 'Available'}
                    </span>
                    {!isFull && (
                      <Link href={`/browse/${listing?.id}?book=1`} className="px-2.5 py-1.5 rounded font-display text-xs font-semibold bg-primary text-white hover:bg-primary-deep transition-colors">
                        Book trial
                      </Link>
                    )}
                    <button
                      onClick={() => handleRemove(save.id, listing?.id)}
                      className="w-6 h-6 rounded flex items-center justify-center border border-border text-ink-muted hover:border-danger/50 hover:text-danger hover:bg-danger-lt transition-all"
                    >
                      <svg width="9" height="9" viewBox="0 0 15 15" fill="none"><path d="M3 3l9 9M12 3l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
