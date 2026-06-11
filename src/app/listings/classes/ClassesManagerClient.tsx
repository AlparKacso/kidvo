'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

/* ── Types (mirror the server page selects) ── */
interface ClassRow {
  id: string; name: string; listing_id: string | null
  age_min: number | null; age_max: number | null; capacity: number | null
  days: number[]; time_start: string | null; time_end: string | null
  category?: { slug: string; accent_color: string } | null
}
interface MemberRow {
  id: string; class_id: string; source: 'kidvo' | 'trial' | 'offline'
  status: 'offered' | 'enrolled' | 'requested'
  waitlist_entry_id: string | null; child_name: string; child_age: number | null
  contact_name: string | null; contact_phone: string | null; contact_email: string | null
  note: string | null; created_at: string
}
interface PoolRow {
  id: string; listing_id: string; child_name: string; child_age: number | null
  preferred_days: number[]; note: string | null
  contact_name: string | null; contact_phone: string | null; contact_email: string | null
  created_at: string; listing?: { title: string } | null
}

interface Props {
  providerName: string
  classes: ClassRow[]
  members: MemberRow[]
  pool: PoolRow[]
}

type DetailTarget =
  | { kind: 'pool'; row: PoolRow }
  | { kind: 'member'; row: MemberRow }

export function ClassesManagerClient({ classes, members, pool }: Props) {
  const t = useTranslations('classes')
  const router = useRouter()

  const [groupBy, setGroupBy]   = useState<'age' | 'day' | 'none'>('age')
  const [detail,  setDetail]    = useState<DetailTarget | null>(null)
  const [offerFor, setOfferFor] = useState<PoolRow | null>(null)
  const [fullConfirm, setFullConfirm] = useState<{ entry: PoolRow; cls: ClassRow } | null>(null)
  const [addTo, setAddTo]       = useState<ClassRow | null>(null)
  const [newGroup, setNewGroup] = useState<{ founding: PoolRow | null } | null>(null)
  const [toast, setToast]       = useState<string | null>(null)
  const [busy, setBusy]         = useState(false)

  const occ = (classId: string) => members.filter(m => m.class_id === classId && (m.status === 'offered' || m.status === 'enrolled')).length

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3400)
  }

  async function api(url: string, opts: RequestInit): Promise<Response> {
    setBusy(true)
    try { return await fetch(url, opts) }
    finally { setBusy(false) }
  }

  /* ── Actions ── */
  async function doOffer(entry: PoolRow, cls: ClassRow, overCapacity = false) {
    const res = await api('/api/offers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waitlist_entry_id: entry.id, class_id: cls.id, over_capacity: overCapacity }),
    })
    if (res.status === 409) { setOfferFor(null); setFullConfirm({ entry, cls }); return }
    if (!res.ok) { showToast(t('errorGeneric')); return }
    setOfferFor(null); setFullConfirm(null); setDetail(null)
    showToast(t('offerSent', { child: entry.child_name }))
    router.refresh()
  }

  async function doAddStudent(cls: ClassRow, fields: Record<string, unknown>) {
    const res = await api(`/api/classes/${cls.id}/students`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
    })
    if (!res.ok) { showToast(t('errorGeneric')); return }
    setAddTo(null); showToast(t('studentAdded')); router.refresh()
  }

  async function doNewGroup(fields: Record<string, unknown>, founding: PoolRow | null) {
    const res = await api('/api/classes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
    })
    if (!res.ok) { showToast(t('errorGeneric')); return }
    const data = await res.json()
    setNewGroup(null)
    if (founding && data.class?.id) {
      await doOffer(founding, data.class as ClassRow, true)
    } else {
      showToast(t('groupCreated')); router.refresh()
    }
  }

  async function doMember(memberId: string, body: Record<string, unknown>, msg: string) {
    const res = await api(`/api/roster-members/${memberId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (!res.ok) { showToast(t('errorGeneric')); return }
    setDetail(null); showToast(msg); router.refresh()
  }

  async function doConfirmRequest(memberId: string) {
    const res = await api(`/api/roster-members/${memberId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'confirm' }),
    })
    if (!res.ok) { showToast(t('errorGeneric')); return }
    showToast(t('requestConfirmedToast')); router.refresh()
  }

  async function doDeclineRequest(memberId: string) {
    const res = await api(`/api/roster-members/${memberId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'decline_request' }),
    })
    if (!res.ok) { showToast(t('errorGeneric')); return }
    showToast(t('requestDeclinedToast')); router.refresh()
  }

  async function doRemove(memberId: string, decline: boolean, msg: string) {
    const res = await api(`/api/roster-members/${memberId}${decline ? '?decline=1' : ''}`, { method: 'DELETE' })
    if (!res.ok) { showToast(t('errorGeneric')); return }
    setDetail(null); showToast(msg); router.refresh()
  }

  async function doRemovePool(entryId: string, decline: boolean) {
    const res = await api(`/api/waitlist/${entryId}${decline ? '?decline=1' : ''}`, { method: 'DELETE' })
    if (!res.ok) { showToast(t('errorGeneric')); return }
    setDetail(null); showToast(t('removedToast')); router.refresh()
  }

  /* ── Pool grouping ── */
  function ageBand(age: number | null): string {
    if (age == null) return t('anyAge')
    if (age <= 5)  return '3–5'
    if (age <= 8)  return '6–8'
    if (age <= 11) return '9–11'
    return '12+'
  }
  const poolGroups: { label: string; rows: PoolRow[] }[] = (() => {
    if (groupBy === 'none') return [{ label: '', rows: pool }]
    const map = new Map<string, PoolRow[]>()
    for (const row of pool) {
      const keys = groupBy === 'age'
        ? [ageBand(row.child_age)]
        : (row.preferred_days.length ? row.preferred_days.map(d => t(`days.${d}` as 'days.0')) : [t('anyDay')])
      for (const k of keys) { if (!map.has(k)) map.set(k, []); map.get(k)!.push(row) }
    }
    return [...map.entries()].map(([label, rows]) => ({ label, rows }))
  })()

  const fullCount = classes.filter(c => c.capacity != null && occ(c.id) >= c.capacity).length

  return (
    <div className="pb-10">
      {/* Header — stacks on mobile so the title + stat line get full width
          (the new-group button no longer squeezes them onto extra rows). */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4 mb-5">
        <div className="min-w-0">
          <div className="font-display text-[10.5px] font-bold tracking-[.12em] uppercase text-primary mb-1">{t('eyebrow')}</div>
          <h1 className="font-display text-[24px] font-extrabold tracking-[-0.5px] text-ink">{t('title')}</h1>
          <div className="font-display text-[12.5px] text-ink-muted mt-1 whitespace-nowrap">
            {t('statLine', { waiting: pool.length, classes: classes.length, full: fullCount })}
          </div>
        </div>
        <button
          onClick={() => setNewGroup({ founding: null })}
          className="self-start flex-shrink-0 inline-flex items-center gap-1.5 font-display text-sm font-bold px-4 py-2.5 rounded-full text-white hover:opacity-90 transition-opacity"
          style={{ background: '#1c1c27' }}
        >
          <span className="text-base leading-none">+</span> {t('startGroup')}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="inline-flex items-center gap-1 p-0.5 rounded-full border border-border bg-white">
          {(['age', 'day', 'none'] as const).map(g => (
            <button key={g} onClick={() => setGroupBy(g)}
              className={cn('font-display text-[12px] font-semibold px-3 py-1.5 rounded-full transition-colors',
                groupBy === g ? 'bg-ink text-white' : 'text-ink-mid hover:text-ink')}>
              {t(`groupBy_${g}` as 'groupBy_age')}
            </button>
          ))}
        </div>
        <span className="font-display text-[11.5px] text-ink-muted">{t('hint')}</span>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {/* Waiting pool */}
        <section className="flex-shrink-0 w-[260px] rounded-[18px] border-[1.5px] border-border bg-white/60 p-3">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="font-display text-[13px] font-bold text-ink">{t('waitingPool')}</span>
            <span className="font-display text-[11px] font-bold px-2 py-0.5 rounded-full bg-gold-lt text-gold-text">{pool.length}</span>
          </div>
          {pool.length === 0 ? (
            <div className="text-center py-8 px-3 font-display text-[12px] text-ink-muted">{t('poolEmpty')}</div>
          ) : (
            <div className="flex flex-col gap-3">
              {poolGroups.map(group => (
                <div key={group.label || 'all'}>
                  {group.label && (
                    <div className="font-display text-[10px] font-bold tracking-[.08em] uppercase text-ink-muted px-1 mb-1.5">{group.label}</div>
                  )}
                  <div className="flex flex-col gap-2">
                    {group.rows.map(row => (
                      <PoolCard key={row.id} row={row} t={t}
                        onOpen={() => setDetail({ kind: 'pool', row })}
                        onOffer={() => setOfferFor(row)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Class columns */}
        {classes.map(cls => {
          const roster = members.filter(m => m.class_id === cls.id)
          const occupancy = occ(cls.id)
          const cap = cls.capacity
          const state = cap == null ? 'none' : occupancy > cap ? 'over' : occupancy === cap ? 'full' : 'open'
          const barColor = state === 'over' ? '#f5c542' : state === 'full' ? '#C0392B' : '#1A7A4A'
          const accent = cls.category?.accent_color ?? '#7c3aed'
          return (
            <section key={cls.id} className="flex-shrink-0 w-[260px] rounded-[18px] border border-border bg-white p-3 flex flex-col" style={{ boxShadow: '0 2px 12px rgba(124,58,237,.06)' }}>
              <div className="px-1 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: accent }} />
                  <span className="font-display text-[13px] font-bold text-ink truncate flex-1">{cls.name}</span>
                  <span className={cn('font-display text-[9px] font-bold uppercase tracking-[.06em] px-1.5 py-0.5 rounded',
                    cls.listing_id ? 'bg-primary-lt text-primary' : 'bg-zinc-lt text-zinc')}>
                    {cls.listing_id ? t('tagListed') : t('tagManual')}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-display text-[11px] text-ink-muted">
                    {cap != null ? `${occupancy}/${cap}` : occupancy} · {t('enrolledLabel')}
                  </span>
                </div>
                {cap != null && (
                  <div className="h-[6px] rounded-full overflow-hidden" style={{ background: '#ece8f5' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (occupancy / Math.max(cap, 1)) * 100)}%`, background: barColor }} />
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-2 min-h-[40px]">
                {roster.length === 0 ? (
                  <div className="text-center py-6 px-2 font-display text-[11.5px] text-ink-muted">{t('rosterEmpty')}</div>
                ) : roster.map(m => (
                  <KidCard key={m.id} member={m} t={t}
                    onOpen={() => setDetail({ kind: 'member', row: m })}
                    onConfirm={() => doConfirmRequest(m.id)}
                    onDecline={() => doDeclineRequest(m.id)} />
                ))}
              </div>

              <div className="mt-3 flex flex-col gap-1.5 pt-2 border-t border-border">
                {!cls.listing_id && (
                  <button onClick={() => router.push(`/listings/classes/${cls.id}/quick-start`)}
                    className="font-display text-[12px] font-semibold text-primary hover:bg-primary-lt rounded-lg py-1.5 transition-colors">
                    {t('turnIntoListing')}
                  </button>
                )}
                <button onClick={() => setAddTo(cls)}
                  className="font-display text-[12px] font-semibold text-ink-mid hover:bg-surface rounded-lg py-1.5 transition-colors">
                  + {t('addStudent')}
                </button>
              </div>
            </section>
          )
        })}

        {/* New group column */}
        <button onClick={() => setNewGroup({ founding: null })}
          className="flex-shrink-0 w-[200px] rounded-[18px] border-2 border-dashed border-border-mid text-ink-muted hover:border-primary hover:text-primary transition-colors flex flex-col items-center justify-center gap-2 py-10">
          <span className="text-2xl leading-none">+</span>
          <span className="font-display text-[12.5px] font-semibold">{t('newGroup')}</span>
        </button>
      </div>

      {/* ── Detail modal ── */}
      {detail && (
        <DetailModal target={detail} t={t}
          onClose={() => setDetail(null)}
          onOffer={() => { if (detail.kind === 'pool') { setOfferFor(detail.row); setDetail(null) } }}
          onMove={(classId) => detail.kind === 'member' && doMember(detail.row.id, { action: 'move', class_id: classId }, t('movedToast'))}
          onReturnToPool={() => detail.kind === 'member' && doMember(detail.row.id, { action: 'return_to_pool' }, t('returnedToast'))}
          onRemove={(decline) => {
            if (detail.kind === 'member') doRemove(detail.row.id, decline, t('removedToast'))
            else doRemovePool(detail.row.id, decline)
          }}
          classes={classes} occ={occ} busy={busy} />
      )}

      {/* ── Offer picker ── */}
      {offerFor && (
        <OfferPicker entry={offerFor} classes={classes} occ={occ} t={t} busy={busy}
          onClose={() => setOfferFor(null)}
          onPick={(cls) => doOffer(offerFor, cls)}
          onNewGroup={() => { const f = offerFor; setOfferFor(null); setNewGroup({ founding: f }) }} />
      )}

      {/* ── Full-class confirm ── */}
      {fullConfirm && (
        <FullConfirm entry={fullConfirm.entry} cls={fullConfirm.cls} t={t} busy={busy}
          onClose={() => setFullConfirm(null)}
          onOverCapacity={() => doOffer(fullConfirm.entry, fullConfirm.cls, true)}
          onNewGroup={() => { const f = fullConfirm.entry; setFullConfirm(null); setNewGroup({ founding: f }) }} />
      )}

      {/* ── Add student ── */}
      {addTo && (
        <AddStudentModal cls={addTo} t={t} busy={busy}
          onClose={() => setAddTo(null)}
          onSubmit={(fields) => doAddStudent(addTo, fields)} />
      )}

      {/* ── New group ── */}
      {newGroup && (
        <NewGroupModal founding={newGroup.founding} t={t} busy={busy}
          onClose={() => setNewGroup(null)}
          onSubmit={(fields) => doNewGroup(fields, newGroup.founding)} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[600] px-4 py-2.5 rounded-full text-white font-display text-[13px] font-semibold shadow-lg" style={{ background: '#1c1c27' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── sub-components ───────────────────────── */

type T = ReturnType<typeof useTranslations>

function PoolCard({ row, t, onOpen, onOffer }: { row: PoolRow; t: T; onOpen: () => void; onOffer: () => void }) {
  return (
    <div className="rounded-[12px] border border-border bg-white p-2.5 hover:border-primary/40 transition-colors cursor-pointer" onClick={onOpen}>
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-gold-lt flex items-center justify-center font-display text-[11px] font-bold text-gold-text flex-shrink-0">
          {row.child_name.slice(0, 1).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-display text-[12.5px] font-semibold text-ink truncate">{row.child_name}</div>
          <div className="font-display text-[10.5px] text-ink-muted truncate">
            {row.child_age != null ? t('ageN', { n: row.child_age }) : t('anyAge')}
            {row.preferred_days.length ? ` · ${row.preferred_days.map(d => t(`days.${d}` as 'days.0')).join(' ')}` : ''}
          </div>
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onOffer() }}
        className="mt-2 w-full font-display text-[11.5px] font-semibold text-primary bg-primary-lt hover:bg-primary hover:text-white rounded-lg py-1.5 transition-colors">
        {t('offerSpot')}
      </button>
    </div>
  )
}

function KidCard({ member, t, onOpen, onConfirm, onDecline }: {
  member: MemberRow; t: T; onOpen: () => void; onConfirm: () => void; onDecline: () => void
}) {
  const offered   = member.status === 'offered'
  const requested = member.status === 'requested'
  const bg = offered ? '#fffdf5' : requested ? '#eef6ff' : member.status === 'enrolled' ? '#f0faf4' : '#fff'
  const border = offered ? 'border-gold/50' : requested ? 'border-info/40' : member.status === 'enrolled' ? 'border-success/30' : 'border-border'
  return (
    <div className={cn('rounded-[12px] border bg-white p-2.5 cursor-pointer hover:shadow-sm transition-shadow', border)} style={{ background: bg }} onClick={onOpen}>
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-primary-lt flex items-center justify-center font-display text-[11px] font-bold text-primary flex-shrink-0">
          {member.child_name.slice(0, 1).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-display text-[12.5px] font-semibold text-ink truncate">{member.child_name}</div>
          <div className="font-display text-[10.5px] text-ink-muted truncate">
            {member.child_age != null ? t('ageN', { n: member.child_age }) : ''}
          </div>
        </div>
        {member.source === 'trial'   && <span className="font-display text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-info-lt text-info">{t('srcTrial')}</span>}
        {member.source === 'offline' && <span className="font-display text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-zinc-lt text-zinc">{t('srcOffline')}</span>}
      </div>
      {offered && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gold pulse-gold" />
          <span className="font-display text-[10.5px] font-semibold text-gold-text">{t('awaitingReply')}</span>
        </div>
      )}
      {requested && (
        <div className="mt-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-info" />
            <span className="font-display text-[10.5px] font-semibold text-info">{t('requestPending')}</span>
          </div>
          <div className="flex gap-1.5">
            <button onClick={e => { e.stopPropagation(); onConfirm() }}
              className="flex-1 py-1.5 rounded-md font-display text-[11px] font-semibold bg-success text-white hover:opacity-90 transition-opacity">
              {t('confirmRequest')}
            </button>
            <button onClick={e => { e.stopPropagation(); onDecline() }}
              className="flex-1 py-1.5 rounded-md font-display text-[11px] font-semibold border border-border text-ink-mid hover:bg-white transition-colors">
              {t('declineRequest')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ModalShell({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[550] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={cn('relative z-10 bg-white rounded-[18px] shadow-xl w-full p-6 max-h-[90vh] overflow-y-auto', wide ? 'max-w-[520px]' : 'max-w-[440px]')} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded flex items-center justify-center text-ink-muted hover:bg-surface transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
        {children}
      </div>
    </div>
  )
}

function CopyPhone({ phone, t }: { phone: string; t: T }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <a href={`tel:${phone}`} className="font-display text-[13px] font-semibold text-primary">{phone}</a>
      <button onClick={() => { navigator.clipboard?.writeText(phone); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
        className="font-display text-[11px] font-semibold text-ink-muted hover:text-ink">
        {copied ? t('copied') : t('copy')}
      </button>
    </div>
  )
}

function DetailModal({ target, t, onClose, onOffer, onMove, onReturnToPool, onRemove, classes, occ, busy }: {
  target: DetailTarget; t: T; onClose: () => void; onOffer: () => void
  onMove: (classId: string) => void; onReturnToPool: () => void; onRemove: (decline: boolean) => void
  classes: ClassRow[]; occ: (id: string) => number; busy: boolean
}) {
  const [moveOpen, setMoveOpen] = useState(false)
  const isPool = target.kind === 'pool'
  const r = target.row as PoolRow & MemberRow
  const age = r.child_age
  const phone = r.contact_phone
  const joined = new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const days = isPool ? (target.row as PoolRow).preferred_days : []

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center gap-3 mb-4">
        <span className="w-11 h-11 rounded-full bg-primary-lt flex items-center justify-center font-display text-[15px] font-bold text-primary">{r.child_name.slice(0, 1).toUpperCase()}</span>
        <div>
          <div className="font-display text-[17px] font-bold text-ink">{r.child_name}</div>
          <div className="font-display text-[12px] text-ink-muted">{age != null ? t('ageN', { n: age }) : t('anyAge')}</div>
        </div>
      </div>

      <div className="rounded-[12px] bg-surface border border-border divide-y divide-border mb-4">
        {days.length > 0 && <Row label={t('preferredDays')} value={days.map(d => t(`days.${d}` as 'days.0')).join(', ')} />}
        {r.contact_name  && <Row label={t('parent')} value={r.contact_name} />}
        {phone && <RowNode label={t('phone')}><CopyPhone phone={phone} t={t} /></RowNode>}
        {r.contact_email && <RowNode label={t('email')}><a href={`mailto:${r.contact_email}`} className="font-display text-[13px] text-primary break-all">{r.contact_email}</a></RowNode>}
        <Row label={t('joined')} value={joined} />
        {!isPool && <Row label={t('source')} value={t(`src_${(target.row as MemberRow).source}` as 'src_kidvo')} />}
        {r.note && <RowNode label={t('note')}><span className="font-display text-[12.5px] text-ink italic">{r.note}</span></RowNode>}
      </div>

      {/* Actions */}
      {isPool ? (
        <div className="flex flex-col gap-2">
          <button onClick={onOffer} disabled={busy} className="w-full py-2.5 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-50 transition-colors">{t('offerSpot')}</button>
          <button onClick={() => onRemove(true)} disabled={busy} className="w-full py-2 rounded font-display text-[13px] font-semibold text-danger hover:bg-danger-lt disabled:opacity-50 transition-colors">{t('removeFromPlatform')}</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {!moveOpen ? (
            <button onClick={() => setMoveOpen(true)} disabled={busy} className="w-full py-2 rounded font-display text-[13px] font-semibold border border-border text-ink-mid hover:bg-surface disabled:opacity-50 transition-colors">{t('moveClass')}</button>
          ) : (
            <div className="rounded-[12px] border border-border p-2 flex flex-col gap-1">
              <div className="font-display text-[11px] font-semibold text-ink-muted px-1 py-0.5">{t('moveTo')}</div>
              {classes.filter(c => c.id !== (target.row as MemberRow).class_id).map(c => (
                <button key={c.id} onClick={() => onMove(c.id)} disabled={busy}
                  className="text-left font-display text-[12.5px] text-ink hover:bg-surface rounded px-2 py-1.5 flex items-center justify-between">
                  <span className="truncate">{c.name}</span>
                  <span className="text-ink-muted text-[11px]">{c.capacity != null ? `${occ(c.id)}/${c.capacity}` : occ(c.id)}</span>
                </button>
              ))}
            </div>
          )}
          <button onClick={onReturnToPool} disabled={busy} className="w-full py-2 rounded font-display text-[13px] font-semibold border border-border text-ink-mid hover:bg-surface disabled:opacity-50 transition-colors">{t('returnToPool')}</button>
          <button onClick={() => onRemove(false)} disabled={busy} className="w-full py-2 rounded font-display text-[13px] font-semibold text-danger hover:bg-danger-lt disabled:opacity-50 transition-colors">{t('removeFromPlatform')}</button>
        </div>
      )}
    </ModalShell>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return <RowNode label={label}><span className="font-display text-[13px] text-ink">{value}</span></RowNode>
}
function RowNode({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2">
      <span className="font-display text-[10px] font-bold tracking-[.06em] uppercase text-ink-muted w-[88px] flex-shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function OfferPicker({ entry, classes, occ, t, busy, onClose, onPick, onNewGroup }: {
  entry: PoolRow; classes: ClassRow[]; occ: (id: string) => number; t: T; busy: boolean
  onClose: () => void; onPick: (cls: ClassRow) => void; onNewGroup: () => void
}) {
  return (
    <ModalShell onClose={onClose}>
      <h2 className="font-display text-[17px] font-bold text-ink mb-0.5">{t('offerTitle', { child: entry.child_name })}</h2>
      <p className="font-display text-[12.5px] text-ink-muted mb-4">{t('offerSub')}</p>
      <div className="flex flex-col gap-1.5 mb-4">
        {classes.length === 0 && <div className="font-display text-[12.5px] text-ink-muted py-4 text-center">{t('noClassesYet')}</div>}
        {classes.map(c => {
          const o = occ(c.id); const full = c.capacity != null && o >= c.capacity
          return (
            <button key={c.id} onClick={() => onPick(c)} disabled={busy}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-[12px] border border-border hover:border-primary hover:bg-primary-lt disabled:opacity-50 transition-colors">
              <span className="font-display text-[13px] font-semibold text-ink truncate">{c.name}</span>
              <span className={cn('font-display text-[11px] font-bold flex-shrink-0', full ? 'text-danger' : 'text-success')}>
                {c.capacity != null ? `${o}/${c.capacity}` : o}{full ? ` · ${t('full')}` : ''}
              </span>
            </button>
          )
        })}
      </div>
      <button onClick={onNewGroup} disabled={busy}
        className="w-full py-2.5 rounded font-display text-[13px] font-semibold border-2 border-dashed border-border-mid text-ink-mid hover:border-primary hover:text-primary transition-colors">
        + {t('newGroupFor', { child: entry.child_name })}
      </button>
    </ModalShell>
  )
}

function FullConfirm({ entry, cls, t, busy, onClose, onOverCapacity, onNewGroup }: {
  entry: PoolRow; cls: ClassRow; t: T; busy: boolean
  onClose: () => void; onOverCapacity: () => void; onNewGroup: () => void
}) {
  return (
    <ModalShell onClose={onClose}>
      <div className="text-2xl mb-2">⚠️</div>
      <h2 className="font-display text-[17px] font-bold text-ink mb-1">{t('fullTitle', { class: cls.name })}</h2>
      <p className="font-display text-[13px] text-ink-mid mb-5">{t('fullSub', { child: entry.child_name })}</p>
      <div className="flex flex-col gap-2">
        <button onClick={onOverCapacity} disabled={busy} className="w-full py-2.5 rounded font-display text-sm font-semibold bg-gold text-ink hover:opacity-90 disabled:opacity-50 transition-opacity">{t('offerAnyway')}</button>
        <button onClick={onNewGroup} disabled={busy} className="w-full py-2.5 rounded font-display text-sm font-semibold border border-border text-ink-mid hover:bg-surface disabled:opacity-50 transition-colors">{t('startNewGroupInstead')}</button>
        <button onClick={onClose} disabled={busy} className="w-full py-2 rounded font-display text-[13px] font-semibold text-ink-muted hover:bg-surface transition-colors">{t('cancel')}</button>
      </div>
    </ModalShell>
  )
}

function AddStudentModal({ cls, t, busy, onClose, onSubmit }: {
  cls: ClassRow; t: T; busy: boolean; onClose: () => void; onSubmit: (fields: Record<string, unknown>) => void
}) {
  const [name, setName] = useState(''); const [age, setAge] = useState('')
  const [parent, setParent] = useState(''); const [phone, setPhone] = useState(''); const [note, setNote] = useState('')
  return (
    <ModalShell onClose={onClose}>
      <h2 className="font-display text-[17px] font-bold text-ink mb-0.5">{t('addStudentTitle')}</h2>
      <p className="font-display text-[12.5px] text-ink-muted mb-4">{cls.name}</p>
      <div className="flex flex-col gap-3">
        <Field label={t('childName')}><input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder={t('childNamePlaceholder')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('age')}><input value={age} onChange={e => setAge(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" className={inputCls} placeholder="—" /></Field>
          <Field label={t('parent')}><input value={parent} onChange={e => setParent(e.target.value)} className={inputCls} placeholder={t('optional')} /></Field>
        </div>
        <Field label={t('phone')}><input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder={t('optional')} /></Field>
        <Field label={t('note')}><textarea rows={2} value={note} onChange={e => setNote(e.target.value)} className={cn(inputCls, 'resize-none')} placeholder={t('optional')} /></Field>
      </div>
      <div className="flex gap-2 mt-5">
        <button onClick={onClose} className="flex-1 py-2.5 rounded font-display text-sm font-semibold border border-border text-ink-mid hover:bg-surface transition-colors">{t('cancel')}</button>
        <button onClick={() => onSubmit({ child_name: name.trim(), child_age: Number(age) || null, contact_name: parent.trim() || null, contact_phone: phone.trim() || null, note: note.trim() || null })}
          disabled={busy || !name.trim()} className="flex-1 py-2.5 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-50 transition-colors">{t('add')}</button>
      </div>
    </ModalShell>
  )
}

function NewGroupModal({ founding, t, busy, onClose, onSubmit }: {
  founding: PoolRow | null; t: T; busy: boolean; onClose: () => void; onSubmit: (fields: Record<string, unknown>) => void
}) {
  const [name, setName] = useState(founding ? '' : '')
  const [ageMin, setAgeMin] = useState(''); const [ageMax, setAgeMax] = useState('')
  const [days, setDays] = useState<number[]>([]); const [start, setStart] = useState(''); const [end, setEnd] = useState('')
  const [cap, setCap] = useState('')
  const toggle = (d: number) => setDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])
  return (
    <ModalShell onClose={onClose}>
      <h2 className="font-display text-[17px] font-bold text-ink mb-0.5">{t('newGroupTitle')}</h2>
      {founding && <p className="font-display text-[12.5px] text-ink-muted mb-4">{t('foundingMember', { child: founding.child_name })}</p>}
      <div className="flex flex-col gap-3 mt-1">
        <Field label={t('groupName')}><input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder={t('groupNamePlaceholder')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('ageMin')}><input value={ageMin} onChange={e => setAgeMin(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" className={inputCls} placeholder="—" /></Field>
          <Field label={t('ageMax')}><input value={ageMax} onChange={e => setAgeMax(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" className={inputCls} placeholder="—" /></Field>
        </div>
        <Field label={t('daysLabel')}>
          <div className="flex flex-wrap gap-1.5">
            {[0,1,2,3,4,5,6].map(d => (
              <button key={d} type="button" onClick={() => toggle(d)}
                className={cn('px-2.5 py-1 rounded-full border font-display text-[11px] font-semibold transition-all',
                  days.includes(d) ? 'bg-primary border-primary text-white' : 'bg-white border-border text-ink-mid hover:border-primary')}>
                {t(`days.${d}` as 'days.0')}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('startTime')}><input value={start} onChange={e => setStart(e.target.value)} className={inputCls} placeholder="16:00" /></Field>
          <Field label={t('endTime')}><input value={end} onChange={e => setEnd(e.target.value)} className={inputCls} placeholder="17:00" /></Field>
          <Field label={t('capacity')}><input value={cap} onChange={e => setCap(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" className={inputCls} placeholder="—" /></Field>
        </div>
      </div>
      <div className="flex gap-2 mt-5">
        <button onClick={onClose} className="flex-1 py-2.5 rounded font-display text-sm font-semibold border border-border text-ink-mid hover:bg-surface transition-colors">{t('cancel')}</button>
        <button onClick={() => onSubmit({ name: name.trim(), age_min: Number(ageMin) || null, age_max: Number(ageMax) || null, days, time_start: start.trim() || null, time_end: end.trim() || null, capacity: Number(cap) || null })}
          disabled={busy || !name.trim()} className="flex-1 py-2.5 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-50 transition-colors">{t('createGroup')}</button>
      </div>
    </ModalShell>
  )
}

const inputCls = 'w-full px-3 py-2 border border-border rounded bg-bg font-body text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary transition-all'
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1.5">{label}</label>
      {children}
    </div>
  )
}
