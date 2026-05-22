'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { SaveButton } from '@/components/ui/SaveButton'
import {
  fmtEventDate, urgencyFor, categoryEmoji, categoryPalette, isFreePrice,
  utcIsoToBucharestLocal, type Locale,
} from '@/lib/eventDate'
import { googleCalendarUrl, downloadIcs, type CalendarEvent } from '@/lib/calendarLinks'
import type { ListingWithRelations } from '@/types/database'

interface EventCardProps {
  listing:      ListingWithRelations
  initialSaved?: boolean
  /** Reference "now" for urgency. Defaults to client time. */
  now?:         Date
}

function PosterCover({ slug, emoji, cover }: { slug: string; emoji: string; cover: string | null }) {
  if (cover) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
  }
  const [c1, c2, c3] = categoryPalette(slug)
  return (
    <div
      className="absolute inset-0"
      style={{ background: `linear-gradient(155deg, ${c1} 0%, ${c2} 70%, ${c3} 110%)` }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ mixBlendMode: 'screen', background: `radial-gradient(110% 65% at 85% 10%, ${c3}cc, transparent 60%)` }}
      />
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 260 260" preserveAspectRatio="none" aria-hidden="true">
        <circle cx="40"  cy="220" r="80" fill={c3}    opacity="0.22" />
        <circle cx="225" cy="60"  r="55" fill="#fff"  opacity="0.12" />
        <circle cx="200" cy="200" r="28" fill="#fff"  opacity="0.18" />
        <circle cx="60"  cy="60"  r="14" fill={c3}    opacity="0.45" />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ fontSize: 'clamp(56px, 9vw, 88px)', filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.18))' }}
      >
        {emoji}
      </div>
    </div>
  )
}

function CalendarMenu({ event }: { event: CalendarEvent }) {
  const t = useTranslations('events')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  const itemCls = 'flex items-center gap-2.5 w-full text-left bg-transparent border-none px-2.5 py-2 rounded-lg font-display text-[13px] font-semibold text-ink cursor-pointer no-underline hover:bg-primary-lt hover:text-primary'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t('addToCalendar')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v) }}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-black/35 border border-white/15 text-white backdrop-blur-md transition-all hover:bg-black/45"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
          className="absolute right-0 top-[calc(100%+6px)] min-w-[200px] z-50 bg-white border border-border rounded-[12px] p-1.5 [animation:cardMenuIn_.15s_ease-out]"
          style={{ boxShadow: '0 16px 40px rgba(28,28,39,0.18), 0 2px 8px rgba(28,28,39,0.08)' }}
        >
          <a
            className={itemCls}
            href={googleCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <span className="text-[15px] w-[18px] text-center">📅</span> {t('calGoogle')}
          </a>
          <button type="button" className={itemCls} onClick={() => { downloadIcs(event); setOpen(false) }}>
            <span className="text-[15px] w-[18px] text-center">🍎</span> {t('calApple')}
          </button>
          <button type="button" className={itemCls} onClick={() => { downloadIcs(event); setOpen(false) }}>
            <span className="text-[15px] w-[18px] text-center">⬇︎</span> {t('calIcs')}
          </button>
        </div>
      )}
    </div>
  )
}

