'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { categoryEmoji } from '@/lib/eventDate'

/* ── Types (mirror the server page selects) ── */
interface ClassRow {
  id: string; name: string; listing_id: string | null
  age_min: number | null; age_max: number | null; capacity: number | null
  days: number[]; time_start: string | null; time_end: string | null
  category?: { slug: string; accent_color: string } | null
}
interface ListingDetail {
  id: string; title: string; status: string
  price_monthly: number | null; pricing_type: 'month' | 'session'
  age_min: number | null; age_max: number | null
  spots_total: number | null; spots_available: number | null
  cover_image_url: string | null
  category?: { slug: string; name: string; accent_color: string } | null
  area?: { name: string } | null
  schedules?: { day_of_week: number; time_start: string; time_end: string }[]
}
interface TrialReq {
  id: string; listing_id: string; child_name: string; child_age: number | null
  parent_name: string | null; preferred_day: number | null; created_at: string
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
  listings: ListingDetail[]
  trialRequests: TrialReq[]
}

type DetailTarget =
  | { kind: 'pool'; row: PoolRow }
  | { kind: 'member'; row: MemberRow }

export function ClassesManagerClient({ classes, members, pool, listings, trialRequests }: Props) {
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

  // Docked panel state.
  const [selectedClassId, setSelectedClassId] = useState<string | null>(classes[0]?.id ?? null)
  const [pickerOpen, setPickerOpen]     = useState(false)
  const [detachConfirm, setDetachConfirm] = useState<string | null>(null)
  // Session-only memory of where a class WAS listed before it was unlisted in
  // this session, so "Re-list this group" can restore it with one click. (There
  // is no DB column for the prior listing — a refresh just shows it as manual.)
  const [detachedFrom, setDetachedFrom] = useState<Record<string, string>>({})
  const [deleteGroup, setDeleteGroup] = useState<ClassRow | null>(null)
  const [renameFor, setRenameFor] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const selectedClass = classes.find(c => c.id === selectedClassId) ?? classes[0] ?? null

  function selectClass(id: string) {
    setSelectedClassId(id)
    setPickerOpen(false)
    setDetachConfirm(null)
  }

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

  async function patchClassListing(classId: string, listingId: string | null): Promise<boolean> {
    const res = await api(`/api/classes/${classId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listing_id: listingId }),
    })
    return res.ok
  }

  // Unlist (detach) a live group from its public listing. Enrolled kids stay;
  // remember where it was so "Re-list" can restore it this session.
  async function doUnlist(cls: ClassRow) {
    const prior = cls.listing_id
    if (!(await patchClassListing(cls.id, null))) { showToast(t('errorGeneric')); return }
    if (prior) setDetachedFrom(m => ({ ...m, [cls.id]: prior }))
    setDetachConfirm(null); showToast(t('classUnpublished')); router.refresh()
  }

  // Restore an unlisted group to exactly the listing it came from (safe → no confirm).
  async function doRelist(cls: ClassRow) {
    const prior = detachedFrom[cls.id]
    if (!prior) return
    if (!(await patchClassListing(cls.id, prior))) { showToast(t('errorGeneric')); return }
    setDetachedFrom(m => { const n = { ...m }; delete n[cls.id]; return n })
    showToast(t('relistedToast', { class: cls.name })); router.refresh()
  }

  // Front a (manual / detached) group under one of the provider's other listings.
  async function doAttach(cls: ClassRow, listing: ListingDetail) {
    if (!(await patchClassListing(cls.id, listing.id))) { showToast(t('errorGeneric')); return }
    setDetachedFrom(m => { const n = { ...m }; delete n[cls.id]; return n })
    setPickerOpen(false); showToast(t('attachedToast', { class: cls.name, listing: listing.title })); router.refresh()
  }

  // Confirm a trial request from the docked panel → enrols the child into THIS class.
  async function doConfirmTrial(trialId: string, cls: ClassRow, childName: string) {
    const res = await api(`/api/trial-requests/${trialId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm', class_id: cls.id }),
    })
    if (!res.ok) { showToast(t('errorGeneric')); return }
    showToast(t('trialConfirmedToast', { child: childName, class: cls.name })); router.refresh()
  }

  async function doDeclineTrial(trialId: string) {
    const res = await api(`/api/trial-requests/${trialId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decline' }),
    })
    if (!res.ok) { showToast(t('errorGeneric')); return }
    showToast(t('requestDeclinedToast')); router.refresh()
  }

  // Rename a group (PATCH the class name).
  async function doRenameGroup(cls: ClassRow) {
    const name = renameValue.trim()
    if (!name || name === cls.name) { setRenameFor(null); return }
    const res = await api(`/api/classes/${cls.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    })
    if (!res.ok) { showToast(t('errorGeneric')); return }
    setRenameFor(null); showToast(t('groupRenamedToast')); router.refresh()
  }

  // Delete a whole group. Roster + offers cascade; the listing (if any) stays.
  async function doDeleteGroup(cls: ClassRow) {
    const res = await api(`/api/classes/${cls.id}`, { method: 'DELETE' })
    if (!res.ok) { showToast(t('errorGeneric')); return }
    setDeleteGroup(null)
    if (selectedClassId === cls.id) setSelectedClassId(null)
    showToast(t('groupDeletedToast', { group: cls.name })); router.refresh()
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
          <h1 className="font-display text-[20px] md:text-[24px] font-extrabold tracking-[-0.5px] text-ink">{t('title')}</h1>
          <div className="font-display text-[12.5px] text-ink-muted mt-1 whitespace-nowrap">
            {t('statLine', { waiting: pool.length, classes: classes.length, full: fullCount })}
          </div>
        </div>
        <button
          onClick={() => setNewGroup({ founding: null })}
          className="self-end md:self-start flex-shrink-0 inline-flex items-center gap-1.5 font-display text-sm font-bold px-4 py-2.5 rounded-full text-white hover:opacity-90 transition-opacity"
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
          const isSelected = selectedClass?.id === cls.id
          return (
            <section key={cls.id}
              className={cn('flex-shrink-0 w-[260px] rounded-[18px] bg-white p-3 flex flex-col transition-shadow',
                isSelected ? 'border-[1.5px] border-primary' : 'border border-border')}
              style={{ boxShadow: isSelected ? '0 0 0 3px rgba(124,58,237,.10)' : '0 2px 12px rgba(124,58,237,.06)' }}>
              <div className="px-1 mb-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <button type="button" onClick={() => selectClass(cls.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: accent }} />
                    <span className="font-display text-[13px] font-bold text-ink truncate">{cls.name}</span>
                  </button>
                  <span className={cn('font-display text-[9px] font-bold uppercase tracking-[.06em] px-1.5 py-0.5 rounded flex-shrink-0',
                    cls.listing_id ? 'bg-primary-lt text-primary' : 'bg-zinc-lt text-zinc')}>
                    {cls.listing_id ? t('tagListed') : t('tagManual')}
                  </span>
                  <GroupMenu t={t} listed={!!cls.listing_id}
                    onAddStudent={() => setAddTo(cls)}
                    onRename={() => { setRenameValue(cls.name); setRenameFor(cls.id) }}
                    onTurnIntoListing={() => router.push(`/listings/classes/${cls.id}/quick-start`)}
                    onDelete={() => setDeleteGroup(cls)} />
                </div>
                <button type="button" onClick={() => selectClass(cls.id)} className="block w-full text-left">
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
                </button>
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

      {/* ── Docked listing panel — the public listing for the selected group ── */}
      {selectedClass && (
        <DockedListingPanel
          cls={selectedClass} t={t} busy={busy}
          listing={selectedClass.listing_id ? listings.find(l => l.id === selectedClass.listing_id) ?? null : null}
          detachedListing={detachedFrom[selectedClass.id] ? listings.find(l => l.id === detachedFrom[selectedClass.id]) ?? null : null}
          otherListings={listings.filter(l => l.id !== selectedClass.listing_id && l.status === 'active')}
          trials={trialRequests.filter(r => r.listing_id === selectedClass.listing_id)}
          pickerOpen={pickerOpen} setPickerOpen={setPickerOpen}
          detachConfirm={detachConfirm === selectedClass.id} setDetachConfirm={(on) => setDetachConfirm(on ? selectedClass.id : null)}
          onConfirmTrial={(trialId, childName) => doConfirmTrial(trialId, selectedClass, childName)}
          onDeclineTrial={doDeclineTrial}
          onUnlist={() => doUnlist(selectedClass)}
          onRelist={() => doRelist(selectedClass)}
          onAttach={(listing) => doAttach(selectedClass, listing)}
          onEdit={(listingId) => router.push(`/listings/${listingId}/edit`)}
          onPreview={(listingId) => router.push(`/browse/${listingId}`)}
          onPublishNew={() => router.push(`/listings/classes/${selectedClass.id}/quick-start`)}
        />
      )}

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

      {/* ── Rename group ── */}
      {renameFor && (() => {
        const c = classes.find(x => x.id === renameFor)
        return c ? (
          <RenameGroupModal t={t} busy={busy} value={renameValue} setValue={setRenameValue}
            onClose={() => setRenameFor(null)} onSave={() => doRenameGroup(c)} />
        ) : null
      })()}

      {/* ── Delete group confirm ── */}
      {deleteGroup && (
        <DeleteGroupConfirm cls={deleteGroup} enrolled={occ(deleteGroup.id)} listed={!!deleteGroup.listing_id} t={t} busy={busy}
          onClose={() => setDeleteGroup(null)}
          onConfirm={() => doDeleteGroup(deleteGroup)} />
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

/* ───────────────── Docked listing panel (Screen 1) ───────────────── */

const trimT = (s: string | null | undefined) => (s ? s.slice(0, 5) : '')

function DockedListingPanel({
  cls, t, busy, listing, detachedListing, otherListings, trials,
  pickerOpen, setPickerOpen, detachConfirm, setDetachConfirm,
  onConfirmTrial, onDeclineTrial, onUnlist, onRelist, onAttach, onEdit, onPreview, onPublishNew,
}: {
  cls: ClassRow; t: T; busy: boolean
  listing: ListingDetail | null
  detachedListing: ListingDetail | null
  otherListings: ListingDetail[]
  trials: TrialReq[]
  pickerOpen: boolean; setPickerOpen: (b: boolean) => void
  detachConfirm: boolean; setDetachConfirm: (b: boolean) => void
  onConfirmTrial: (trialId: string, childName: string) => void
  onDeclineTrial: (trialId: string) => void
  onUnlist: () => void; onRelist: () => void; onAttach: (l: ListingDetail) => void
  onEdit: (id: string) => void; onPreview: (id: string) => void; onPublishNew: () => void
}) {
  const slug   = listing?.category?.slug ?? cls.category?.slug
  const emoji  = categoryEmoji(slug)
  const accent = listing?.category?.accent_color ?? cls.category?.accent_color ?? '#7c3aed'
  // The "default" group is the one that represents the listing itself (its name
  // matches the listing title — e.g. the group auto-created with the listing).
  // It gets a short banner instead of the "one of many cohorts" explainer.
  const isDefaultGroup = !!listing && cls.name.trim() === listing.title.trim()

  return (
    // No overflow-hidden — it would clip the "choose a listing" dropdown popover.
    <aside className="mt-[18px] rounded-[18px] border-[1.5px] border-border bg-white"
      style={{ boxShadow: '0 2px 12px rgba(124,58,237,.06)' }}>
      {/* Header bar */}
      <div className="flex items-center gap-1.5 px-[18px] py-3 border-b rounded-t-[16px]" style={{ background: '#faf7ff', borderColor: '#f0eef6' }}>
        <span className="text-primary text-[11px] leading-none">▾</span>
        <span className="font-display text-[13px] font-extrabold text-ink">{t('panelTitle')}</span>
        <span className="font-display text-[12.5px] text-ink-muted truncate">— {cls.name}</span>
      </div>

      {listing ? (
        /* ── LISTED state ── */
        <div className="p-[18px]">
          {/* Relationship banner — short for the default group, full explainer
              for additional cohorts so "one of the groups" reads correctly. */}
          <div className="flex items-start gap-2.5 rounded-[10px] px-3.5 py-3 mb-[18px]" style={{ background: '#f0e8ff' }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: accent }} />
            <div className="min-w-0">
              {isDefaultGroup ? (
                <p className="font-display text-[12.5px] text-ink leading-snug">
                  <b className="font-bold">{cls.name}</b> {t('relBannerDefault')}
                </p>
              ) : (
                <>
                  <p className="font-display text-[12.5px] text-ink leading-snug">
                    <b className="font-bold">{cls.name}</b> {t('relBannerL1')}
                  </p>
                  <p className="font-display text-[12px] text-ink-mid leading-snug mt-1">
                    {trials.length > 0 ? t('relBannerL2Trials') : t('relBannerL2None')}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* 3-column grid */}
          <div className="grid gap-6 lg:grid-cols-[208px_1fr_1.25fr] grid-cols-1">
            {/* Cover + status pill */}
            <div>
              <div className="h-[128px] rounded-[12px] overflow-hidden flex items-center justify-center relative"
                style={listing.cover_image_url ? undefined : { background: `linear-gradient(135deg, ${accent}2e, ${accent}73)` }}>
                {listing.cover_image_url
                  ? <img src={listing.cover_image_url} alt="" className="w-full h-full object-cover" />
                  : <span style={{ fontSize: 46 }}>{emoji}</span>}
              </div>
              <div className="mt-2.5"><StatusPill status={listing.status} t={t} /></div>
            </div>

            {/* Details */}
            <div>
              <div className="font-display text-[10px] font-bold tracking-[.1em] uppercase text-ink-muted mb-2.5">{t('detailsEyebrow')}</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Detail label={t('panelPrice')}    value={`${listing.price_monthly ?? 0} RON${listing.pricing_type === 'session' ? t('perSession') : t('perMonth')}`} strong />
                <Detail label={t('panelSchedule')} value={scheduleStr(listing, t)} />
                <Detail label={t('panelAges')}     value={listing.age_min != null && listing.age_max != null ? `${listing.age_min}–${listing.age_max} ${t('years')}` : '—'} />
                <Detail label={t('panelArea')}     value={listing.area?.name ?? '—'} />
                <Detail label={t('panelSpots')}    value={listing.spots_total != null ? t('spotsOpen', { open: listing.spots_available ?? 0, total: listing.spots_total }) : '—'} />
              </div>
            </div>

            {/* Trial requests */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="font-display text-[10px] font-bold tracking-[.1em] uppercase text-ink-muted">{t('trialReqEyebrow')}</span>
                {trials.length > 0 && (
                  <span className="font-display text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gold-lt text-gold-text">{t('trialReqNew', { n: trials.length })}</span>
                )}
              </div>
              {trials.length === 0 ? (
                <div className="font-display text-[12px] text-ink-muted py-2">{t('noTrialRequests')}</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {trials.map(tr => <TrialCard key={tr.id} tr={tr} t={t} busy={busy}
                    onConfirm={() => onConfirmTrial(tr.id, tr.child_name)} onDecline={() => onDeclineTrial(tr.id)} />)}
                  <p className="font-display text-[10.5px] text-ink-muted mt-0.5">{t('trialFootnote')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Unlist speed-bump */}
          {detachConfirm && (
            <div className="mt-[18px] rounded-[12px] px-4 py-3.5" style={{ border: '1px solid #f6d9d4', background: '#fdf4f3' }}>
              <div className="font-display text-[13px] font-bold text-ink mb-0.5">{t('unlistConfirmTitle', { class: cls.name })}</div>
              <p className="font-display text-[12px] text-ink-mid mb-3 leading-snug">{t('unlistConfirmBody')}</p>
              <div className="flex gap-2">
                <button onClick={onUnlist} disabled={busy} className="px-3.5 py-2 rounded-md font-display text-[12.5px] font-semibold bg-danger text-white hover:opacity-90 disabled:opacity-50 transition-opacity">{t('unlistConfirmYes')}</button>
                <button onClick={() => setDetachConfirm(false)} disabled={busy} className="px-3.5 py-2 rounded-md font-display text-[12.5px] font-semibold border border-border text-ink-mid hover:bg-surface transition-colors">{t('unlistConfirmNo')}</button>
              </div>
            </div>
          )}

          {/* Actions row */}
          <div className="flex items-center gap-2.5 mt-4 pt-4 border-t flex-wrap" style={{ borderColor: '#f0eef6' }}>
            <button onClick={() => onEdit(listing.id)} className="px-4 py-2 rounded-md font-display text-[12.5px] font-semibold bg-primary text-white hover:bg-primary-deep transition-colors">{t('editListing')}</button>
            <button onClick={() => onPreview(listing.id)} className="px-4 py-2 rounded-md font-display text-[12.5px] font-semibold bg-white border-[1.5px] border-border-mid text-ink-mid hover:border-primary hover:text-primary transition-colors">{t('previewPublic')}</button>
            {!detachConfirm && (
              <button onClick={() => setDetachConfirm(true)} className="ml-auto font-display text-[12px] font-semibold text-ink-muted hover:text-ink transition-colors">{t('unlistGroup')}</button>
            )}
          </div>
        </div>
      ) : (
        /* ── MANUAL state ── */
        <div className="p-[18px] grid gap-6 md:grid-cols-[208px_1fr] grid-cols-1">
          {/* Hatched placeholder */}
          <div className="h-[128px] rounded-[12px] flex items-center justify-center"
            style={{ background: 'repeating-linear-gradient(45deg,#f3f1f9,#f3f1f9 10px,#ece8f5 10px,#ece8f5 20px)' }}>
            <span style={{ fontSize: 46 }}>{emoji}</span>
          </div>

          <div className="min-w-0">
            {/* Badge */}
            <span className={cn('inline-flex font-display text-[10.5px] font-semibold px-2 py-0.5 rounded-full mb-2',
              detachedListing ? 'bg-info-lt text-info' : 'bg-zinc-lt text-zinc')}>
              {detachedListing ? t('manualBadgeDetached') : t('manualBadgeNative')}
            </span>

            {/* Detached → re-list banner */}
            {detachedListing && (
              <div className="rounded-[12px] px-3.5 py-3 mb-3" style={{ border: '1px solid #d6e4f5', background: '#eef5fb' }}>
                <p className="font-display text-[12px] text-ink-mid leading-snug mb-2.5">
                  {t('relistBannerL1')} {t('relistBannerL2')}
                </p>
                <button onClick={onRelist} disabled={busy} className="px-3.5 py-2 rounded-md font-display text-[12.5px] font-semibold bg-info text-white hover:opacity-90 disabled:opacity-50 transition-opacity">{t('relistGroup')}</button>
              </div>
            )}

            <div className="font-display text-[14px] font-semibold text-ink mb-0.5">
              {detachedListing ? t('manualHeadlineDetached') : t('manualHeadlineNative')}
            </div>
            <p className="font-display text-[12px] text-ink-muted mb-3.5 leading-snug">{t('manualSub')}</p>

            {/* Controls row */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <button onClick={() => setPickerOpen(!pickerOpen)}
                  className="inline-flex items-center justify-between gap-2 min-w-[240px] px-3.5 py-2.5 rounded-[9px] border border-border bg-white font-display text-[12.5px] font-semibold text-ink hover:border-primary transition-colors">
                  {t('chooseExisting')}<span className="text-ink-muted text-[10px]">▾</span>
                </button>
                {pickerOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-30 min-w-[260px] rounded-[12px] border border-border bg-white shadow-xl p-1.5">
                    {otherListings.length === 0 ? (
                      <div className="font-display text-[12px] text-ink-muted px-2.5 py-2">{t('noOtherListings')}</div>
                    ) : otherListings.map(l => (
                      <button key={l.id} onClick={() => onAttach(l)} disabled={busy}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-primary-lt disabled:opacity-50 transition-colors text-left">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.category?.accent_color ?? '#7c3aed' }} />
                        <span className="font-display text-[12.5px] font-semibold text-ink truncate flex-1">{l.title}</span>
                        {l.spots_total != null && (
                          <span className="font-display text-[11px] text-success flex-shrink-0">{t('spotsOpen', { open: l.spots_available ?? 0, total: l.spots_total })}</span>
                        )}
                      </button>
                    ))}
                    <p className="font-display text-[10.5px] text-ink-muted px-2.5 pt-1.5 pb-1">{t('chooseExistingFootnote')}</p>
                  </div>
                )}
              </div>
              <span className="font-display text-[12px] text-ink-muted">{t('orWord')}</span>
              <button onClick={onPublishNew} className="px-4 py-2.5 rounded-md font-display text-[12.5px] font-semibold bg-primary text-white hover:bg-primary-deep transition-colors">{t('publishNew')}</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

function scheduleStr(listing: ListingDetail, t: T): string {
  const scheds = [...(listing.schedules ?? [])].sort((a, b) => a.day_of_week - b.day_of_week)
  if (scheds.length === 0) return '—'
  const days = [...new Set(scheds.map(s => s.day_of_week))]
  const dayStr = days.map(d => t(`days.${d}` as 'days.0')).join(' ')
  const t0 = scheds[0]
  return `${dayStr} ${trimT(t0.time_start)}–${trimT(t0.time_end)}`.trim()
}

function StatusPill({ status, t }: { status: string; t: T }) {
  const map: Record<string, { cls: string; label: string }> = {
    active:  { cls: 'bg-success-lt text-success', label: `● ${t('statusLive')}` },
    paused:  { cls: 'bg-zinc-lt text-zinc',       label: t('statusPaused') },
    pending: { cls: 'bg-gold-lt text-gold-text',  label: t('statusPendingReview') },
    draft:   { cls: 'bg-surface text-ink-muted',  label: t('statusDraft') },
  }
  const m = map[status] ?? map.draft
  return <span className={cn('inline-flex px-2.5 py-1 rounded-full font-display text-[11px] font-semibold', m.cls)}>{m.label}</span>
}

function Detail({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="font-display text-[10px] font-semibold uppercase text-ink-muted tracking-[.04em] mb-0.5">{label}</div>
      <div className={cn('font-display text-ink', strong ? 'text-[14px] font-extrabold' : 'text-[12.5px] font-medium')}>{value}</div>
    </div>
  )
}

function TrialCard({ tr, t, busy, onConfirm, onDecline }: {
  tr: TrialReq; t: T; busy: boolean; onConfirm: () => void; onDecline: () => void
}) {
  const hoursAgo = Math.floor((Date.now() - new Date(tr.created_at).getTime()) / 3_600_000)
  const ago = hoursAgo < 1 ? t('justNow') : hoursAgo < 24 ? t('hoursAgo', { h: hoursAgo }) : t('daysAgo', { d: Math.floor(hoursAgo / 24) })
  const meta = [tr.parent_name, tr.preferred_day != null ? t('prefersDay', { day: t(`days.${tr.preferred_day}` as 'days.0') }) : null].filter(Boolean).join(' · ')
  return (
    <div className="rounded-[12px] px-3 py-2.5" style={{ border: '1px solid #f5e6b8', background: '#fffdf5' }}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-[12.5px] font-bold text-ink truncate">
          {tr.child_name}{tr.child_age != null ? ` · ${t('ageShort', { n: tr.child_age })}` : ''}
        </span>
        <span className="font-display text-[10.5px] text-ink-muted flex-shrink-0">{ago}</span>
      </div>
      {meta && <div className="font-display text-[11px] text-ink-muted mt-0.5 truncate">{meta}</div>}
      <div className="flex gap-1.5 mt-2">
        <button onClick={onConfirm} disabled={busy} className="flex-1 py-1.5 rounded-md font-display text-[11.5px] font-semibold bg-success-lt text-success hover:bg-success hover:text-white disabled:opacity-50 transition-colors">{t('confirmEnrol')}</button>
        <button onClick={onDecline} disabled={busy} className="flex-1 py-1.5 rounded-md font-display text-[11.5px] font-semibold bg-white border border-danger/30 text-danger hover:bg-danger-lt disabled:opacity-50 transition-colors">{t('declineRequest')}</button>
      </div>
    </div>
  )
}

function ModalShell({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[550] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div role="dialog" aria-modal="true" className={cn('relative z-10 bg-white rounded-[18px] shadow-xl w-full p-6 max-h-[90vh] overflow-y-auto', wide ? 'max-w-[520px]' : 'max-w-[440px]')} onClick={e => e.stopPropagation()}>
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
  // Only groups under the SAME activity this family is waiting on — plus manual
  // groups (no listing) — can take the offer. A group listed under a different
  // activity must not appear (mirrors the /api/offers listing_mismatch guard).
  const offerable = classes.filter(c => c.listing_id === null || c.listing_id === entry.listing_id)
  return (
    <ModalShell onClose={onClose}>
      <h2 className="font-display text-[17px] font-bold text-ink mb-0.5">{t('offerTitle', { child: entry.child_name })}</h2>
      <p className="font-display text-[12.5px] text-ink-muted mb-4">{t('offerSub')}</p>
      <div className="flex flex-col gap-1.5 mb-4">
        {offerable.length === 0 && <div className="font-display text-[12.5px] text-ink-muted py-4 text-center">{t('noClassesYet')}</div>}
        {offerable.map(c => {
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

// Three-dot actions menu on a group column header (mirrors the activity card).
function GroupMenu({ t, listed, onAddStudent, onRename, onTurnIntoListing, onDelete }: {
  t: T; listed: boolean
  onAddStudent: () => void; onRename: () => void; onTurnIntoListing: () => void; onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])
  const item = 'w-full flex items-center gap-2 px-3 py-2 font-display text-[12.5px] text-ink-mid hover:bg-surface transition-colors text-left'
  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }} aria-label={t('groupActions')}
        className="w-7 h-7 rounded flex items-center justify-center text-ink-muted hover:bg-surface transition-colors">
        <svg width="13" height="13" viewBox="0 0 4 16" fill="currentColor"><circle cx="2" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="2" cy="14" r="1.5"/></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-30 bg-white border border-border rounded-lg shadow-lg py-1 min-w-[180px]">
          <button onClick={() => { setOpen(false); onAddStudent() }} className={item}>+ {t('addStudent')}</button>
          <button onClick={() => { setOpen(false); onRename() }} className={item}>{t('renameGroup')}</button>
          {!listed && (
            <button onClick={() => { setOpen(false); onTurnIntoListing() }} className={cn(item, 'text-primary')}>{t('turnIntoListing')}</button>
          )}
          <div className="border-t border-border mx-1 my-1" />
          <button onClick={() => { setOpen(false); onDelete() }} className={cn(item, 'text-danger')}>{t('deleteGroup')}</button>
        </div>
      )}
    </div>
  )
}

function RenameGroupModal({ t, busy, value, setValue, onClose, onSave }: {
  t: T; busy: boolean; value: string; setValue: (v: string) => void; onClose: () => void; onSave: () => void
}) {
  return (
    <ModalShell onClose={onClose}>
      <h2 className="font-display text-[17px] font-bold text-ink mb-3">{t('renameGroupTitle')}</h2>
      <input autoFocus value={value} onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave() }} className={inputCls} placeholder={t('groupNamePlaceholder')} />
      <div className="flex gap-2 mt-4">
        <button onClick={onClose} className="flex-1 py-2.5 rounded font-display text-sm font-semibold border border-border text-ink-mid hover:bg-surface transition-colors">{t('cancel')}</button>
        <button onClick={onSave} disabled={busy || !value.trim()} className="flex-1 py-2.5 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-50 transition-colors">{t('save')}</button>
      </div>
    </ModalShell>
  )
}

function DeleteGroupConfirm({ cls, enrolled, listed, t, busy, onClose, onConfirm }: {
  cls: ClassRow; enrolled: number; listed: boolean; t: T; busy: boolean
  onClose: () => void; onConfirm: () => void
}) {
  return (
    <ModalShell onClose={onClose}>
      <div className="text-2xl mb-2">🗑️</div>
      <h2 className="font-display text-[17px] font-bold text-ink mb-1">{t('deleteGroupTitle', { group: cls.name })}</h2>
      <p className="font-display text-[13px] text-ink-mid mb-2 leading-snug">{t('deleteGroupBody')}</p>
      {enrolled > 0 && (
        <div className="rounded-[10px] px-3 py-2 mb-2 font-display text-[12.5px] text-danger" style={{ background: '#fdf4f3', border: '1px solid #f6d9d4' }}>
          {t('deleteGroupWarnCount', { n: enrolled })}
        </div>
      )}
      {listed && <p className="font-display text-[12px] text-ink-muted mb-4">{t('deleteGroupListedNote')}</p>}
      <div className="flex gap-2 mt-3">
        <button onClick={onClose} disabled={busy} className="flex-1 py-2.5 rounded font-display text-sm font-semibold border border-border text-ink-mid hover:bg-surface disabled:opacity-50 transition-colors">{t('cancel')}</button>
        <button onClick={onConfirm} disabled={busy} className="flex-1 py-2.5 rounded font-display text-sm font-semibold bg-danger text-white hover:opacity-90 disabled:opacity-50 transition-opacity">{t('deleteGroupYes')}</button>
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
