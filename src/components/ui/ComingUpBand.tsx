'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { EventCard } from '@/components/ui/EventCard'
import { urgencyFor, type Locale, type UrgencyKey } from '@/lib/eventDate'
import { groupEventsBySeries } from '@/lib/events/series'
import type { ListingWithRelations } from '@/types/database'

interface ComingUpBandProps {
  events: ListingWithRelations[]
}

type Filter = 'all' | UrgencyKey

export function ComingUpBand({ events }: ComingUpBandProps) {
  const locale = useLocale() as Locale
  const t = useTranslations('events')
  const rowRef = useRef<HTMLDivElement>(null)
  const now = useMemo(() => new Date(), [])
  const [filter, setFilter] = useState<Filter>('all')

  // One entry per series (or standalone event) — repeating occurrences
  // collapse to their next-upcoming lead.
  const annotated = useMemo(() =>
    groupEventsBySeries(events).map(g => ({
      ev:    g.lead,
      extra: g.extraCount,
      key:   urgencyFor(new Date(g.lead.event_start_at!), now, locale).key,
    })),
    [events, now, locale])

  const counts = useMemo(() => ({
    all:      annotated.length,
    thisweek: annotated.filter(a => a.key === 'thisweek').length,
    nextweek: annotated.filter(a => a.key === 'nextweek').length,
  }), [annotated])

  if (!events || events.length === 0) return null

  const visible = filter === 'all' ? annotated : annotated.filter(a => a.key === filter)

  const scroll = (dir: number) => {
    const el = rowRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.85, 360), behavior: 'smooth' })
  }

  const chips: { key: Filter; label: string }[] = [
    { key: 'all',      label: t('filterAll') },
    { key: 'thisweek', label: t('thisWeek') },
    { key: 'nextweek', label: t('nextWeek') },
  ]

  return (
    <section
      className="relative mt-1.5 mb-[22px] rounded-[22px] border-[1.5px] border-primary-border p-4 md:p-[22px_22px_6px]"
      style={{ background: 'linear-gradient(140deg, rgba(124,58,237,0.07) 0%, rgba(245,197,66,0.10) 100%)' }}
    >
      <header className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-[7px] font-display text-[10.5px] font-bold uppercase tracking-[0.16em] text-primary">
            <span className="w-[7px] h-[7px] rounded-full bg-danger [animation:weekendPulse_1.8s_infinite]" />
            {t('eyebrow')}
          </div>
          <Link
            href="/events"
            className="font-display text-[12px] font-bold text-primary hover:text-primary-deep transition-colors whitespace-nowrap"
          >
            {t('seeAll', { count: annotated.length })}
          </Link>
        </div>
        <h2 className="font-display font-black text-[22px] md:text-[26px] tracking-[-1px] text-ink leading-[1.1] mt-1.5 mb-1">
          {t('title')}
        </h2>
        <p className="text-[12px] text-ink-mid m-0 truncate">{t('sub')}</p>
        <div className="flex flex-nowrap items-center gap-2 mt-3 -mx-1 px-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map(c => {
            const active = filter === c.key
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setFilter(c.key)}
                className={cn(
                  'shrink-0 font-display text-[11.5px] font-semibold px-2.5 py-1.5 rounded-full whitespace-nowrap border transition-colors',
                  active
                    ? 'bg-ink text-white border-ink'
                    : 'bg-white/70 text-ink-mid border-border hover:border-primary hover:text-primary',
                )}
              >
                {c.label}
                <span className={cn('ml-1 text-[10.5px] font-bold', active ? 'opacity-80' : 'text-ink-muted')}>
                  {counts[c.key] ?? 0}
                </span>
              </button>
            )
          })}
        </div>
      </header>

      <div className="relative">
        <div
          ref={rowRef}
          className="flex md:grid md:grid-flow-col md:auto-cols-[248px] gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory px-[6%] md:px-1 -mx-1 pb-[18px] pt-1 [scrollbar-width:thin]"
        >
          {visible.length === 0 ? (
            <div className="w-full text-center text-sm text-ink-muted py-6">{t('emptyTitle')}</div>
          ) : visible.map(({ ev, extra }) => (
            <div key={ev.id} className="w-[88%] shrink-0 snap-center md:w-auto md:shrink">
              <EventCard listing={ev} seriesCount={extra} now={now} />
            </div>
          ))}
        </div>
        {visible.length > 1 && (
          <>
            <button
              type="button"
              aria-label={t('scrollPrev')}
              onClick={() => scroll(-1)}
              className="hidden md:flex absolute top-1/2 -translate-y-1/2 -left-3.5 w-8 h-8 rounded-full bg-white border border-border shadow-card items-center justify-center z-[5] text-ink transition-all hover:bg-primary-lt hover:text-primary hover:border-primary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button
              type="button"
              aria-label={t('scrollNext')}
              onClick={() => scroll(1)}
              className="hidden md:flex absolute top-1/2 -translate-y-1/2 -right-3.5 w-8 h-8 rounded-full bg-white border border-border shadow-card items-center justify-center z-[5] text-ink transition-all hover:bg-primary-lt hover:text-primary hover:border-primary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </>
        )}
      </div>
    </section>
  )
}
