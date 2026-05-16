'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { EventCard } from '@/components/ui/EventCard'
import { urgencyFor, fmtEventDate, isFreePrice, type Locale, type UrgencyKey } from '@/lib/eventDate'
import type { ListingWithRelations } from '@/types/database'

type Filter = 'all' | 'today' | 'tomorrow' | 'weekend' | 'next' | 'free'
const BUCKET_ORDER: UrgencyKey[] = ['today', 'tomorrow', 'weekend', 'next', 'later']

export function EventsListingClient({ events }: { events: ListingWithRelations[] }) {
  const locale = useLocale() as Locale
  const t = useTranslations('events')
  const now = useMemo(() => new Date(), [])
  const [filter, setFilter] = useState<Filter>('all')

  // Annotate each event with its urgency bucket once.
  const annotated = useMemo(() =>
    events
      .filter(e => e.event_start_at)
      .map(e => ({ ev: e, key: urgencyFor(new Date(e.event_start_at!), now, locale).key })),
    [events, now, locale])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: annotated.length, today: 0, tomorrow: 0, weekend: 0, next: 0, free: 0 }
    for (const { ev, key } of annotated) {
      if (key in c) c[key]++
      if (isFreePrice(ev.price_label)) c.free++
    }
    return c
  }, [annotated])

  const visible = useMemo(() => {
    if (filter === 'all')  return annotated
    if (filter === 'free') return annotated.filter(a => isFreePrice(a.ev.price_label))
    return annotated.filter(a => a.key === filter)
  }, [annotated, filter])

  const groups = useMemo(() => {
    return BUCKET_ORDER
      .map(key => ({ key, items: visible.filter(a => a.key === key).map(a => a.ev) }))
      .filter(g => g.items.length > 0)
  }, [visible])

  const groupLabel: Record<UrgencyKey, string> = {
    today:    t('groupToday'),
    tomorrow: t('groupTomorrow'),
    weekend:  t('groupWeekend'),
    next:     t('groupNext'),
    later:    t('groupLater'),
  }

  const chips: { key: Filter; label: string; hot?: boolean }[] = [
    { key: 'all',      label: t('filterAll') },
    { key: 'today',    label: t('groupToday'), hot: counts.today > 0 },
    { key: 'tomorrow', label: t('groupTomorrow') },
    { key: 'weekend',  label: t('groupWeekend') },
    { key: 'next',     label: t('groupNext') },
    { key: 'free',     label: t('filterFree') },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/browse" className="font-display text-sm font-semibold text-ink-muted hover:text-primary transition-colors">
          {t('backToActivities')}
        </Link>
        <div className="mt-3 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-[7px] font-display text-[10.5px] font-bold uppercase tracking-[0.16em] text-primary">
              <span className="w-[7px] h-[7px] rounded-full bg-danger [animation:weekendPulse_1.8s_infinite]" />
              {t('listingEyebrow')}
            </div>
            <h1 className="font-display font-black text-ink leading-[1.05] mt-1.5" style={{ fontSize: '30px', letterSpacing: '-1px' }}>
              {t('listingTitle')}
            </h1>
            <p className="text-[13.5px] text-ink-mid mt-1">{t('listingSub', { count: counts.all })}</p>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap items-center">
        {chips.map((c, i) => {
          const active = filter === c.key
          return (
            <span key={c.key} className="flex items-center gap-2">
              {c.key === 'free' && <span className="w-px h-5 bg-border mx-1" />}
              <button
                type="button"
                onClick={() => setFilter(c.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 font-display text-[12.5px] font-semibold px-3.5 py-1.5 rounded-full border transition-all',
                  active && c.key === 'today' ? 'bg-danger text-white border-danger'
                  : active                    ? 'bg-ink text-white border-ink'
                  :                             'bg-white text-ink-mid border-border hover:border-primary hover:text-primary',
                )}
              >
                {c.key === 'today' && c.hot && !active && <span className="w-1.5 h-1.5 rounded-full bg-danger pulse-gold" />}
                {c.label}
                <span className={cn('text-[11px] font-bold', active ? 'opacity-80' : 'text-ink-muted')}>
                  {counts[c.key] ?? 0}
                </span>
              </button>
            </span>
          )
        })}
      </div>

      {/* Grouped grid OR empty state */}
      {groups.length === 0 ? (
        <div className="border-[1.5px] border-dashed border-border-mid rounded-[22px] p-12 text-center">
          <div className="text-[42px] mb-2">🔍</div>
          <div className="font-display text-base font-bold text-ink mb-1">{t('emptyTitle')}</div>
          <div className="text-sm text-ink-mid mb-4">{t('emptySub')}</div>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="inline-flex items-center font-display text-sm font-semibold px-4 py-2 rounded-full bg-primary text-white hover:bg-primary-deep transition-colors"
          >
            {t('filterAll')} →
          </button>
        </div>
      ) : (
        groups.map(g => {
          const first = g.items[0]
          const showDate = (g.key === 'today' || g.key === 'tomorrow') && first.event_start_at
          const d = showDate ? fmtEventDate(new Date(first.event_start_at!), locale) : null
          return (
            <div key={g.key}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="font-display font-black text-ink" style={{ fontSize: '18px', letterSpacing: '-0.6px' }}>
                  {groupLabel[g.key]}
                  {d && <span className="text-ink-muted font-bold"> · {d.day} {d.dnum} {d.mo}</span>}
                </h2>
                <span className="w-5 h-5 rounded-full bg-primary-lt text-primary font-display text-[10px] font-bold flex items-center justify-center">{g.items.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {g.items.map(ev => <EventCard key={ev.id} listing={ev} now={now} />)}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
