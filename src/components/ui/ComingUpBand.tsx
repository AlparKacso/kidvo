'use client'

import { useMemo, useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { EventCard } from '@/components/ui/EventCard'
import { urgencyFor, type Locale } from '@/lib/eventDate'
import type { ListingWithRelations } from '@/types/database'

interface ComingUpBandProps {
  events: ListingWithRelations[]
}

export function ComingUpBand({ events }: ComingUpBandProps) {
  const locale = useLocale() as Locale
  const t = useTranslations('events')
  const rowRef = useRef<HTMLDivElement>(null)

  // Single shared "now" so urgency is consistent across the band render.
  const now = useMemo(() => new Date(), [])

  const counts = useMemo(() => {
    let today = 0, tomorrow = 0, weekend = 0
    for (const ev of events) {
      if (!ev.event_start_at) continue
      const k = urgencyFor(new Date(ev.event_start_at), now, locale).key
      if (k === 'today') today++
      else if (k === 'tomorrow') tomorrow++
      else if (k === 'weekend') weekend++
    }
    return { today, tomorrow, weekend }
  }, [events, now, locale])

  if (!events || events.length === 0) return null

  const scroll = (dx: number) => rowRef.current?.scrollBy({ left: dx, behavior: 'smooth' })

  const pills = [
    counts.today    && { n: counts.today,    label: t('today'),       hot: true },
    counts.tomorrow && { n: counts.tomorrow, label: t('tomorrow'),    hot: false },
    counts.weekend  && { n: counts.weekend,  label: t('thisWeekend'), hot: false },
  ].filter(Boolean) as { n: number; label: string; hot: boolean }[]

  return (
    <section
      className="relative mt-1.5 mb-[22px] rounded-[22px] border-[1.5px] border-primary-border p-[22px_22px_6px]"
      style={{ background: 'linear-gradient(140deg, rgba(124,58,237,0.07) 0%, rgba(245,197,66,0.10) 100%)' }}
    >
      <header className="flex justify-between items-end gap-4 mb-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-[7px] font-display text-[10.5px] font-bold uppercase tracking-[0.16em] text-primary">
            <span className="w-[7px] h-[7px] rounded-full bg-danger [animation:weekendPulse_1.8s_infinite]" />
            {t('eyebrow')}
          </div>
          <h2 className="font-display font-black text-[26px] tracking-[-1px] text-ink leading-[1.1] mt-1.5 mb-1">
            {t('title')}
          </h2>
          <p className="text-[13.5px] text-ink-mid m-0 max-w-[480px]">{t('sub')}</p>
        </div>
        {pills.length > 0 && (
          <div className="flex items-center gap-3.5 shrink-0">
            <div className="flex gap-1.5 flex-wrap">
              {pills.map((p, i) => (
                <span
                  key={i}
                  className={cn(
                    'font-display text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap border',
                    p.hot
                      ? 'bg-gold-lt text-gold-text border-gold/40'
                      : 'bg-white/70 text-ink-mid border-border',
                  )}
                >
                  <b className="text-ink font-extrabold mr-0.5">{p.n}</b>
                  {p.label.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
        )}
      </header>

      <div className="relative">
        <div
          ref={rowRef}
          className="grid grid-flow-col auto-cols-[248px] justify-start gap-4 overflow-x-auto snap-x snap-mandatory p-[4px_4px_18px] -mx-1 [scrollbar-width:thin]"
        >
          {events.map(ev => (
            <div key={ev.id} className="snap-start">
              <EventCard listing={ev} now={now} />
            </div>
          ))}
        </div>
        <button
          type="button"
          aria-label={t('scrollPrev')}
          onClick={() => scroll(-360)}
          className="absolute top-1/2 -translate-y-1/2 -left-3.5 w-8 h-8 rounded-full bg-white border border-border shadow-card flex items-center justify-center z-[5] text-ink transition-all hover:bg-primary-lt hover:text-primary hover:border-primary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <button
          type="button"
          aria-label={t('scrollNext')}
          onClick={() => scroll(360)}
          className="absolute top-1/2 -translate-y-1/2 -right-3.5 w-8 h-8 rounded-full bg-white border border-border shadow-card flex items-center justify-center z-[5] text-ink transition-all hover:bg-primary-lt hover:text-primary hover:border-primary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>
    </section>
  )
}