export function EventCard({ listing, initialSaved = false, now }: EventCardProps) {
  const locale = useLocale() as Locale
  const t = useTranslations('events')

  const slug      = listing.category?.slug ?? 'other'
  const emoji     = categoryEmoji(slug)
  const cover     = listing.cover_image_url ?? null
  const startStr  = listing.event_start_at
  const endStr    = listing.event_end_at
  const start     = startStr ? new Date(startStr) : null
  const end       = endStr ? new Date(endStr) : (start ?? null)
  const venue     = listing.venue_name || listing.area?.name || ''
  const organizer = listing.organizer_name || listing.provider?.display_name || ''
  const priceLbl  = listing.price_label || '—'
  const free      = isFreePrice(listing.price_label)

  // Scraped events link externally to the source — they have no internal
  // detail page. The check uses `organizer_name` *raw* (not the fallback
  // chain) because scraped rows fall back to provider "Kidvo Events", which
  // would make the "Found by" branch unreachable.
  const isScraped    = (listing.source ?? '').startsWith('scraper:')
  const externalHref = isScraped && listing.event_url ? listing.event_url : null
  const showFoundBy  = isScraped && !listing.organizer_name

  const date    = start ? fmtEventDate(start, locale) : null
  const urgency = start ? urgencyFor(start, now ?? new Date(), locale) : null

  // Multi-day continuous event (e.g. a festival): count extra calendar days
  // it spans, in Timișoara local time. The date sticker shows day 1.
  const startDay  = startStr ? utcIsoToBucharestLocal(startStr).slice(0, 10) : ''
  const endDay    = endStr   ? utcIsoToBucharestLocal(endStr).slice(0, 10)   : ''
  const extraDays = startDay && endDay
    ? Math.max(0, Math.round((Date.parse(endDay) - Date.parse(startDay)) / 86_400_000))
    : 0

  const calEvent: CalendarEvent | null = start && end ? {
    title: listing.title,
    start,
    end,
    venue: listing.venue_name,
    description: listing.description,
    organizer,
    locale,
  } : null

  const toneCls = urgency?.tone === 'warm' ? 'bg-gold text-ink' : 'bg-white/90 text-ink-mid'

  const wrapperCls = "relative flex flex-col bg-white border-[1.5px] border-border rounded-xl shadow-card overflow-hidden transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card-hover no-underline"

  const inner = (
    <>
      <div className="relative overflow-hidden aspect-[4/5]">
        <PosterCover slug={slug} emoji={emoji} cover={cover} />

        {/* overlays: date sticker (+ multi-day pill) top-left · urgency bottom-left */}
        <div className="absolute inset-0 flex flex-col justify-between p-3 pointer-events-none">
          <div className="self-start flex flex-col items-start gap-1.5">
            {date && (
              <div className="inline-flex flex-col items-center min-w-[60px] bg-white rounded-[12px] px-2.5 pt-2 pb-[7px] font-display border border-white/40 [box-shadow:0_8px_24px_rgba(0,0,0,0.18)]">
                <div className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-danger leading-none">{date.day}</div>
                <div className="text-[24px] font-black text-ink leading-none tracking-[-1px] mt-[3px] mb-px">{date.dnum}</div>
                <div className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-mid leading-none">{date.mo}</div>
                <div className="text-[10.5px] font-semibold text-ink leading-none mt-1.5 pt-[5px] border-t border-border w-full text-center tracking-[-0.2px]">{date.time}</div>
              </div>
            )}
            {extraDays > 0 && (
              <span className="inline-flex items-center px-2 py-[3px] rounded-full bg-white/90 text-ink-mid font-display text-[10px] font-bold uppercase tracking-[0.06em] border border-white/50 backdrop-blur-[6px] [box-shadow:0_4px_12px_rgba(0,0,0,0.16)]">
                {t('multiDayPill', { n: extraDays })}
              </span>
            )}
          </div>
          {urgency?.label && (
            <span className={cn(
              'self-start inline-flex items-center gap-[5px] px-2.5 py-1 rounded-full font-display text-[10.5px] font-bold uppercase tracking-[0.08em] whitespace-nowrap border border-white/50 backdrop-blur-[6px] [box-shadow:0_4px_12px_rgba(0,0,0,0.16)]',
              toneCls,
            )}>
              {urgency.key === 'thisweek' && <span className="w-1.5 h-1.5 rounded-full bg-ink/40" />}
              {urgency.label}
            </span>
          )}
        </div>

        {/* icon row: save + calendar (top-right) */}
        <div className="absolute top-3 right-3 flex gap-1.5 z-[4]">
          <SaveButton listingId={listing.id} initialSaved={initialSaved} variant="poster" />
          {calEvent && <CalendarMenu event={calEvent} />}
        </div>
      </div>

      <div className="px-4 pt-3.5 pb-2">
        <div className="font-display font-extrabold text-[16px] leading-[1.25] tracking-[-0.4px] text-ink [text-wrap:balance]">
          {listing.title}
          {externalHref && (
            <svg
              className="inline-block ml-1 mb-[3px] text-ink-muted"
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            >
              <path d="M14 3h7v7" />
              <path d="M10 14L21 3" />
              <path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6" />
            </svg>
          )}
        </div>
        {venue && (
          <div className="flex items-center gap-[5px] font-body text-[12px] text-ink-mid mt-1.5 min-w-0">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="truncate">{venue}</span>
          </div>
        )}
        {showFoundBy ? (
          <div className="text-[11px] text-ink-muted mt-1 truncate">
            <span className="text-ink-mid font-semibold">{t('foundBy')}</span>
          </div>
        ) : organizer ? (
          <div className="text-[11px] text-ink-muted mt-1 truncate">
            {t('organizedBy')} <span className="text-ink-mid font-semibold">{organizer}</span>
          </div>
        ) : null}
      </div>

      <div className="px-4 py-[11px] border-t border-border flex items-center mt-auto">
        <span className={cn(
          'inline-flex items-center font-display font-extrabold text-[12.5px] tracking-[-0.2px] px-[11px] py-[5px] rounded-full whitespace-nowrap border',
          free
            ? 'bg-success-lt text-success border-success/25'
            : 'bg-gold-lt text-ink border-gold/50',
        )}>
          {priceLbl}
        </span>
      </div>
    </>
  )

  return externalHref ? (
    <a href={externalHref} target="_blank" rel="noopener nofollow" className={wrapperCls}>
      {inner}
    </a>
  ) : (
    <Link href={`/events/${listing.id}`} className={wrapperCls}>
      {inner}
    </Link>
  )
}
