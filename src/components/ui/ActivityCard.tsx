'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { SaveButton } from '@/components/ui/SaveButton'
import { detectBrightness, getProviderInitials, type ContrastMode } from '@/lib/imageBrightness'
import { isWaitlistOpen } from '@/lib/classes'
import type { ListingWithRelations } from '@/types/database'

const CATEGORY_EMOJI: Record<string, string> = {
  sport:       '⚽',
  dance:       '💃',
  music:       '🎵',
  coding:      '💻',
  arts:        '🎨',
  'arts-crafts': '🎨',
  language:    '🌍',
  languages:   '🌍',
  chess:       '♟️',
  gym:         '🤸',
  gymnastics:  '🤸',
  babysitting: '🍼',
  health:      '❤️',
  other:       '✨',
}

const DAY_LABELS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

function formatDays(schedules: ListingWithRelations['schedules'], everyDayLabel: string): string {
  if (!schedules?.length) return ''
  const set = new Set(schedules.map(s => s.day_of_week))
  if (set.size === 7) return everyDayLabel
  const sorted = [...set].sort((a, b) => a - b)
  const groups: number[][] = []
  let cur: number[] = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === cur[cur.length - 1] + 1) cur.push(sorted[i])
    else { groups.push(cur); cur = [sorted[i]] }
  }
  groups.push(cur)
  return groups
    .map(g => g.length >= 2
      ? `${DAY_LABELS[g[0]]}–${DAY_LABELS[g[g.length - 1]]}`
      : DAY_LABELS[g[0]])
    .join(' + ')
}

interface ActivityCardProps {
  listing:       ListingWithRelations
  featured?:     boolean
  savedIds?:     string[]
  avgRating?:    number | null
  reviewCount?:  number
  /** Test override — normally auto-detected from image luminance. */
  forceContrast?: ContrastMode
  /** Provider mode: actions shown top-right in place of the save heart (e.g. share + three-dot menu). */
  providerActions?: React.ReactNode
  /** Provider mode: replaces the footer-left provider/rating line (e.g. status + spots). */
  statusBadge?:  React.ReactNode
}

