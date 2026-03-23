'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { RecommendedCard, pickRecommendation } from '@/components/ui/RecommendedCard'
import { useTranslations } from 'next-intl'

const CURRENT_YEAR  = new Date().getFullYear()
// Day names are resolved via t('days.N') inside components
const CAP           = 3
const UNASSIGNED_ID = '__unassigned__'

const GRADES = [
  'Preschool', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
  'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8',
  'High School Year 1', 'High School Year 2', 'High School Year 3', 'High School Year 4',
]

const STATUS_PILL: Record<string, string> = {
  pending:   'bg-gold-lt text-gold-text',
  confirmed: 'bg-success-lt text-success',
  declined:  'bg-danger-lt text-danger',
  cancelled: 'bg-surface text-ink-muted',
}

function getAge(birthYear: number) {
  return CURRENT_YEAR - birthYear
}

interface Child    { id: string; name: string; birth_year: number; school_grade: string | null; area_id: string | null; interests: string[] }
interface Area     { id: string; name: string }
interface Save     { id: string; kid_id: string | null; listing: any }
interface Booking  { id: string; status: string; preferred_day: number | null; created_at: string; child_id: string | null; message: string | null; listing: any }
interface Category { id: string; name: string; slug: string; accent_color: string }

// ── ChildForm ────────────────────────────────────────────────────────────────

