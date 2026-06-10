'use client'

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { googleCalendarUrl, downloadIcs } from '@/lib/calendarLinks'
import type { CalendarEntry, FamilyCalendarChild, CalendarStatus } from '@/lib/familyCalendar'

interface Props {
  kids:    FamilyCalendarChild[]
  entries: CalendarEntry[]
}

const ROW_H = 48 // px per hour

// Decimal hours from a time string. Handles 'HH', 'HH:MM' and 'HH:MM:SS'
// (e.g. '14' → 14, '16:30' → 16.5, '16:00:00' → 16). null on bad input.
function parseTime(t: string | null): number | null {
  if (!t) return null
  const parts = t.split(':')
  const h = Number(parts[0])
  const m = parts.length > 1 ? Number(parts[1]) : 0
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h + m / 60
}
const fmtHour = (h: number) => `${Math.floor(h)}:${String(Math.round((h - Math.floor(h)) * 60)).padStart(2, '0')}`

// Next calendar date matching kidvo weekday d (0=Mon..6=Sun) at decimal hour.
function nextOccurrence(d: number, hour: number): Date {
  const jsTarget = (d + 1) % 7 // 0=Mon..6=Sun → JS 0=Sun..6=Sat
  const now = new Date()
  const date = new Date(now)
  const delta = (jsTarget - now.getDay() + 7) % 7
  date.setDate(now.getDate() + delta)
  date.setHours(Math.floor(hour), Math.round((hour - Math.floor(hour)) * 60), 0, 0)
  return date
}

// Monday of the week `offset` weeks from today.
function weekStart(offset: number): Date {
  const now = new Date()
  const day = (now.getDay() + 6) % 7 // 0=Mon..6=Sun
  const mon = new Date(now)
  mon.setDate(now.getDate() - day + offset * 7)
  mon.setHours(0, 0, 0, 0)
  return mon
}

type Placed = CalendarEntry & { day: number; instId: string; startH: number; endH: number }