export function ActivityCard({ listing, featured, savedIds, avgRating, reviewCount, forceContrast, providerActions, statusBadge }: ActivityCardProps) {
  const t = useTranslations('card')
  const tCat = useTranslations('categories')

  const catName     = tCat.has(listing.category.slug) ? tCat(listing.category.slug) : listing.category.name
  const accent      = listing.category.accent_color
  // "Full" treatment (desaturated cover + lock chip + hidden save heart) also
  // covers the at-capacity-no-trial case — both open the waitlist.
  const isFull      = isWaitlistOpen(listing)
  const isSaved     = savedIds?.includes(listing.id) ?? false
  const days        = formatDays(listing.schedules, t('everyDay'))
  const provider    = (listing.provider as { display_name?: string })?.display_name ?? ''
  const emoji       = CATEGORY_EMOJI[listing.category.slug] ?? '✨'
  const initials    = getProviderInitials(provider)
  const cover       = (listing as { cover_image_url?: string | null }).cover_image_url ?? null
  const pricingType = (listing as { pricing_type?: string }).pricing_type
  const hasRating   = typeof avgRating === 'number' && avgRating > 0
  const ages        = `Ages ${listing.age_min}–${listing.age_max}`

  const initialContrast: ContrastMode = forceContrast ?? (cover ? 'normal' : 'placeholder')
  const [contrast, setContrast] = useState<ContrastMode>(initialContrast)
  const [imgLoaded, setImgLoaded] = useState(false)

  const handleImgLoad = useCallback(
    (img: HTMLImageElement) => {
      setImgLoaded(true)
      if (forceContrast === undefined) {
        setContrast(detectBrightness(img))
      }
    },
    [forceContrast],
  )

  // Cached / already-complete images can finish loading before React attaches
  // onLoad. Fire the load logic manually when the ref attaches if complete.
  const imgRef = useCallback(
    (node: HTMLImageElement | null) => {
      if (node && node.complete && node.naturalWidth > 0) {
        handleImgLoad(node)
      }
    },
    [handleImgLoad],
  )

  const showPlaceholder = contrast === 'placeholder'
  const showFrostedPlate = contrast === 'bright' || showPlaceholder

  const placeholderBg = `linear-gradient(160deg, color-mix(in oklab, ${accent} 18%, white), color-mix(in oklab, ${accent} 38%, white))`

  const metaParts = [
    ages,
    days,
  ].filter(Boolean)

  return (
    <article
      className={cn(
        'relative bg-white rounded-xl border border-border shadow-card-on-white flex flex-col transition-all duration-200',
        'motion-safe:hover:-translate-y-[3px] hover:shadow-card-hover-lg',
      )}
    >
      <Link
        href={`/browse/${listing.id}`}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={listing.title}
      />

      {/* ── Hero (4:3) ── */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl flex flex-col justify-between p-[12px] pointer-events-none">
        {/* Image OR typographic placeholder (absolute inset-0) */}
        {showPlaceholder ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-center px-[30px] pointer-events-none"
            style={{ background: placeholderBg, paddingTop: '14%', paddingBottom: '22%' }}
          >
            <div
              className="absolute pointer-events-none"
              style={{ top: 14, right: 14, fontSize: 18, opacity: 0.55, lineHeight: 1 }}
              aria-hidden
            >
              {emoji}
            </div>
            {initials ? (
              <>
                <div
                  className="font-display"
                  style={{
                    fontWeight: 900,
                    fontSize: 56,
                    lineHeight: 1,
                    letterSpacing: '-3px',
                    color: accent,
                  }}
                  aria-hidden
                >
                  {initials}
                </div>
                {provider && (
                  <div
                    className="font-display uppercase line-clamp-1 max-w-full"
                    style={{
                      fontWeight: 700,
                      fontSize: 11.5,
                      letterSpacing: '0.22em',
                      color: accent,
                      opacity: 0.7,
                      marginTop: 8,
                    }}
                  >
                    {provider}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 56, lineHeight: 1 }} aria-hidden>{emoji}</div>
            )}
          </div>
        ) : (
          cover && (
            <img
              ref={imgRef}
              src={cover}
              alt=""
              crossOrigin="anonymous"
              className={cn(
                'absolute inset-0 w-full h-full object-cover transition-opacity duration-[250ms]',
                imgLoaded ? 'opacity-100' : 'opacity-0',
                isFull && 'saturate-[0.4] brightness-[0.85]',
              )}
              onLoad={(e) => handleImgLoad(e.currentTarget)}
              onError={() => setContrast('placeholder')}
            />
          )
        )}

        {/* Scrim — hidden when frosted-plate */}
        {!showFrostedPlate && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.2) 45%, rgba(0,0,0,0) 70%)',
            }}
          />
        )}

        {/* Top row: category chip + featured pill + save button */}
        <div className="relative z-[2] flex justify-between items-start gap-1.5 pointer-events-none">
          <span
            className="inline-flex items-center gap-1.5 rounded-full backdrop-blur-md font-display uppercase max-w-full"
            style={{
              background: 'rgba(255,255,255,0.95)',
              color: accent,
              padding: '5px 11px',
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}
          >
            <span aria-hidden style={{ fontSize: 12 }}>{emoji}</span>
            <span className="truncate">{catName}</span>
          </span>

          <div className="flex items-start gap-1.5 shrink-0">
            {featured && (
              <span
                className="inline-flex items-center rounded-full font-display uppercase bg-gold text-ink"
                style={{
                  padding: '5px 11px',
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  marginTop: !isFull ? 3 : 0, // align with 36px save button center-ish
                }}
              >
                {t('featured')}
              </span>
            )}
            {providerActions ? (
              // Permanent light pill so share + three-dot stay legible on any
              // cover (light placeholder, photo, or dark scrim).
              <div className="pointer-events-auto flex items-center gap-0.5 rounded-full backdrop-blur-md shadow-sm px-0.5"
                style={{ background: 'rgba(255,255,255,0.95)' }}>
                {providerActions}
              </div>
            ) : !isFull ? (
              <div className="pointer-events-auto">
                <SaveButton listingId={listing.id} initialSaved={isSaved} variant="poster" />
              </div>
            ) : null}
          </div>
        </div>

        {/* Bottom overlay: meta + title */}
        <div
          className={cn(
            'relative z-[2] text-white pointer-events-none',
            showFrostedPlate &&
              'rounded-[14px] border border-white/10 backdrop-blur-[14px] backdrop-saturate-[1.2] -mx-0.5 -mb-0.5 px-[14px] py-[12px]',
          )}
          style={
            showFrostedPlate
              ? { background: 'rgba(20,20,28,0.55)' }
              : undefined
          }
        >
          {metaParts.length > 0 && (
            <div
              className="flex items-center font-display uppercase whitespace-nowrap overflow-hidden text-ellipsis"
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.04em',
                color: 'rgba(255,255,255,0.85)',
                gap: 6,
                marginBottom: 6,
              }}
            >
              {metaParts.map((part, i) => (
                <span key={i} className="inline-flex items-center" style={{ gap: 6 }}>
                  {i > 0 && (
                    <span
                      aria-hidden
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.45)',
                        display: 'inline-block',
                      }}
                    />
                  )}
                  <span>{part}</span>
                </span>
              ))}
            </div>
          )}

          <h3
            className="font-display m-0 line-clamp-2"
            style={{
              fontSize: 22,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.6px',
              textWrap: 'balance',
              textShadow: showFrostedPlate ? 'none' : '0 2px 14px rgba(0,0,0,0.4)',
            }}
          >
            {listing.title}
          </h3>
        </div>

        {/* Lock chip — centered when full */}
        {isFull && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[3] inline-flex items-center gap-1.5 rounded-full backdrop-blur-sm font-display whitespace-nowrap pointer-events-none"
            style={{
              background: 'rgba(28,28,39,0.85)',
              color: '#fff',
              padding: '8px 14px',
              fontSize: 11.5,
              fontWeight: 700,
            }}
          >
            <span aria-hidden>🔒</span>
            <span>{t('atCapacity')}</span>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        className="relative z-[1] flex justify-between items-center pointer-events-none"
        style={{ padding: '12px 14px', gap: 10 }}
      >
        <div className="flex flex-col min-w-0" style={{ gap: 2 }}>
          {statusBadge && <div className="pointer-events-auto">{statusBadge}</div>}
          {!statusBadge && provider && (
            <div
              className="font-display text-ink truncate"
              style={{ fontSize: 13, fontWeight: 700 }}
            >
              {provider}
            </div>
          )}
          {!statusBadge && hasRating && (
            <div
              className="inline-flex items-center text-ink-mid"
              style={{ fontSize: 11.5, gap: 4 }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#f5c542" aria-hidden>
                <path d="m12 2 3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7z" />
              </svg>
              <b className="font-display text-ink">{avgRating!.toFixed(1)}</b>
              <span>· {reviewCount ?? 0}</span>
            </div>
          )}
          {!statusBadge && !provider && !hasRating && listing.area?.name && (
            <div className="text-ink-mid" style={{ fontSize: 11.5 }}>
              {listing.area.name}
            </div>
          )}
        </div>

        <div className="text-right font-display whitespace-nowrap">
          <span
            className="text-ink"
            style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px' }}
          >
            {listing.price_monthly}
          </span>
          <span
            className="block text-ink-muted"
            style={{ fontSize: 10.5, fontWeight: 500, marginTop: -1 }}
          >
            RON {pricingType === 'session' ? t('perSession') : t('perMonth')}
          </span>
        </div>
      </div>
    </article>
  )
}