function ChildForm({ areas, categories, initial, onSave, onCancel, saving }: {
  areas:      Area[]
  categories: Category[]
  initial?:   Partial<Child>
  onSave:     (data: Omit<Child, 'id'>) => Promise<void>
  onCancel:   () => void
  saving:     boolean
}) {
  const t = useTranslations('kids')
  const [name,      setName]      = useState(initial?.name         ?? '')
  const [year,      setYear]      = useState(initial?.birth_year   ?? CURRENT_YEAR - 7)
  const [grade,     setGrade]     = useState(initial?.school_grade ?? '')
  const [areaId,    setAreaId]    = useState(initial?.area_id      ?? '')
  const [interests, setInterests] = useState<string[]>(initial?.interests ?? [])
  const [error,     setError]     = useState('')

  const inputCls = 'w-full px-3 py-2 border border-border rounded bg-bg text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary transition-all'

  function toggleInterest(slug: string) {
    setInterests(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
  }

  async function submit() {
    if (!name.trim()) { setError(t('nameRequired')); return }
    if (year < CURRENT_YEAR - 18 || year > CURRENT_YEAR - 2) { setError(t('birthYearError')); return }
    setError('')
    await onSave({ name: name.trim(), birth_year: year, school_grade: grade || null, area_id: areaId || null, interests })
  }

  return (
    <div className="bg-white border border-primary-border rounded-lg p-4">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
          <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1">{t('childName')}</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('childNamePlaceholder')} className={inputCls} />
        </div>
        <div>
          <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1">{t('birthYear')}</label>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} min={CURRENT_YEAR - 18} max={CURRENT_YEAR - 2} className={inputCls} />
        </div>
        <div>
          <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1">{t('grade')} <span className="text-ink-muted font-normal normal-case">{t('gradeOptional')}</span></label>
          <select value={grade} onChange={e => setGrade(e.target.value)} className={inputCls}>
            <option value="">{t('selectPlaceholder')}</option>
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        {areas.length > 0 && (
          <div className="col-span-2">
            <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1">{t('neighbourhood')} <span className="text-ink-muted font-normal normal-case">{t('gradeOptional')}</span></label>
            <select value={areaId} onChange={e => setAreaId(e.target.value)} className={inputCls}>
              <option value="">{t('selectPlaceholder')}</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}
        {categories.length > 0 && (
          <div className="col-span-2">
            <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-2">
              {t('interests')} <span className="text-ink-muted font-normal normal-case">{t('gradeOptional')}</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => {
                const selected = interests.includes(cat.slug)
                return (
                  <button key={cat.id} type="button" onClick={() => toggleInterest(cat.slug)}
                    className="px-3 py-1.5 rounded-full text-xs font-display font-semibold border transition-colors"
                    style={selected
                      ? { background: cat.accent_color, borderColor: cat.accent_color, color: 'white' }
                      : { background: 'white', borderColor: '#E4E4E0', color: '#5C5C60' }
                    }
                  >
                    {cat.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
      {error && <div className="mb-3 px-3 py-2 bg-danger-lt border border-danger/20 rounded text-sm text-danger">{error}</div>}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 rounded font-display text-sm font-semibold border border-border text-ink-mid hover:bg-surface transition-colors">{t('cancel')}</button>
        <button onClick={submit} disabled={saving} className="flex-1 py-2 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-50 transition-colors">
          {saving ? t('saving') : t('save')}
        </button>
      </div>
    </div>
  )
}

// ── AssignButtons ────────────────────────────────────────────────────────────

function AssignButtons({ kids, onAssign, onCancel }: { kids: Child[]; onAssign: (kidId: string) => void; onCancel: () => void }) {
  const t = useTranslations('kids')
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      <span className="text-xs text-ink-muted font-display">{t('assignTo')}</span>
      {kids.map(kid => (
        <button key={kid.id} onClick={() => onAssign(kid.id)}
          className="px-2.5 py-1 rounded-full font-display text-xs font-semibold bg-primary-lt text-primary border border-primary-border hover:bg-primary hover:text-white transition-colors">
          {kid.name}
        </button>
      ))}
      <button onClick={onCancel} className="px-2 py-1 font-display text-xs text-ink-muted hover:text-ink transition-colors">{t('cancel')}</button>
    </div>
  )
}

// ── BookingsSection ──────────────────────────────────────────────────────────

function BookingsSection({ bookings, kids, isUnassigned = false, onReassign }: {
  bookings:     Booking[]
  kids?:        Child[]
  isUnassigned?: boolean
  onReassign?:  (bookingId: string, kidId: string) => Promise<void>
}) {
  const t = useTranslations('kids')
  const [showAll,     setShowAll]     = useState(false)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const shown = showAll ? bookings : bookings.slice(0, CAP)

  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border">
        <div className="font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted">{t('bookings')}</div>
      </div>
      {bookings.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <div className="text-2xl mb-2">📅</div>
          <div className="font-display text-sm font-semibold text-ink-mid mb-1">{t('noBookings')}</div>
          <p className="text-xs text-ink-muted">{t('noBookingsSub')}</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border">
            {shown.map(req => {
              const listing  = req.listing as any
              const category = listing?.category
              const area     = listing?.area
              const provider = listing?.provider
              const statusKey = req.status as keyof typeof STATUS_PILL
              const pillCls   = STATUS_PILL[statusKey] ?? STATUS_PILL.pending
              const icon      = t(`statusIcon.${statusKey}` as any)
              const label     = t(`status.${statusKey}` as any)

              return (
                <div key={req.id} className="px-5 py-4 flex gap-3 items-start">
                  <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: category?.accent_color ?? '#ccc' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-display text-[10px] font-semibold ${pillCls}`}>
                        {icon} {label}
                      </span>
                      <span className="text-[11px] text-ink-muted">
                        {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <Link href={`/browse/${listing?.id}`} className="font-display text-sm font-bold text-ink hover:text-primary transition-colors leading-snug">
                      {listing?.title}
                    </Link>
                    <div className="text-xs text-ink-muted mt-0.5">
                      {[category?.name, area?.name, req.preferred_day !== null ? t('preferred', { day: t(`days.${req.preferred_day}` as any) }) : null].filter(Boolean).join(' · ')}
                    </div>
                    {req.status === 'confirmed' && provider && (
                      <div className="mt-2 p-2.5 bg-success-lt border border-success/20 rounded-lg">
                        <div className="font-display text-[10px] font-semibold tracking-label uppercase text-success mb-1.5">{provider.display_name}</div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-ink-muted">✉</span>
                          <a href={`mailto:${provider.contact_email}`} className="text-primary hover:underline font-medium">{provider.contact_email}</a>
                        </div>
                        {provider.contact_phone && (
                          <div className="flex items-center gap-1.5 text-xs mt-1">
                            <span className="text-ink-muted">✆</span>
                            <a href={`tel:${provider.contact_phone}`} className="text-primary hover:underline font-medium">{provider.contact_phone}</a>
                          </div>
                        )}
                      </div>
                    )}
                    {req.status === 'declined' && (
                      <div className="mt-2 px-2.5 py-1.5 bg-danger-lt rounded text-xs text-danger">
                        {t('couldNotAccommodate')}
                      </div>
                    )}
                    {isUnassigned && kids && kids.length > 0 && onReassign && (
                      assigningId === req.id
                        ? <AssignButtons kids={kids} onAssign={kidId => { onReassign(req.id, kidId); setAssigningId(null) }} onCancel={() => setAssigningId(null)} />
                        : <button onClick={() => setAssigningId(req.id)} className="mt-2.5 inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-primary-border bg-primary-lt font-display text-xs font-semibold text-primary active:bg-primary active:text-white transition-colors">{t('assignToChild')}</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {bookings.length > CAP && (
            <button onClick={() => setShowAll(v => !v)}
              className="w-full py-2.5 text-xs font-display font-semibold text-primary border-t border-border hover:bg-surface transition-colors">
              {showAll ? t('bookingsShowLess') : t('bookingsShowMore', { count: bookings.length - CAP })}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ── SavesSection ─────────────────────────────────────────────────────────────

function SavesSection({ saves, kids, isUnassigned = false, onReassign, onUnsave }: {
  saves:        Save[]
  kids?:        Child[]
  isUnassigned?: boolean
  onReassign?:  (saveId: string, kidId: string) => Promise<void>
  onUnsave?:    (saveId: string, listingId: string, kidId: string | null) => void
}) {
  const t = useTranslations('kids')
  const [showAll,     setShowAll]     = useState(false)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const shown = showAll ? saves : saves.slice(0, CAP)

  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted">{t('savedActivities')}</div>
        <Link href="/browse" className="font-display text-xs font-semibold text-primary hover:underline">{t('browseMore')}</Link>
      </div>
      {saves.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <div className="text-2xl mb-2">🤍</div>
          <div className="font-display text-sm font-semibold text-ink-mid mb-1">{t('noSaved')}</div>
          <p className="text-xs text-ink-muted">{t('noSavedSub')}</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border">
            {shown.map(save => {
              const listing  = save.listing as any
              const category = listing?.category
              const area     = listing?.area
              const isFull   = (listing?.spots_available ?? 1) === 0

              return (
                <div key={save.id} className="px-4 py-3.5 flex gap-3">
                  <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5" style={{ background: category?.accent_color ?? '#ccc' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/browse/${listing?.id}`} className="font-display text-sm font-bold text-ink hover:text-primary transition-colors leading-snug">
                        {listing?.title}
                      </Link>
                      {onUnsave && (
                        <button onClick={() => onUnsave(save.id, listing?.id, save.kid_id)} className="w-5 h-5 rounded flex items-center justify-center text-ink-muted hover:text-danger flex-shrink-0 mt-0.5">
                          <svg width="9" height="9" viewBox="0 0 15 15" fill="none"><path d="M3 3l9 9M12 3l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5">
                      {[category?.name, `Ages ${listing?.age_min}–${listing?.age_max}`, area?.name].filter(Boolean).join(' · ')}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-display text-sm font-bold text-ink">{listing?.price_monthly} RON</span>
                      <span className="text-xs text-ink-muted font-body">/mo</span>
                      <span className={cn('inline-flex px-2 py-0.5 rounded font-display text-[10px] font-semibold ml-1', isFull ? 'bg-danger-lt text-danger' : 'bg-success-lt text-success')}>
                        {isFull ? t('full') : t('open')}
                      </span>
                      {!isFull && listing?.trial_available && (
                        <Link href={`/browse/${listing?.id}?book=1`} className="ml-auto px-3 py-1.5 rounded font-display text-xs font-semibold bg-primary text-white hover:bg-primary-deep transition-colors">
                          {t('bookTrial')}
                        </Link>
                      )}
                    </div>
                    {isUnassigned && kids && kids.length > 0 && onReassign && (
                      assigningId === save.id
                        ? <AssignButtons kids={kids} onAssign={kidId => { onReassign(save.id, kidId); setAssigningId(null) }} onCancel={() => setAssigningId(null)} />
                        : <button onClick={() => setAssigningId(save.id)} className="mt-2.5 inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-primary-border bg-primary-lt font-display text-xs font-semibold text-primary active:bg-primary active:text-white transition-colors">{t('assignToChild')}</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {saves.length > CAP && (
            <button onClick={() => setShowAll(v => !v)}
              className="w-full py-2.5 text-xs font-display font-semibold text-primary border-t border-border hover:bg-surface transition-colors">
              {showAll ? t('savedShowLess') : t('savedShowMore', { count: saves.length - CAP })}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  userId:      string
  initialKids: Child[]
  areas:       Area[]
  saves:       Save[]
  categories:  Category[]
  bookings:    Booking[]
  listings:    any[]
}

export function MyKidsClient({ userId, initialKids, areas, saves: initialSaves, categories, bookings: initialBookings, listings }: Props) {
  const t = useTranslations('kids')
  const [kids,           setKids]           = useState<Child[]>(initialKids)
  const [localBookings,  setLocalBookings]  = useState<Booking[]>(initialBookings)
  const [localSaves,     setLocalSaves]     = useState<Save[]>(initialSaves)
  const [selectedId,     setSelectedId]     = useState<string | null>(initialKids[0]?.id ?? null)
  const [showDetail,     setShowDetail]     = useState(false)
  const [showAdd,        setShowAdd]        = useState(false)
  const [editId,         setEditId]         = useState<string | null>(null)
  const [saving,         setSaving]         = useState(false)
  const [deleteId,       setDeleteId]       = useState<string | null>(null)
  const [removedSaveIds, setRemovedSaveIds] = useState<string[]>([])
  const [assignError,    setAssignError]    = useState<string | null>(null)

  // Recommendation for the selected kid (recomputes on kid switch)
  const kidRecommendation = useMemo(() => {
    if (!selectedId || selectedId === UNASSIGNED_ID) return null
    const kid = kids.find(k => k.id === selectedId)
    if (!kid) return null
    const savedIds  = new Set(localSaves.filter(s => s.kid_id === kid.id).map(s => (s.listing as any)?.id).filter(Boolean))
    const bookedIds = new Set(localBookings.filter(b => b.child_id === kid.id).map(b => (b.listing as any)?.id).filter(Boolean))
    return pickRecommendation(kid, listings, new Set([...savedIds, ...bookedIds]))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, listings])

  // Unassigned items (null kid/child id)
  const unassignedBookings = localBookings.filter(b => b.child_id === null)
  const unassignedSaves    = localSaves.filter(s => !removedSaveIds.includes(s.id) && s.kid_id === null)
  const hasUnassigned      = unassignedBookings.length > 0 || unassignedSaves.length > 0

  const isUnassignedSlot = selectedId === UNASSIGNED_ID
  const selectedKid      = isUnassignedSlot ? null : (kids.find(k => k.id === selectedId) ?? null)

  const kidBookings  = isUnassignedSlot ? unassignedBookings  : localBookings.filter(b => b.child_id === selectedId)
  const visibleSaves = isUnassignedSlot ? unassignedSaves     : localSaves.filter(s => !removedSaveIds.includes(s.id) && s.kid_id === selectedId)

  function areaName(areaId: string | null) {
    return areaId ? (areas.find(a => a.id === areaId)?.name ?? null) : null
  }

  function pendingCount(kidId: string) {
    return localBookings.filter(b => b.child_id === kidId && b.status === 'pending').length
  }

  function selectKid(id: string) {
    setSelectedId(id)
    setEditId(null)
    setShowDetail(true)
  }

  async function handleAdd(data: Omit<Child, 'id'>) {
    setSaving(true)
    const supabase = createClient()
    const { data: newKid } = await supabase.from('children').insert({ ...data, user_id: userId }).select().single()
    if (newKid) { setKids(prev => [...prev, newKid]); setSelectedId(newKid.id); setShowDetail(true) }
    setShowAdd(false)
    setSaving(false)
  }

  async function handleEdit(id: string, data: Omit<Child, 'id'>) {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('children').update(data).eq('id', id)
    setKids(prev => prev.map(k => k.id === id ? { ...k, ...data } : k))
    setEditId(null)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('children').delete().eq('id', id)
    const remaining = kids.filter(k => k.id !== id)
    setKids(remaining)
    setDeleteId(null)
    if (selectedId === id) { setSelectedId(remaining[0]?.id ?? null); setShowDetail(false) }
  }

  async function handleUnsave(saveId: string, listingId: string, kidId: string | null) {
    setRemovedSaveIds(prev => [...prev, saveId])
    await fetch('/api/saves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId, kid_id: kidId }),
    })
  }

  async function reassignBooking(bookingId: string, kidId: string) {
    setAssignError(null)
    const supabase = createClient()
    const { error } = await supabase.from('trial_requests').update({ child_id: kidId }).eq('id', bookingId)
    if (error) { setAssignError(t('assignError')); return }
    setLocalBookings(prev => prev.map(b => b.id === bookingId ? { ...b, child_id: kidId } : b))
  }

  async function reassignSave(saveId: string, kidId: string) {
    setAssignError(null)
    const supabase = createClient()
    const { error } = await supabase.from('saves').update({ kid_id: kidId }).eq('id', saveId)
    if (error) { setAssignError(t('assignError')); return }
    setLocalSaves(prev => prev.map(s => s.id === saveId ? { ...s, kid_id: kidId } : s))
  }

  // ── Flat view (no kids added yet) ─────────────────────────────────────────
  const FlatView = (
    <div className="flex flex-col gap-4">
      {/* Add first child nudge */}
      <div className="bg-white border border-primary-border rounded-lg p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary-lt flex items-center justify-center flex-shrink-0 text-lg">👶</div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-sm font-bold text-ink mb-0.5">{t('noKids')}</div>
          <p className="text-xs text-ink-muted">{t('noKidsSub')}</p>
        </div>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 rounded font-display text-xs font-semibold bg-primary text-white hover:bg-primary-deep transition-colors flex-shrink-0">
            {t('addChildArrow')}
          </button>
        )}
      </div>
      {showAdd && (
        <ChildForm areas={areas} categories={categories} onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
      )}
      {/* All bookings (no kid filter) */}
      <BookingsSection bookings={localBookings} />
      {/* All saves (no kid filter) */}
      <SavesSection saves={localSaves.filter(s => !removedSaveIds.includes(s.id))} onUnsave={handleUnsave} />
    </div>
  )

  // ── Kid selector list ──────────────────────────────────────────────────────
  const KidsList = (
    <div className="flex flex-col gap-2">
      {kids.map(kid => {
        const pending = pendingCount(kid.id)
        return (
          <button key={kid.id} onClick={() => selectKid(kid.id)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all',
              selectedId === kid.id ? 'bg-white border-primary shadow-sm' : 'bg-white border-border hover:border-primary/40'
            )}
          >
            <div className="w-9 h-9 rounded-full bg-primary-lt border border-primary-border flex items-center justify-center font-display text-sm font-bold text-primary flex-shrink-0">
              {kid.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-sm font-bold text-ink">{kid.name}</div>
              <div className="text-xs text-ink-muted">{t('ageLabel', { age: getAge(kid.birth_year) })}</div>
            </div>
            {pending > 0 && (
              <span className="font-display text-[10px] font-bold px-[6px] py-px rounded-full bg-gold-lt text-gold-text flex-shrink-0">
                {pending}
              </span>
            )}
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none" className="text-ink-muted flex-shrink-0"><path d="M5 3l5 4.5L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        )
      })}

      {/* Unassigned slot — only shown when there are unassigned items */}
      {hasUnassigned && (
        <button onClick={() => selectKid(UNASSIGNED_ID)}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed text-left transition-all',
            selectedId === UNASSIGNED_ID ? 'bg-white border-ink-muted shadow-sm' : 'bg-white border-border hover:border-ink-muted/60'
          )}
        >
          <div className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center text-base flex-shrink-0">📋</div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-sm font-semibold text-ink-mid">{t('unassigned')}</div>
            <div className="text-xs text-ink-muted">
              {[unassignedBookings.length > 0 ? t('unassignedBookings', { count: unassignedBookings.length }) : null,
                unassignedSaves.length > 0    ? t('unassignedSaved', { count: unassignedSaves.length }) : null].filter(Boolean).join(' · ')}
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none" className="text-ink-muted flex-shrink-0"><path d="M5 3l5 4.5L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}

      {showAdd ? (
        <ChildForm areas={areas} categories={categories} onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
      ) : (
        <button onClick={() => setShowAdd(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-border text-ink-muted hover:border-primary/40 hover:text-ink-mid transition-all">
          <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </div>
          <span className="font-display text-sm font-semibold">{t('addChild')}</span>
        </button>
      )}

      {/* Recommendation — updates when selected kid changes */}
      {kidRecommendation && selectedKid && (
        <RecommendedCard listing={kidRecommendation} forKid={selectedKid.name} />
      )}
    </div>
  )

  // ── Detail panel ──────────────────────────────────────────────────────────
  const DetailPanel = (() => {
    if (!selectedId) {
      return (
        <div className="bg-white border border-border rounded-lg p-12 text-center">
          <div className="text-3xl mb-3">👧</div>
          <div className="font-display text-sm font-semibold text-ink-mid mb-1">{t('selectChild')}</div>
          <p className="text-sm text-ink-muted">{t('selectChildSub')}</p>
        </div>
      )
    }

    if (isUnassignedSlot) {
      // All items assigned away — show success state
      if (unassignedBookings.length === 0 && unassignedSaves.length === 0) {
        return (
          <div className="bg-white border border-border rounded-lg p-12 text-center">
            <div className="text-3xl mb-3">✅</div>
            <div className="font-display text-sm font-semibold text-ink-mid mb-1">{t('allAssigned')}</div>
            <p className="text-sm text-ink-muted">{t('allAssignedSub')}</p>
          </div>
        )
      }
      return (
        <div className="flex flex-col gap-4">
          {/* Unassigned header */}
          <div className="bg-white border border-border rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-xl flex-shrink-0">📋</div>
            <div>
              <div className="font-display text-base font-bold text-ink">{t('unassigned')}</div>
              <div className="text-xs text-ink-muted">{t('unassignedSub')}</div>
            </div>
          </div>
          {assignError && (
            <div className="px-4 py-2.5 bg-danger-lt border border-danger/20 rounded-lg text-sm text-danger font-display">
              ⚠ {assignError}
            </div>
          )}
          <BookingsSection key="b-unassigned" bookings={kidBookings} kids={kids} isUnassigned onReassign={reassignBooking} />
          <SavesSection    key="s-unassigned" saves={visibleSaves}   kids={kids} isUnassigned onReassign={reassignSave} onUnsave={handleUnsave} />
        </div>
      )
    }

    if (!selectedKid) return null

    return (
      <div className="flex flex-col gap-4">
        {/* Profile card */}
        <div className="bg-white border border-border rounded-lg p-5">
          {editId === selectedKid.id ? (
            <ChildForm areas={areas} categories={categories} initial={selectedKid} onSave={data => handleEdit(selectedKid.id, data)} onCancel={() => setEditId(null)} saving={saving} />
          ) : (
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary-lt border border-primary-border flex items-center justify-center font-display text-base font-bold text-primary flex-shrink-0">
                {selectedKid.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg font-bold text-ink mb-2">{selectedKid.name}</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 bg-surface rounded-full text-xs text-ink-mid">{t('ageLabel', { age: getAge(selectedKid.birth_year) })}</span>
                  {areaName(selectedKid.area_id) && (
                    <span className="px-2.5 py-1 bg-surface rounded-full text-xs text-ink-mid">{areaName(selectedKid.area_id)}</span>
                  )}
                  {selectedKid.school_grade && (
                    <span className="px-2.5 py-1 bg-surface rounded-full text-xs text-ink-mid">{selectedKid.school_grade}</span>
                  )}
                </div>
                {(selectedKid.interests?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedKid.interests.map((slug: string) => {
                      const cat = categories.find(c => c.slug === slug)
                      return cat ? (
                        <span key={slug} className="px-2.5 py-1 rounded-full text-[10px] font-display font-semibold text-white" style={{ background: cat.accent_color }}>
                          {cat.name}
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setEditId(selectedKid.id)} className="px-3 py-1.5 rounded font-display text-xs font-semibold border border-border text-ink-mid hover:bg-surface transition-colors">
                  {t('editChild')}
                </button>
                {deleteId === selectedKid.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-danger font-display font-semibold">{t('removeConfirm')}</span>
                    <button onClick={() => handleDelete(selectedKid.id)} className="px-2.5 py-1.5 rounded font-display text-xs font-semibold bg-danger text-white">{t('yes')}</button>
                    <button onClick={() => setDeleteId(null)} className="px-2.5 py-1.5 rounded font-display text-xs font-semibold border border-border text-ink-mid">{t('no')}</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteId(selectedKid.id)} className="w-7 h-7 rounded flex items-center justify-center border border-border text-ink-muted hover:border-danger/50 hover:text-danger hover:bg-danger-lt transition-all">
                    <svg width="11" height="11" viewBox="0 0 15 15" fill="none"><path d="M3 3l9 9M12 3l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bookings + saves — key resets collapse state on kid switch */}
        <BookingsSection key={`b-${selectedId}`} bookings={kidBookings} />
        <SavesSection    key={`s-${selectedId}`} saves={visibleSaves}   onUnsave={handleUnsave} />
      </div>
    )
  })()

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold tracking-tight text-ink mb-0.5">{t('title')}</h1>
        <p className="text-sm text-ink-muted">{t('subtitle')}</p>
      </div>

      {kids.length === 0 ? FlatView : (
        <>
          {/* Mobile */}
          <div className="md:hidden">
            {showDetail && selectedId ? (
              <div>
                <button onClick={() => setShowDetail(false)} className="flex items-center gap-1.5 text-sm font-display font-semibold text-primary mb-4">
                  <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M10 3L5 7.5 10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {t('allChildren')}
                </button>
                {DetailPanel}
              </div>
            ) : (
              KidsList
            )}
          </div>

          {/* Desktop */}
          <div className="hidden md:grid grid-cols-[260px_1fr] gap-5 items-start">
            {KidsList}
            {DetailPanel}
          </div>
        </>
      )}
    </div>
  )
}
