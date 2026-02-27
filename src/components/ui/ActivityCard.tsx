import Link from 'next/link'
import { cn } from '@/lib/utils'
import { SaveButton } from '@/components/ui/SaveButton'
import { StarRating } from '@/components/ui/StarRating'
import type { ListingWithRelations } from '@/types/database'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatSchedule(schedules: ListingWithRelations['schedules']): string {
  if (!schedules?.length) return '—'
  const days = [...new Set(schedules.map(s => DAY_LABELS[s.day_of_week]))]
  const first = schedules[0]
  return `${days.join(' & ')} · ${first.time_start.slice(0, 5)}–${first.time_end.slice(0, 5)}`
}

interface ActivityCardProps {
  listing:     ListingWithRelations
  featured?:   boolean
  savedIds?:   string[]
  avgRating?:  number | null
  reviewCount?: number
}

export function ActivityCard({ listing, featured, savedIds, avgRating, reviewCount }: ActivityCardProps) {
  const isFull  = (listing.spots_available ?? 1) === 0
  const accent  = listing.category.accent_color
  const isSaved = savedIds?.includes(listing.id) ?? false

  return (
    <div className={cn(
      'bg-white border border-border rounded-lg overflow-hidden relative flex flex-col',
      featured && 'border-primary-border',
      isFull ? 'opacity-65' : 'card-hover cursor-pointer',
    )}>
      {/* Category accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ background: accent }} />

      <div className="pl-5 pr-4 pt-[15px] pb-4 flex-1 flex flex-col">

        {/* Meta row */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: accent }} />
              <span className="text-xs text-ink-muted">
                {listing.category.name} · Ages {listing.age_min}–{listing.age_max} · {listing.area.name}
              </span>
            </div>
            <div className="font-display text-sm font-semibold text-ink leading-snug">
              {listing.title}
            </div>
          </div>

          {/* Save button */}
          {!isFull && (
            <SaveButton listingId={listing.id} initialSaved={isSaved} variant="icon" />
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border my-2.5" />

        {/* Schedule + price */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-xs text-ink-mid">
            <svg width="11" height="11" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M7.5 4.5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            {formatSchedule(listing.schedules)}
          </div>
          <div className="font-display text-sm font-semibold text-ink">
            {listing.price_monthly} RON
            <span className="font-body font-normal text-[11px] text-ink-muted">/mo</span>
          </div>
        </div>

        {/* Rating */}
        {avgRating != null && avgRating > 0 && (
          <div className="mb-2">
            <StarRating rating={avgRating} count={reviewCount} size="sm" />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-auto">
          {isFull ? (
            <button disabled className="px-3 py-1.5 rounded font-display text-sm font-semibold bg-surface text-ink-muted border border-border opacity-50 cursor-not-allowed">
              Fully booked
            </button>
          ) : (
            <Link href={`/browse/${listing.id}?book=1`} className="px-3 py-1.5 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep transition-colors">
              Book trial
            </Link>
          )}
          <Link href={`/browse/${listing.id}`} className="px-3 py-1.5 rounded font-display text-sm font-semibold bg-surface text-ink-mid border border-border hover:bg-border transition-colors">
            Details
          </Link>
          <div className="ml-auto">
            {isFull && (
              <span className="inline-flex px-1.5 py-0.5 rounded font-display text-[10px] font-semibold bg-danger-lt text-danger">Full</span>
            )}
            {!isFull && listing.featured && (
              <span className="inline-flex px-1.5 py-0.5 rounded font-display text-[10px] font-semibold bg-gold-lt text-gold-text">Featured</span>
            )}
            {!isFull && !listing.featured && listing.spots_available !== null && listing.spots_available > 0 && (
              <span className="inline-flex px-1.5 py-0.5 rounded font-display text-[10px] font-semibold bg-success-lt text-success">Available</span>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
