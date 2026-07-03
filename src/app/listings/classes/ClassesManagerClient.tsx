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

  const [detail,  setDetail]    = useState<DetailTarget | null>(null)
  const [offerFor, setOfferFor] = useState<PoolRow | null>(null)
  const [fullConfirm, setFullConfirm] = useState<{ entry: PoolRow; cls: ClassRow } | null>(null)
  const [addTo, setAddTo]       = useState<ClassRow | null>(null)
  const [newGroup, setNewGroup] = useState<{ founding: PoolRow | null; listing: ListingDetail | null } | null>(null)
  const [toast, setToast]       = useState<string | null>(null)
  const [busy, setBusy]         = useState(false)

  const [unlistFor, setUnlistFor]   = useState<ClassRow | null>(null)
  const [attachFor, setAttachFor]   = useState<ClassRow | null>(null)
  const [confirmTrial, setConfirmTrial] = useState<{ trial: TrialReq; groups: ClassRow[] } | null>(null)
  const [deleteGroup, setDeleteGroup] = useState<ClassRow | null>(null)
  const [renameFor, setRenameFor] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

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

  // A group created inside a listing's lane is linked to that listing on
  // creation — no separate "publish" step.
  async function doNewGroup(fields: Record<string, unknown>, founding: PoolRow | null, listing: ListingDetail | null) {
    const res = await api('/api/classes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listing ? { ...fields, listing_id: listing.id } : fields),
    })
    if (!res.ok) { showToast(t('errorGeneric')); return }
    const data = await res.json()
    setNewGroup(null)
    if (founding && data.class?.id) {
      await doOffer(founding, data.class as ClassRow, true)
    } else {
      showToast(listing ? t('groupCreatedUnder', { listing: listing.title }) : t('groupCreated'))
      router.refresh()
    }
  }

  async function patchClassListing(classId: string, listingId: string | null): Promise<boolean> {
    const res = await api(`/api/classes/${classId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listing_id: listingId }),
    })
    return res.ok
  }

  // Unlist (make private) — enrolled kids stay; the group simply moves to the
  // private section and stops taking public trial requests.
  async function doUnlist(cls: ClassRow) {
    if (!(await patchClassListing(cls.id, null))) { showToast(t('errorGeneric')); return }
    setUnlistFor(null); showToast(t('classUnpublished')); router.refresh()
  }

  // Show a private group under one of the provider's listings.
  async function doAttach(cls: ClassRow, listing: ListingDetail) {
    if (!(await patchClassListing(cls.id, listing.id))) { showToast(t('errorGeneric')); return }
    setAttachFor(null); showToast(t('attachedToast', { class: cls.name, listing: listing.title })); router.refresh()
  }

  // Confirm a trial request → enrols the child into the picked group.
  async function doConfirmTrial(trialId: string, cls: ClassRow, childName: string) {
    const res = await api(`/api/trial-requests/${trialId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm', class_id: cls.id }),
    })
    if (!res.ok) { showToast(t('errorGeneric')); return }
    setConfirmTrial(null)
    showToast(t('trialConfirmedToast', { child: childName, class: cls.name })); router.refresh()
  }

  // Confirming from a lane: one group → straight in; several → the provider
  // picks the destination group explicitly (never decided by click location).
  function handleConfirmTrial(trial: TrialReq, laneGroups: ClassRow[]) {
    if (laneGroups.length === 1) { doConfirmTrial(trial.id, laneGroups[0], trial.child_name); return }
    setConfirmTrial({ trial, groups: laneGroups })
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

  const fullCount = classes.filter(c => c.capacity != null && occ(c.id) >= c.capacity).length
  const privateGroups = classes.filter(c => c.listing_id === null)
  const activeListings = listings.filter(l => l.status === 'active')

  const groupColumnProps = {
    t, busy, members, occ,
    onOpenMember: (m: MemberRow) => setDetail({ kind: 'member', row: m }),
    onConfirmMember: doConfirmRequest,
    onDeclineMember: doDeclineRequest,
    onAddStudent: (c: ClassRow) => setAddTo(c),
    onRename: (c: ClassRow) => { setRenameValue(c.name); setRenameFor(c.id) },
    onUnlist: (c: ClassRow) => setUnlistFor(c),
    onAttach: (c: ClassRow) => setAttachFor(c),
    onDelete: (c: ClassRow) => setDeleteGroup(c),
  }

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
          onClick={() => setNewGroup({ founding: null, listing: null })}
          className="self-end md:self-start flex-shrink-0 inline-flex items-center gap-1.5 font-display text-sm font-bold px-4 py-2.5 rounded-full text-white hover:opacity-90 transition-opacity"
          style={{ background: '#1c1c27' }}
        >
          <span className="text-base leading-none">+</span> {t('startGroup')}
        </button>
      </div>

      {/* ── One lane per public listing: its waiting families, its pending trial
             requests, and the groups that run under it. Which group belongs to
             which listing is carried by the structure — no badges needed. ── */}
      {listings.map(listing => {
        const laneGroups = classes.filter(c => c.listing_id === listing.id)
        const lanePool   = pool.filter(p => p.listing_id === listing.id)
        const laneTrials = trialRequests.filter(r => r.listing_id === listing.id)
        const accent = listing.category?.accent_color ?? '#7c3aed'
        return (
          <section key={listing.id} className="mb-5 rounded-[18px] border-[1.5px] border-border bg-white/60 p-4"
            style={{ boxShadow: '0 2px 12px rgba(124,58,237,.05)' }}>
            {/* Lane header — the listing this lane fronts */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: accent }} />
              <span className="font-display text-[15px] font-extrabold text-ink truncate">{listing.title}</span>
              <StatusPill status={listing.status} t={t} />
              <div className="ml-auto flex items-center gap-3 flex-shrink-0">
                <button onClick={() => router.push(`/browse/${listing.id}`)}
                  className="font-display text-[12px] font-semibold text-ink-muted hover:text-primary transition-colors">{t('previewPublic')}</button>
                <button onClick={() => router.push(`/listings/${listing.id}/edit`)}
                  className="font-display text-[12px] font-semibold text-primary hover:text-primary-deep transition-colors">{t('editListing')} →</button>
              </div>
            </div>

            {/* Pending trial requests for this listing — confirmed into a group
                the provider picks explicitly (never implied by click location). */}
            {laneTrials.length > 0 && (
              <div className="mt-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-display text-[10px] font-bold tracking-[.1em] uppercase text-ink-muted">{t('trialReqEyebrow')}</span>
                  <span className="font-display text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gold-lt text-gold-text">{t('trialReqNew', { n: laneTrials.length })}</span>
                </div>
                <div className="flex gap-2.5 overflow-x-auto pb-1">
                  {laneTrials.map(tr => (
                    <div key={tr.id} className="flex-shrink-0 w-[250px]">
                      <TrialCard tr={tr} t={t} busy={busy}
                        onConfirm={() => handleConfirmTrial(tr, laneGroups)}
                        onDecline={() => doDeclineTrial(tr.id)} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Group columns (+ this listing's waiting families, when any) */}
            <div className="flex gap-4 overflow-x-auto pt-3.5 pb-1 items-start">
              {lanePool.length > 0 && (
                <section className="flex-shrink-0 w-[260px] rounded-[18px] border-[1.5px] border-border bg-white/70 p-3">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="font-display text-[13px] font-bold text-ink">{t('waitingPool')}</span>
                    <span className="font-display text-[11px] font-bold px-2 py-0.5 rounded-full bg-gold-lt text-gold-text">{lanePool.length}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {lanePool.map(row => (
                      <PoolCard key={row.id} row={row} t={t}
                        onOpen={() => setDetail({ kind: 'pool', row })}
                        onOffer={() => setOfferFor(row)} />
                    ))}
                  </div>
                </section>
              )}

              {laneGroups.map(cls => (
                <GroupColumn key={cls.id} cls={cls} {...groupColumnProps} />
              ))}

              {/* New group here → linked to this listing automatically */}
              <button onClick={() => setNewGroup({ founding: null, listing })}
                className="flex-shrink-0 w-[200px] self-stretch min-h-[120px] rounded-[18px] border-2 border-dashed border-border-mid text-ink-muted hover:border-primary hover:text-primary transition-colors flex flex-col items-center justify-center gap-2 py-8">
                <span className="text-2xl leading-none">+</span>
                <span className="font-display text-[12.5px] font-semibold">{t('newGroup')}</span>
              </button>
            </div>
          </section>
        )
      })}

      {/* ── Private groups — rosters only the provider sees ── */}
      <section className="mb-5 rounded-[18px] border-[1.5px] border-dashed border-border-mid bg-white/40 p-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-display text-[15px] font-extrabold text-ink">{t('privateLane')}</span>
          <span className="font-display text-[12px] text-ink-muted">{t('privateLaneSub')}</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pt-3.5 pb-1 items-start">
          {privateGroups.map(cls => (
            <GroupColumn key={cls.id} cls={cls} {...groupColumnProps} />
          ))}
          <button onClick={() => setNewGroup({ founding: null, listing: null })}
            className="flex-shrink-0 w-[200px] self-stretch min-h-[120px] rounded-[18px] border-2 border-dashed border-border-mid text-ink-muted hover:border-primary hover:text-primary transition-colors flex flex-col items-center justify-center gap-2 py-8">
            <span className="text-2xl leading-none">+</span>
            <span className="font-display text-[12.5px] font-semibold">{t('newPrivateGroup')}</span>
          </button>
        </div>
      </section>

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
          onNewGroup={() => { const f = offerFor; setOfferFor(null); setNewGroup({ founding: f, listing: null }) }} />
      )}

      {/* ── Full-class confirm ── */}
      {fullConfirm && (
        <FullConfirm entry={fullConfirm.entry} cls={fullConfirm.cls} t={t} busy={busy}
          onClose={() => setFullConfirm(null)}
          onOverCapacity={() => doOffer(fullConfirm.entry, fullConfirm.cls, true)}
          onNewGroup={() => { const f = fullConfirm.entry; setFullConfirm(null); setNewGroup({ founding: f, listing: null }) }} />
      )}

      {/* ── Trial confirm — pick the destination group ── */}
      {confirmTrial && (
        <TrialConfirmPicker trial={confirmTrial.trial} groups={confirmTrial.groups} occ={occ} t={t} busy={busy}
          onClose={() => setConfirmTrial(null)}
          onPick={(cls) => doConfirmTrial(confirmTrial.trial.id, cls, confirmTrial.trial.child_name)} />
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

      {/* ── Unlist (make private) confirm ── */}
      {unlistFor && (
        <UnlistGroupConfirm cls={unlistFor} t={t} busy={busy}
          onClose={() => setUnlistFor(null)}
          onConfirm={() => doUnlist(unlistFor)} />
      )}

      {/* ── Show a private group on a listing ── */}
      {attachFor && (
        <AttachModal cls={attachFor} listings={activeListings} t={t} busy={busy}
          onClose={() => setAttachFor(null)}
          onPick={(l) => doAttach(attachFor, l)}
          onPublishNew={() => router.push(`/listings/classes/${attachFor.id}/quick-start`)} />
      )}

      {/* ── Delete group confirm ── */}
      {deleteGroup && (
        <DeleteGroupConfirm cls={deleteGroup} enrolled={occ(deleteGroup.id)} listed={!!deleteGroup.listing_id} t={t} busy={busy}
          onClose={() => setDeleteGroup(null)}
          onConfirm={() => doDeleteGroup(deleteGroup)} />
      )}

      {/* ── New group ── */}
      {newGroup && (
        <NewGroupModal founding={newGroup.founding} listing={newGroup.listing} t={t} busy={busy}
          onClose={() => setNewGroup(null)}
          onSubmit={(fields) => doNewGroup(fields, newGroup.founding, newGroup.listing)} />
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

// One group column — a roster. Lives inside a listing lane (public) or the
// private section; the lane it sits in says which listing it belongs to.
function GroupColumn({ cls, t, busy, members, occ, onOpenMember, onConfirmMember, onDeclineMember, onAddStudent, onRename, onUnlist, onAttach, onDelete }: {
  cls: ClassRow; t: T; busy: boolean; members: MemberRow[]; occ: (id: string) => number
  onOpenMember: (m: MemberRow) => void; onConfirmMember: (id: string) => void; onDeclineMember: (id: string) => void
  onAddStudent: (c: ClassRow) => void; onRename: (c: ClassRow) => void
  onUnlist: (c: ClassRow) => void; onAttach: (c: ClassRow) => void; onDelete: (c: ClassRow) => void
}) {
  void busy
  const roster = members.filter(m => m.class_id === cls.id)
  const occupancy = occ(cls.id)
  const cap = cls.capacity
  const state = cap == null ? 'none' : occupancy > cap ? 'over' : occupancy === cap ? 'full' : 'open'
  const barColor = state === 'over' ? '#f5c542' : state === 'full' ? '#C0392B' : '#1A7A4A'
  const accent = cls.category?.accent_color ?? '#7c3aed'
  return (
    <section className="flex-shrink-0 w-[260px] rounded-[18px] bg-white p-3 flex flex-col border border-border"
      style={{ boxShadow: '0 2px 12px rgba(124,58,237,.06)' }}>
      <div className="px-1 mb-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: accent }} />
          <span className="font-display text-[13px] font-bold text-ink truncate flex-1 min-w-0">{cls.name}</span>
          <GroupMenu t={t} listed={!!cls.listing_id}
            onAddStudent={() => onAddStudent(cls)}
            onRename={() => onRename(cls)}
            onUnlist={() => onUnlist(cls)}
            onAttach={() => onAttach(cls)}
            onDelete={() => onDelete(cls)} />
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
            onOpen={() => onOpenMember(m)}
            onConfirm={() => onConfirmMember(m.id)}
            onDecline={() => onDeclineMember(m.id)} />
        ))}
      </div>
    </section>
  )
}

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
  // Only groups under the SAME activity this family is waiting on — plus private
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

// Trial confirm with several groups under the listing: the provider picks the
// destination explicitly. (With one group, confirm goes straight in.)
function TrialConfirmPicker({ trial, groups, occ, t, busy, onClose, onPick }: {
  trial: TrialReq; groups: ClassRow[]; occ: (id: string) => number; t: T; busy: boolean
  onClose: () => void; onPick: (cls: ClassRow) => void
}) {
  return (
    <ModalShell onClose={onClose}>
      <h2 className="font-display text-[17px] font-bold text-ink mb-0.5">{t('confirmTrialTitle', { child: trial.child_name })}</h2>
      <p className="font-display text-[12.5px] text-ink-muted mb-4">{t('confirmTrialSub')}</p>
      <div className="flex flex-col gap-1.5">
        {groups.map(c => {
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
    </ModalShell>
  )
}

// Show a private group under one of the provider's public listings — or turn
// it into a brand-new listing via quick-start.
function AttachModal({ cls, listings, t, busy, onClose, onPick, onPublishNew }: {
  cls: ClassRow; listings: ListingDetail[]; t: T; busy: boolean
  onClose: () => void; onPick: (l: ListingDetail) => void; onPublishNew: () => void
}) {
  return (
    <ModalShell onClose={onClose}>
      <h2 className="font-display text-[17px] font-bold text-ink mb-0.5">{t('showOnListingTitle', { group: cls.name })}</h2>
      <p className="font-display text-[12.5px] text-ink-muted mb-4">{t('manualSub')}</p>
      <div className="flex flex-col gap-1.5">
        {listings.length === 0 ? (
          <div className="font-display text-[12.5px] text-ink-muted py-3 text-center">{t('noOtherListings')}</div>
        ) : listings.map(l => (
          <button key={l.id} onClick={() => onPick(l)} disabled={busy}
            className="flex items-center gap-2 px-3 py-2.5 rounded-[12px] border border-border hover:border-primary hover:bg-primary-lt disabled:opacity-50 transition-colors text-left">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.category?.accent_color ?? '#7c3aed' }} />
            <span className="font-display text-[13px] font-semibold text-ink truncate flex-1">{l.title}</span>
            {l.spots_total != null && (
              <span className="font-display text-[11px] text-success flex-shrink-0">{t('spotsOpen', { open: l.spots_available ?? 0, total: l.spots_total })}</span>
            )}
          </button>
        ))}
      </div>
      <p className="font-display text-[10.5px] text-ink-muted mt-2">{t('chooseExistingFootnote')}</p>
      <div className="flex items-center gap-3 my-3">
        <div className="flex-1 border-t border-border" />
        <span className="font-display text-[11px] text-ink-muted">{t('orWord')}</span>
        <div className="flex-1 border-t border-border" />
      </div>
      <button onClick={onPublishNew} disabled={busy}
        className="w-full py-2.5 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-50 transition-colors">
        {t('publishNew')}
      </button>
    </ModalShell>
  )
}

function UnlistGroupConfirm({ cls, t, busy, onClose, onConfirm }: {
  cls: ClassRow; t: T; busy: boolean; onClose: () => void; onConfirm: () => void
}) {
  return (
    <ModalShell onClose={onClose}>
      <h2 className="font-display text-[17px] font-bold text-ink mb-1">{t('unlistConfirmTitle', { class: cls.name })}</h2>
      <p className="font-display text-[13px] text-ink-mid mb-5 leading-snug">{t('unlistConfirmBody')}</p>
      <div className="flex gap-2">
        <button onClick={onClose} disabled={busy} className="flex-1 py-2.5 rounded font-display text-sm font-semibold border border-border text-ink-mid hover:bg-surface disabled:opacity-50 transition-colors">{t('unlistConfirmNo')}</button>
        <button onClick={onConfirm} disabled={busy} className="flex-1 py-2.5 rounded font-display text-sm font-semibold bg-danger text-white hover:opacity-90 disabled:opacity-50 transition-opacity">{t('unlistConfirmYes')}</button>
      </div>
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
function GroupMenu({ t, listed, onAddStudent, onRename, onUnlist, onAttach, onDelete }: {
  t: T; listed: boolean
  onAddStudent: () => void; onRename: () => void; onUnlist: () => void; onAttach: () => void; onDelete: () => void
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
          {listed ? (
            <button onClick={() => { setOpen(false); onUnlist() }} className={item}>{t('makePrivate')}</button>
          ) : (
            <button onClick={() => { setOpen(false); onAttach() }} className={cn(item, 'text-primary')}>{t('showOnListing')}</button>
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

function NewGroupModal({ founding, listing, t, busy, onClose, onSubmit }: {
  founding: PoolRow | null; listing: ListingDetail | null; t: T; busy: boolean
  onClose: () => void; onSubmit: (fields: Record<string, unknown>) => void
}) {
  const [name, setName] = useState('')
  const [ageMin, setAgeMin] = useState(''); const [ageMax, setAgeMax] = useState('')
  const [days, setDays] = useState<number[]>([]); const [start, setStart] = useState(''); const [end, setEnd] = useState('')
  const [cap, setCap] = useState('')
  const toggle = (d: number) => setDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])
  return (
    <ModalShell onClose={onClose}>
      <h2 className="font-display text-[17px] font-bold text-ink mb-0.5">{t('newGroupTitle')}</h2>
      {founding && <p className="font-display text-[12.5px] text-ink-muted mb-4">{t('foundingMember', { child: founding.child_name })}</p>}
      {listing && !founding && <p className="font-display text-[12.5px] text-ink-muted mb-4">{t('newGroupUnder', { listing: listing.title })}</p>}
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
