'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { EventCard } from '@/components/ui/EventCard'
import { urgencyFor, type Locale, type UrgencyKey } from '@/lib/eventDate'
import { groupEventsBySeries } from '@/lib/events/series'
import type { ListingWithRelations } from '@/types/database'

type Filter = 'all' | UrgencyKey
const BUCKET_ORDER: UrgencyKey[] = ['thisweek', 'nextweek']

interface Props {
  events: ListingWithRelations[]
}

export function EventsListingClient({ events }: Props) {
  const locale = useLocale() as Locale
  const t = useTranslations('events')
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

  const visible = filter === 'all' ? annotated : annotated.filter(a => a.key === filter)

  const groups = BUCKET_ORDER
    .map(key => ({ key, items: visible.filter(a => a.key === key) }))
    .filter(g => g.items.length > 0)

  const groupLabel: Record<UrgencyKey, string> = { thisweek: t('thisWeek'), nextweek: t('nextWeek') }
  const chips: { key: Filter; label: string }[] = [
    { key: 'all',      label: t('filterAll') },
    { key: 'thisweek', label: t('thisWeek') },
    { key: 'nextweek', label: t('nextWeek') },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/browse" className="font-display text-sm font-semibold text-ink-muted hover:text-primary transition-colors">
          {t('backToActivities')}
        </Link>
        <div className="mt-3">
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

      {/* Urgency chips — only filter remaining on /events */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        <div className="flex gap-2 sm:flex-wrap" style={{ width: 'max-content' }}>
          {chips.map(c => {
            const active = filter === c.key
            const glyph = c.key === 'all' ? '✦' : '🗓'
            const activeStyle = active
              ? c.key === 'all'
                ? { background: '#1c1c27', color: '#ffffff', borderColor: '#1c1c27' }
                : { background: '#f0e8ff', color: '#7c3aed', borderColor: '#7c3aed' }
              : {}
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setFilter(c.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full font-display text-[13px] font-semibold transition-all border-[1.5px] whitespace-nowrap',
                  active ? '' : 'bg-white border-border text-ink-mid hover:border-primary/40 hover:text-primary hover:bg-primary-lt/50',
                )}
                style={{ padding: '6px 14px', ...activeStyle }}
              >
                <span style={{ fontSize: '13px', lineHeight: 1 }}>{glyph}</span>
                {c.label}
                <span className={cn('text-[11px] font-bold', active ? 'opacity-70' : 'text-ink-muted')}>
                  {counts[c.key] ?? 0}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {groups.length === 0 ? (
        annotated.length === 0 ? (
          // No events exist at all (e.g. fresh prod) — not a filter result.
          <div className="border-[1.5px] border-dashed border-border-mid rounded-[22px] p-12 text-center">
            <div className="text-[42px] mb-2">📅</div>
            <div className="font-display text-base font-bold text-ink mb-1">{t('emptyAllTitle')}</div>
            <div className="text-sm text-ink-mid">{t('emptyAllSub')}</div>
          </div>
        ) : (
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
        )
      ) : (
        groups.map(g => (
          <div key={g.key}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-display font-black text-ink" style={{ fontSize: '18px', letterSpacing: '-0.6px' }}>
                {groupLabel[g.key]}
              </h2>
              <span className="w-5 h-5 rounded-full bg-primary-lt text-primary font-display text-[10px] font-bold flex items-center justify-center">{g.items.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {g.items.map(a => <EventCard key={a.ev.id} listing={a.ev} seriesCount={a.extra} now={now} />)}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