export function FamilyCalendarClient({ kids, entries }: Props) {
  const t = useTranslations('calendar')
  const locale = useLocale() as 'ro' | 'en'
  const router = useRouter()

  const [selected, setSelected] = useState<string>('all')
  const [weekOffset, setWeekOffset] = useState(0)
  const [open, setOpen] = useState<{ entry: CalendarEntry; rect: DOMRect } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const colorOf = (childId: string | null) =>
    kids.find(k => k.id === childId)?.color ?? '#9590b3'

  const filtered = selected === 'all' ? entries : entries.filter(e => e.childId === selected)

  // Split into grid-placeable (days + times) vs unscheduled (missing time).
  const { placed, unscheduled, hours } = useMemo(() => {
    const placed: Placed[] = []
    const unscheduled: CalendarEntry[] = []
    for (const e of filtered) {
      const s = parseTime(e.timeStart)
      const en = parseTime(e.timeEnd)
      // Number.isFinite also rejects null/NaN — a bad time must NEVER reach
      // `placed`, or its NaN poisons the min/max below and blanks the grid.
      if (e.days.length === 0 || !Number.isFinite(s) || !Number.isFinite(en) || (en as number) <= (s as number)) {
        unscheduled.push(e)
        continue
      }
      for (const d of e.days) {
        placed.push({ ...e, day: d, instId: `${e.id}-${d}`, startH: s as number, endH: en as number })
      }
    }
    // Default window 8:00–20:00 (covers morning through evening activities),
    // expanded to include anything earlier or later so a 7am or 20:00+ class is
    // never cut off. Generous [6, 23] envelope.
    let min = 8, max = 20
    if (placed.length) {
      min = Math.min(min, ...placed.map(p => Math.floor(p.startH)))
      max = Math.max(max, ...placed.map(p => Math.ceil(p.endH)))
    }
    min = Math.max(6, min)
    max = Math.min(23, max)
    // Defensive fallback — never render an empty grid even if the data is odd.
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) { min = 8; max = 20 }
    const hours: number[] = []
    for (let h = min; h < max; h++) hours.push(h)
    return { placed, unscheduled, hours }
  }, [filtered])

  const countFor = (id: string) =>
    (id === 'all' ? entries : entries.filter(e => e.childId === id)).reduce((n, e) => n + Math.max(1, e.days.length), 0)

  const mon = weekStart(weekOffset)
  const dayDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i); return d
  })
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const dayShort = (i: number) => t(`days.${i}` as 'days.0')
  const rangeLabel = `${dayDates[0].toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${dayDates[6].toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`

  async function action(entry: CalendarEntry, kind: 'withdraw' | 'leave') {
    setBusy(true)
    const [src, rawId] = entry.id.split(':')
    const res = await fetch('/api/calendar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: src, id: rawId, action: kind }),
    })
    setBusy(false); setOpen(null)
    if (!res.ok) { showToast(t('errorGeneric')); return }
    showToast(kind === 'withdraw' ? t('withdrawnToast') : t('leftListToast'))
    router.refresh()
  }
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3200) }

  // Per-day side-by-side layout: overlapping events share the column width
  // (split into sub-columns) instead of stacking on top of each other.
  const dayLayouts = useMemo(() => {
    const layouts: Record<number, Record<string, { col: number; cols: number }>> = {}
    for (let d = 0; d < 7; d++) {
      const day = placed.filter(p => p.day === d).sort((a, b) => a.startH - b.startH || a.endH - b.endH)
      const map: Record<string, { col: number; cols: number }> = {}
      let cluster: typeof day = []
      let clusterEnd = -Infinity
      const flush = () => {
        const colEnds: number[] = []
        const colOf: Record<string, number> = {}
        for (const ev of cluster) {
          let c = colEnds.findIndex(end => end <= ev.startH)
          if (c === -1) { c = colEnds.length; colEnds.push(ev.endH) } else { colEnds[c] = ev.endH }
          colOf[ev.instId] = c
        }
        for (const ev of cluster) map[ev.instId] = { col: colOf[ev.instId], cols: colEnds.length }
        cluster = []; clusterEnd = -Infinity
      }
      for (const ev of day) {
        if (cluster.length && ev.startH >= clusterEnd) flush()
        cluster.push(ev); clusterEnd = Math.max(clusterEnd, ev.endH)
      }
      flush()
      layouts[d] = map
    }
    return layouts
  }, [placed])
  // ⚠ marker = the event shares its slot with another (more than one column).
  const overlapIds = useMemo(() => {
    const set = new Set<string>()
    for (const day of Object.values(dayLayouts))
      for (const [id, l] of Object.entries(day)) if (l.cols > 1) set.add(id)
    return set
  }, [dayLayouts])

  const hasAny = entries.length > 0

  return (
    <div className="px-1">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-ink mb-0.5">{t('title')}</h1>
          <p className="text-sm text-ink-muted">{t('subtitle')}</p>
        </div>
      </div>

      {!hasAny ? (
        <div className="rounded-[18px] border border-border bg-white p-10 text-center">
          <div className="text-3xl mb-2">🗓️</div>
          <h2 className="font-display text-base font-bold text-ink mb-1">{t('emptyTitle')}</h2>
          <p className="text-sm text-ink-muted mb-4">{t('emptySub')}</p>
          <a href="/browse" className="inline-block px-4 py-2 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep transition-colors">{t('browseCta')}</a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[230px_1fr] gap-4">
          {/* Left rail */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <button onClick={() => setSelected('all')}
                className={`flex items-center gap-2.5 p-2.5 rounded-[12px] border text-left transition-colors ${selected === 'all' ? 'border-ink bg-ink/[0.04]' : 'border-border bg-white hover:border-ink/30'}`}>
                <span className="w-8 h-8 rounded-full bg-bg flex items-center justify-center text-base flex-shrink-0">👨‍👧‍👦</span>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-[12.5px] font-semibold text-ink">{t('allKids')}</div>
                  <div className="font-display text-[10.5px] text-ink-muted">{t('combinedView')}</div>
                </div>
                <span className="font-display text-[11px] font-bold text-ink-mid">{countFor('all')}</span>
              </button>
              {kids.map(k => (
                <button key={k.id} onClick={() => setSelected(k.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-[12px] border text-left transition-colors ${selected === k.id ? 'border-ink bg-ink/[0.04]' : 'border-border bg-white hover:border-ink/30'}`}>
                  <span className="w-8 h-8 rounded-full flex items-center justify-center font-display text-[12px] font-bold text-white flex-shrink-0" style={{ background: k.color }}>{k.name.slice(0, 1).toUpperCase()}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-[12.5px] font-semibold text-ink truncate">{k.name}</div>
                    {k.age != null && <div className="font-display text-[10.5px] text-ink-muted">{t('ageYears', { n: k.age })}</div>}
                  </div>
                  <span className="font-display text-[11px] font-bold text-ink-mid">{countFor(k.id)}</span>
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="rounded-[12px] border border-border bg-white p-3">
              <div className="font-display text-[10px] font-bold uppercase tracking-[.1em] text-ink-muted mb-2">{t('legendStatus')}</div>
              <div className="flex flex-col gap-1.5">
                <LegendRow swatch={<span className="w-3.5 h-3.5 rounded bg-ink/15" />} label={t('statusEnrolled')} />
                <LegendRow swatch={<span className="w-3.5 h-3.5 rounded border border-dashed border-ink/40" />} label={t('statusPending')} />
                <LegendRow swatch={<span className="w-3.5 h-3.5 rounded" style={{ background: 'repeating-linear-gradient(45deg,#cfcadb,#cfcadb 2px,transparent 2px,transparent 4px)' }} />} label={t('statusWaitlisted')} />
              </div>
            </div>
          </div>

          {/* Week grid */}
          <div className="rounded-[14px] border border-border bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <div className="font-display text-[12.5px] font-semibold text-ink">{rangeLabel}</div>
              <div className="flex items-center gap-1">
                <button onClick={() => setWeekOffset(o => o - 1)} className="w-7 h-7 rounded flex items-center justify-center text-ink-mid hover:bg-bg transition-colors" aria-label="prev">
                  <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M9.5 3L5 7.5 9.5 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button onClick={() => setWeekOffset(0)} className="px-2.5 h-7 rounded font-display text-[11px] font-semibold text-ink-mid hover:bg-bg transition-colors">{t('today')}</button>
                <button onClick={() => setWeekOffset(o => o + 1)} className="w-7 h-7 rounded flex items-center justify-center text-ink-mid hover:bg-bg transition-colors" aria-label="next">
                  <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M5.5 3L10 7.5 5.5 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>

            {/* Scrollable grid — sticky day headers stay aligned while the hours scroll */}
            <div className="max-h-[64vh] overflow-y-auto">
            {/* Day headers */}
            <div className="grid sticky top-0 z-10 bg-white" style={{ gridTemplateColumns: '46px repeat(7,1fr)' }}>
              <div className="border-b border-border bg-white" />
              {dayDates.map((d, i) => {
                const isToday = d.getTime() === today.getTime()
                return (
                  <div key={i} className={`border-b border-l border-border py-1.5 text-center ${i >= 5 ? 'bg-bg/40' : ''}`}>
                    <div className={`font-display text-[10px] font-bold uppercase tracking-[.08em] ${isToday ? 'text-primary' : 'text-ink-muted'}`}>{dayShort(i)}</div>
                    <div className={`font-display text-[13px] font-bold ${isToday ? 'text-primary' : 'text-ink'}`}>{d.getDate()}</div>
                  </div>
                )
              })}
            </div>

            {/* Body */}
            <div className="grid" style={{ gridTemplateColumns: '46px repeat(7,1fr)' }}>
              {/* time column */}
              <div className="relative">
                {hours.map(h => (
                  <div key={h} style={{ height: ROW_H }} className="relative">
                    <span className="absolute -top-1.5 right-1.5 font-display text-[10px] text-ink-muted">{h}:00</span>
                  </div>
                ))}
              </div>
              {/* day columns */}
              {dayDates.map((_, di) => (
                <div key={di} className={`relative border-l border-border ${di >= 5 ? 'bg-bg/40' : ''}`}>
                  {hours.map(h => <div key={h} style={{ height: ROW_H }} className="border-b border-border/60" />)}
                  {placed.filter(p => p.day === di).map(p => {
                    const color = colorOf(p.childId)
                    const top = (p.startH - hours[0]) * ROW_H
                    const height = Math.max(22, (p.endH - p.startH) * ROW_H - 3)
                    const conflict = overlapIds.has(p.instId)
                    const lay = dayLayouts[di]?.[p.instId] ?? { col: 0, cols: 1 }
                    const widthPct = 100 / lay.cols
                    return (
                      <button key={p.instId}
                        onClick={e => setOpen({ entry: p, rect: e.currentTarget.getBoundingClientRect() })}
                        className="absolute rounded-[7px] px-1.5 py-1 text-left overflow-hidden transition-shadow hover:shadow-md"
                        style={{ ...blockStyle(p.status, color, top, height), left: `calc(${lay.col * widthPct}% + 1px)`, width: `calc(${widthPct}% - 2px)` }}>
                        <div className="font-display text-[10.5px] font-semibold leading-tight truncate" style={{ color: textColor(p.status, color) }}>
                          {conflict && <span title="overlap">⚠ </span>}{p.title}
                        </div>
                        <div className="font-display text-[9.5px] text-ink-mid truncate">{fmtHour(p.startH)}–{fmtHour(p.endH)}</div>
                        {p.status === 'pending' && <div className="font-display text-[9px] font-semibold text-ink-mid mt-0.5">⏳ {t('statusPending')}</div>}
                        {p.status === 'waitlisted' && <div className="font-display text-[9px] font-semibold text-ink-mid mt-0.5">📋 {p.position ? `#${p.position}` : t('statusWaitlisted')}</div>}
                        {selected === 'all' && p.status === 'enrolled' && (
                          <div className="font-display text-[9px] font-semibold mt-0.5 truncate" style={{ color }}>● {p.childName}</div>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Unscheduled (entries without a fixed time — e.g. a listing missing its schedule) */}
      {hasAny && unscheduled.length > 0 && (
        <div className="mt-4 rounded-[12px] border border-border bg-white p-3">
          <div className="font-display text-[10px] font-bold uppercase tracking-[.1em] text-ink-muted mb-2">{t('unscheduled')}</div>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map(e => (
              <button key={e.id} onClick={ev => setOpen({ entry: e, rect: ev.currentTarget.getBoundingClientRect() })}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-[10px] border border-border hover:border-ink/30 transition-colors">
                <span className="w-2 h-2 rounded-full" style={{ background: colorOf(e.childId) }} />
                <span className="font-display text-[12px] font-semibold text-ink">{e.title}</span>
                <span className="font-display text-[10px] text-ink-muted">{e.childName}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popover */}
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[490]" onClick={() => setOpen(null)} />
          <div className="fixed z-[491] w-[250px] rounded-[12px] border border-border bg-white shadow-xl p-3"
            style={{ left: Math.min(open.rect.left, window.innerWidth - 266), top: Math.min(open.rect.bottom + 6, window.innerHeight - 230) }}
            onClick={e => e.stopPropagation()}>
            <Popover entry={open.entry} t={t} locale={locale} busy={busy}
              onContact={() => { if (open.entry.listingId) router.push(`/browse/${open.entry.listingId}`) }}
              onWithdraw={() => action(open.entry, 'withdraw')}
              onLeave={() => action(open.entry, 'leave')} />
          </div>
        </>, document.body)}

      {/* Toast */}
      {toast && createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[600] bg-ink text-white font-display text-[12.5px] font-semibold px-4 py-2.5 rounded-full shadow-xl">{toast}</div>,
        document.body)}
    </div>
  )
}

function LegendRow({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return <div className="flex items-center gap-2 font-display text-[11.5px] text-ink-mid">{swatch}{label}</div>
}

function blockStyle(status: CalendarStatus, color: string, top: number, height: number): React.CSSProperties {
  const base: React.CSSProperties = { top, height, borderLeft: `3px solid ${color}` }
  if (status === 'enrolled') return { ...base, background: `color-mix(in oklab, ${color} 14%, white)` }
  if (status === 'pending') return { ...base, background: '#fff', border: `1.5px dashed ${color}`, borderLeft: `3px solid ${color}` }
  // waitlisted — striped
  return { ...base, background: `repeating-linear-gradient(45deg, color-mix(in oklab, ${color} 12%, white), color-mix(in oklab, ${color} 12%, white) 5px, #fff 5px, #fff 10px)` }
}
function textColor(status: CalendarStatus, color: string): string {
  return status === 'enrolled' ? `color-mix(in oklab, ${color} 78%, black)` : '#1c1c27'
}

function Popover({ entry, t, locale, busy, onContact, onWithdraw, onLeave }: {
  entry: CalendarEntry; t: ReturnType<typeof useTranslations>; locale: 'ro' | 'en'; busy: boolean
  onContact: () => void; onWithdraw: () => void; onLeave: () => void
}) {
  const badge = entry.status === 'enrolled' ? { txt: `✓ ${t('badgeEnrolled')}`, cls: 'bg-success-lt text-success' }
              : entry.status === 'pending'  ? { txt: `⏳ ${t('badgePending')}`, cls: 'bg-info-lt text-info' }
              : { txt: `📋 ${t('badgeWaitlisted')}${entry.position ? ` · #${entry.position}` : ''}`, cls: 'bg-zinc-lt text-zinc' }
  const dayList = entry.days.map(d => t(`days.${d}` as 'days.0')).join(' · ')
  const timeStr = entry.timeStart && entry.timeEnd ? `${entry.timeStart}–${entry.timeEnd}` : ''

  return (
    <>
      <span className={`inline-block font-display text-[10px] font-bold uppercase tracking-[.06em] px-2 py-0.5 rounded-full mb-2 ${badge.cls}`}>{badge.txt}</span>
      <div className="font-display text-[13.5px] font-bold text-ink leading-tight">{entry.title}</div>
      <div className="font-display text-[11.5px] text-ink-muted mb-1.5">{entry.provider}{entry.provider && ' · '}{entry.childName}</div>
      {(dayList || timeStr) && (
        <div className="font-display text-[11px] text-ink-mid mb-2">{dayList}{timeStr && ` · ${timeStr}`}</div>
      )}

      {entry.status === 'enrolled' && (
        <div className="flex flex-col gap-1.5">
          <AddToCalendar entry={entry} locale={locale} t={t} />
          {entry.listingId && (
            <button onClick={onContact} className="w-full py-1.5 rounded-md font-display text-[11.5px] font-semibold border border-border text-ink-mid hover:bg-bg transition-colors">{t('contactProvider')}</button>
          )}
        </div>
      )}
      {entry.status === 'pending' && (
        <>
          <p className="font-display text-[11px] text-ink-muted mb-2 leading-snug">{t('pendingNote')}</p>
          <button disabled={busy} onClick={onWithdraw} className="w-full py-1.5 rounded-md font-display text-[11.5px] font-semibold border border-danger/30 text-danger hover:bg-danger-lt transition-colors disabled:opacity-50">{t('withdrawRequest')}</button>
        </>
      )}
      {entry.status === 'waitlisted' && (
        <>
          <p className="font-display text-[11px] text-ink-muted mb-2 leading-snug">{t('waitlistNote', { n: entry.position ?? 0 })}</p>
          <button disabled={busy} onClick={onLeave} className="w-full py-1.5 rounded-md font-display text-[11.5px] font-semibold border border-danger/30 text-danger hover:bg-danger-lt transition-colors disabled:opacity-50">{t('leaveList')}</button>
        </>
      )}
    </>
  )
}

function AddToCalendar({ entry, locale, t }: { entry: CalendarEntry; locale: 'ro' | 'en'; t: ReturnType<typeof useTranslations> }) {
  const [open, setOpen] = useState(false)
  const s = parseTime(entry.timeStart), e = parseTime(entry.timeEnd)
  if (s == null || e == null || entry.days.length === 0) return null
  const d0 = [...entry.days].sort((a, b) => a - b)[0]
  const calEvent = {
    title: `${entry.title} (kidvo)`,
    start: nextOccurrence(d0, s),
    end:   nextOccurrence(d0, e),
    organizer: entry.provider || null,
    locale,
    weeklyDays: entry.days,
  }
  const opts = [
    { k: 'google', label: t('atcGoogle'), go: () => window.open(googleCalendarUrl(calEvent), '_blank') },
    { k: 'apple',  label: t('atcApple'),  go: () => downloadIcs(calEvent) },
    { k: 'ics',    label: t('atcIcs'),    go: () => downloadIcs(calEvent) },
  ]
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="w-full py-1.5 rounded-md font-display text-[11.5px] font-semibold bg-primary text-white hover:bg-primary-deep transition-colors">{t('addToCalendar')}</button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 rounded-[10px] border border-border bg-white shadow-lg p-1 z-10">
          {opts.map(o => (
            <button key={o.k} onClick={() => { o.go(); setOpen(false) }} className="w-full text-left px-2.5 py-1.5 rounded font-display text-[11.5px] text-ink hover:bg-bg transition-colors">{o.label}</button>
          ))}
          <div className="px-2.5 py-1 font-display text-[10px] text-ink-muted">{t('recurNote')}</div>
        </div>
      )}
    </div>
  )
}
