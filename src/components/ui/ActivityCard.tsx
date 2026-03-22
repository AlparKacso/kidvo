import Link from 'next/link'
import { cn } from '@/lib/utils'
import { SaveButton } from '@/components/ui/SaveButton'
import { CategoryIconChip } from '@/components/ui/CategoryIcon'
import type { ListingWithRelations } from '@/types/database'

const CATEGORY_EMOJI: Record<string, string> = {
  sport:       '⚽',
  dance:       '💃',
  music:       '🎵',
  coding:      '💻',
  arts:        '🎨',
  language:    '🌍',
  languages:   '🌍',
  chess:       '♟️',
  gym:         '🤸',
  gymnastics:  '🤸',
  babysitting: '🍼',
  other:       '✨',
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatDays(schedules: ListingWithRelations['schedules']): string {
  if (!schedules?.length) return ''
  const days = [...new Set(schedules.map(s => DAY_LABELS[s.day_of_week]))]
  return days.join(' · ')
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(124,58,237,${alpha})`
  return `rgba(${r},${g},${b},${alpha})`
}

interface ActivityCardProps {
  listing:      ListingWithRelations
  featured?:    boolean
  savedIds?:    string[]
  avgRating?:   number | null
  reviewCount?: number
}

export function ActivityCard({ listing, featured, savedIds, avgRating, reviewCount }: ActivityCardProps) {
  const isFull   = (listing.spots_available ?? 1) === 0
  const accent   = listing.category.accent_color
  const isSaved  = savedIds?.includes(listing.id) ?? false
  const days     = formatDays(listing.schedules)
  const spots    = listing.spots_available
  const isUrgent = spots !== null && spots > 0 && spots <= 3
  const provider = (listing.provider as any)?.display_name ?? ''

  return (
    <div className={cn(
      'bg-white rounded-[22px] border-[1.5px] border-border shadow-card relative',
      isFull ? 'opacity-65' : 'card-hover',
    )}>
      {/* Stretched link */}
      {!isFull && (
        <Link href={`/browse/${listing.id}`} className="absolute inset-0 z-0" aria-label={listing.title} />
      )}

      {/* ── Header: cover photo or gradient + emoji ── */}
      <div
        className="h-[120px] flex items-center justify-center relative overflow-hidden rounded-t-[20px]"
        style={!(listing as any).cover_image_url ? { background: `linear-gradient(135deg, ${hexToRgba(accent, 0.15)}, ${hexToRgba(accent, 0.40)})` } : {}}
      >
        {(listing as any).cover_image_url
          ? <img src={(listing as any).cover_image_url} alt={listing.title} className="absolute inset-0 w-full h-full object-cover" />
          : <span style={{ fontSize: '52px', lineHeight: 1 }}>{CATEGORY_EMOJI[listing.category.slug] ?? '✨'}</span>
        }

        {/* Featured badge — top-left overlay */}
        {featured && (
          <div
            className="absolute top-3 left-3 rounded-full font-display text-[11px] font-semibold"
            style={{ background: '#fef9e6', color: '#b45309', padding: '3px 9px' }}
          >
            Featured
          </div>
        )}
      </div>

      {/* Save button — anchored to card root (not image) so dropdown is never clipped */}
      {!isFull && (
        <div className="absolute top-3 right-3 z-10 w-[30px] h-[30px] flex items-center justify-center rounded-[8px] border border-border bg-white/90">
          <SaveButton listingId={listing.id} initialSaved={isSaved} variant="icon" />
        </div>
      )}

      {/* ── Body ── */}
      <div className="p-4">
        {/* Category chip */}
        <div className="mb-2.5">
          <CategoryIconChip
            slug={listing.category.slug}
            name={listing.category.name}
            accentColor={accent}
          />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          <span
            className="inline-flex items-center rounded-full font-display text-[11px] font-semibold"
            style={{ background: hexToRgba(accent, 0.12), color: accent, padding: '3px 9px' }}
          >
            Ages {listing.age_min}–{listing.age_max}
          </span>

          {days && (
            <span
              className="inline-flex items-center rounded-full font-display text-[11px] font-semibold"
              style={{ background: '#f1f0f5', color: '#55527a', padding: '3px 9px' }}
            >
              {days}
            </span>
          )}

          {!isFull && spots !== null && (
            isUrgent ? (
              <span
                className="inline-flex items-center rounded-full font-display text-[11px] font-semibold"
                style={{ background: '#fef9e6', color: '#b45309', padding: '3px 9px' }}
              >
                {spots} {spots === 1 ? 'spot' : 'spots'} left
              </span>
            ) : (
              <span
                className="inline-flex items-center rounded-full font-display text-[11px] font-semibold"
                style={{ background: '#e8fde9', color: '#15803d', padding: '3px 9px' }}
              >
                Open spots
              </span>
            )
          )}
        </div>

        {/* Title */}
        <div
          className="font-display font-extrabold text-ink mb-1 leading-snug"
          style={{ fontSize: '16px', letterSpacing: '-0.3px' }}
        >
          {listing.title}
        </div>

        {/* Meta: provider + rating */}
        <div className="text-[13px] text-ink-muted">
          {[
            provider,
            avgRating && avgRating > 0
              ? `★ ${avgRating.toFixed(1)}${reviewCount ? ` (${reviewCount})` : ''}`
              : null,
          ].filter(Boolean).join(' · ')}
          {!provider && !avgRating && listing.area.name}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="relative z-10 flex items-center border-t border-border px-4 py-3 gap-2">
        <div className="whitespace-nowrap">
          <span className="font-display font-extrabold text-ink" style={{ fontSize: '16px' }}>
            {listing.price_monthly} RON
          </span>
          <span className="text-[11px] text-ink-muted">/mo</span>
        </div>

        {isFull ? (
          <span
            className="ml-auto whitespace-nowrap rounded-full font-display text-[12px] font-semibold"
            style={{ background: '#f1f0f5', color: '#55527a', padding: '5px 12px' }}
          >
            Fully booked
          </span>
        ) : listing.trial_available ? (
          <Link
            href={`/browse/${listing.id}?book=1`}
            className="ml-auto whitespace-nowrap rounded-[8px] font-display text-[12px] font-semibold bg-blue text-white hover:bg-blue-deep transition-colors"
            style={{ padding: '6px 12px' }}
          >
            Book trial →
          </Link>
        ) : (
          <Link
            href={`/browse/${listing.id}`}
            className="ml-auto whitespace-nowrap rounded-[8px] font-display text-[12px] font-semibold border border-border text-ink-mid hover:bg-surface transition-colors"
            style={{ padding: '6px 12px' }}
          >
            View listing →
          </Link>
        )}
      </div>
    </div>
  )
}
