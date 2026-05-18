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

// Same pill-select styling as the activities SearchBar mobile filters.
const pillSelect = (active: boolean) => cn(
  'w-full px-2 py-2 rounded-full border font-display text-xs font-semibold outline-none cursor-pointer appearance-none transition-all',
  active ? 'bg-primary-lt border-primary-border text-primary' : 'bg-white border-border text-ink-mid',
)
const XIcon = () => (
  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
    <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export function EventsListingClient({ events, areas, languages }: Props) {
  const locale = useLocale() as Locale
  const t = useTranslations('events')
  const ts = useTranslations('search')
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

      {/* Filters — row 1: urgency chips · row 2: Area/Age/Language dropdowns */}
      <div className="flex flex-col gap-2.5">
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
        <div className="grid grid-cols-3 gap-2 max-w-[680px]">
          <select value={area} onChange={e => setArea(e.target.value)} style={{ textAlignLast: 'center' }} className={pillSelect(!!area)} aria-label={ts('allAreas')}>
            <option value="">{ts('allAreas')}</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={age} onChange={e => setAge(e.target.value)} style={{ textAlignLast: 'center' }} className={pillSelect(!!age)} aria-label={ts('allAges')}>
            <option value="">{ts('allAges')}</option>
            {[3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].map(n => <option key={n} value={n}>{ts('ageX', { age: n })}</option>)}
          </select>
          <select value={lang} onChange={e => setLang(e.target.value)} style={{ textAlignLast: 'center' }} className={pillSelect(!!lang)} aria-label={ts('allLanguages')}>
            <option value="">{ts('allLanguages')}</option>
            {languages.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {(area || age || lang) && (
          <div className="flex items-center gap-2 flex-wrap">
            {area && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-lt border border-primary-border rounded-full font-display text-xs font-semibold text-primary">
                {areas.find(a => a.id === area)?.name}
                <button onClick={() => setArea('')} className="hover:opacity-70 transition-opacity"><XIcon /></button>
              </span>
            )}
            {age && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-lt border border-primary-border rounded-full font-display text-xs font-semibold text-primary">
                {ts('ageX', { age })}
                <button onClick={() => setAge('')} className="hover:opacity-70 transition-opacity"><XIcon /></button>
              </span>
            )}
            {lang && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-lt border border-primary-border rounded-full font-display text-xs font-semibold text-primary">
                🌍 {lang}
                <button onClick={() => setLang('')} className="hover:opacity-70 transition-opacity"><XIcon /></button>
              </span>
            )}
            <button onClick={() => { setArea(''); setAge(''); setLang('') }} className="font-display text-xs font-semibold text-ink-muted hover:text-danger transition-colors ml-1">
              {ts('clearAll')}
            </button>
          </div>
        )}
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
