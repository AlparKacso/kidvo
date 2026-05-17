'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { EventCard } from '@/components/ui/EventCard'
import { urgencyFor, type Locale, type UrgencyKey } from '@/lib/eventDate'
import type { ListingWithRelations } from '@/types/database'

type Filter = 'all' | UrgencyKey
const BUCKET_ORDER: UrgencyKey[] = ['thisweek', 'nextweek']

interface Props {
  events:    ListingWithRelations[]
  areas:     { id: string; name: string }[]
  languages: string[]
}

const selectCls = 'font-display text-[12.5px] font-semibold text-ink-mid bg-white border border-border rounded-full px-3.5 py-1.5 outline-none focus:border-primary cursor-pointer'

export function EventsListingClient({ events, areas, languages }: Props) {
  const locale = useLocale() as Locale
  const t = useTranslations('events')
  const now = useMemo(() => new Date(), [])

  const [filter, setFilter] = useState<Filter>('all')
  const [area, setArea] = useState('')
  const [age,  setAge]  = useState('')
  const [lang, setLang] = useState('')

  const annotated = useMemo(() =>
    events
      .filter(e => e.event_start_at)
      .map(e => ({ ev: e, key: urgencyFor(new Date(e.event_start_at!), now, locale).key })),
    [events, now, locale])

  // Dropdown filters apply first; chip counts reflect the dropdown-filtered set.
  const afterDropdowns = useMemo(() => annotated.filter(({ ev }) => {
    if (area && ev.area_id !== area) return false
    if (lang && !(ev.language ?? '').toLowerCase().includes(lang.toLowerCase())) return false
    if (age) {
      const a = parseInt(age)
      if (!Number.isNaN(a) && !(ev.age_min <= a && ev.age_max >= a)) return false
    }
    return true
  }), [annotated, area, lang, age])

  const counts = useMemo(() => ({
    all:      afterDropdowns.length,
    thisweek: afterDropdowns.filter(a => a.key === 'thisweek').length,
    nextweek: afterDropdowns.filter(a => a.key === 'nextweek').length,
  }), [afterDropdowns])

  const visible = filter === 'all' ? afterDropdowns : afterDropdowns.filter(a => a.key === filter)

  const groups = BUCKET_ORDER
    .map(key => ({ key, items: visible.filter(a => a.key === key).map(a => a.ev) }))
    .filter(g => g.items.length > 0)

  const groupLabel: Record<UrgencyKey, string> = { thisweek: t('thisWeek'), nextweek: t('nextWeek') }
  const chips: { key: Filter; label: string }[] = [
    { key: 'all',      label: t('filterAll') },
    { key: 'thisweek', label: t('thisWeek') },
    { key: 'nextweek', label: t('nextWeek') },
  ]

  function resetAll() { setFilter('all'); setArea(''); setAge(''); setLang('') }

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

      {/* Filters — chips + dropdowns, wrap to multiple lines on mobile */}
      <div className="flex flex-wrap items-center gap-2">
        {chips.map(c => {
          const active = filter === c.key
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(c.key)}
              className={cn(
                'font-display text-[12.5px] font-semibold px-3.5 py-1.5 rounded-full border transition-colors',
                active ? 'bg-ink text-white border-ink'
                       : 'bg-white text-ink-mid border-border hover:border-primary hover:text-primary',
              )}
            >
              {c.label}
              <span className={cn('ml-1.5 text-[11px] font-bold', active ? 'opacity-80' : 'text-ink-muted')}>
                {counts[c.key] ?? 0}
              </span>
            </button>
          )
        })}
        <span className="w-px h-5 bg-border mx-1 hidden sm:block" />
        <select value={area} onChange={e => setArea(e.target.value)} className={selectCls} aria-label={t('filterArea')}>
          <option value="">{t('filterArea')}</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={age} onChange={e => setAge(e.target.value)} className={selectCls} aria-label={t('filterAge')}>
          <option value="">{t('filterAge')}</option>
          {Array.from({ length: 16 }, (_, i) => i + 3).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={lang} onChange={e => setLang(e.target.value)} className={selectCls} aria-label={t('filterLanguage')}>
          <option value="">{t('filterLanguage')}</option>
          {languages.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {groups.length === 0 ? (
        <div className="border-[1.5px] border-dashed border-border-mid rounded-[22px] p-12 text-center">
          <div className="text-[42px] mb-2">🔍</div>
          <div className="font-display text-base font-bold text-ink mb-1">{t('emptyTitle')}</div>
          <div className="text-sm text-ink-mid mb-4">{t('emptySub')}</div>
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center font-display text-sm font-semibold px-4 py-2 rounded-full bg-primary text-white hover:bg-primary-deep transition-colors"
          >
            {t('filterAll')} →
          </button>
        </div>
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
              {g.items.map(ev => <EventCard key={ev.id} listing={ev} now={now} />)}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
