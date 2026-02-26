'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const CURRENT_YEAR = new Date().getFullYear()

const GRADES = [
  'Preschool', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
  'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8',
  'High School Year 1', 'High School Year 2', 'High School Year 3', 'High School Year 4',
]

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getAgeLabel(birthYear: number) {
  const age = CURRENT_YEAR - birthYear
  return `${age} year${age !== 1 ? 's' : ''} old`
}

interface Child {
  id:           string
  name:         string
  birth_year:   number
  school_grade: string | null
  area_id:      string | null
}

interface Area  { id: string; name: string }
interface Save  { id: string; listing: any }

function ChildForm({ areas, initial, onSave, onCancel, saving }: {
  areas:    Area[]
  initial?: Partial<Child>
  onSave:   (data: Omit<Child, 'id'>) => Promise<void>
  onCancel: () => void
  saving:   boolean
}) {
  const [name,   setName]   = useState(initial?.name         ?? '')
  const [year,   setYear]   = useState(initial?.birth_year   ?? CURRENT_YEAR - 7)
  const [grade,  setGrade]  = useState(initial?.school_grade ?? '')
  const [areaId, setAreaId] = useState(initial?.area_id      ?? '')
  const [error,  setError]  = useState('')

  const inputCls = 'w-full px-3 py-2 border border-border rounded bg-bg text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary transition-all'

  async function submit() {
    if (!name.trim()) { setError('Name is required.'); return }
    if (year < CURRENT_YEAR - 18 || year > CURRENT_YEAR - 2) { setError('Please enter a valid birth year (age 2–18).'); return }
    setError('')
    await onSave({ name: name.trim(), birth_year: year, school_grade: grade || null, area_id: areaId || null })
  }

  return (
    <div className="bg-white border border-primary-border rounded-lg p-4">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
          <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1">Child's name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex" className={inputCls} />
        </div>
        <div>
          <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1">Birth year</label>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} min={CURRENT_YEAR - 18} max={CURRENT_YEAR - 2} className={inputCls} />
        </div>
        <div>
          <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1">Grade <span className="text-ink-muted font-normal normal-case">(opt.)</span></label>
          <select value={grade} onChange={e => setGrade(e.target.value)} className={inputCls}>
            <option value="">— select —</option>
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        {areas.length > 0 && (
          <div className="col-span-2">
            <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1">Neighborhood <span className="text-ink-muted font-normal normal-case">(opt.)</span></label>
            <select value={areaId} onChange={e => setAreaId(e.target.value)} className={inputCls}>
              <option value="">— select —</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        )}
      </div>
      {error && <div className="mb-3 px-3 py-2 bg-danger-lt border border-danger/20 rounded text-sm text-danger">{error}</div>}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 rounded font-display text-sm font-semibold border border-border text-ink-mid hover:bg-surface transition-colors">Cancel</button>
        <button onClick={submit} disabled={saving} className="flex-1 py-2 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

interface Props {
  userId:      string
  initialKids: Child[]
  areas:       Area[]
  saves:       Save[]
}

export function MyKidsClient({ userId, initialKids, areas, saves }: Props) {
  const [kids,           setKids]           = useState<Child[]>(initialKids)
  const [selectedId,     setSelectedId]     = useState<string | null>(initialKids[0]?.id ?? null)
  const [showDetail,     setShowDetail]     = useState(false) // mobile: show detail panel
  const [showAdd,        setShowAdd]        = useState(false)
  const [editId,         setEditId]         = useState<string | null>(null)
  const [saving,         setSaving]         = useState(false)
  const [deleteId,       setDeleteId]       = useState<string | null>(null)
  const [removedSaveIds, setRemovedSaveIds] = useState<string[]>([])

  const selectedKid  = kids.find(k => k.id === selectedId) ?? null
  const visibleSaves = saves.filter(s => !removedSaveIds.includes(s.id))

  function areaName(areaId: string | null) {
    return areaId ? (areas.find(a => a.id === areaId)?.name ?? null) : null
  }

  function selectKid(id: string) {
    setSelectedId(id)
    setEditId(null)
    setShowDetail(true) // on mobile, navigate to detail view
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

  async function handleUnsave(saveId: string, listingId: string) {
    setRemovedSaveIds(prev => [...prev, saveId])
    await fetch('/api/saves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId }),
    })
  }

  // ── Detail panel content (shared between mobile + desktop) ────────────────
  const DetailPanel = selectedKid ? (
    <div className="flex flex-col gap-4">
      {/* Profile card */}
      <div className="bg-white border border-border rounded-lg p-5">
        {editId === selectedKid.id ? (
          <ChildForm areas={areas} initial={selectedKid} onSave={data => handleEdit(selectedKid.id, data)} onCancel={() => setEditId(null)} saving={saving} />
        ) : (
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-lt border border-primary-border flex items-center justify-center font-display text-base font-bold text-primary flex-shrink-0">
              {selectedKid.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-lg font-bold text-ink mb-2">{selectedKid.name}</div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 bg-surface rounded-full text-xs text-ink-mid">{getAgeLabel(selectedKid.birth_year)}</span>
                {areaName(selectedKid.area_id) && (
                  <span className="px-2.5 py-1 bg-surface rounded-full text-xs text-ink-mid">{areaName(selectedKid.area_id)}</span>
                )}
                {selectedKid.school_grade && (
                  <span className="px-2.5 py-1 bg-surface rounded-full text-xs text-ink-mid">{selectedKid.school_grade}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setEditId(selectedKid.id)} className="px-3 py-1.5 rounded font-display text-xs font-semibold border border-border text-ink-mid hover:bg-surface transition-colors">
                Edit
              </button>
              {deleteId === selectedKid.id ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-danger font-display font-semibold">Remove?</span>
                  <button onClick={() => handleDelete(selectedKid.id)} className="px-2.5 py-1.5 rounded font-display text-xs font-semibold bg-danger text-white">Yes</button>
                  <button onClick={() => setDeleteId(null)} className="px-2.5 py-1.5 rounded font-display text-xs font-semibold border border-border text-ink-mid">No</button>
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

      {/* Saved activities */}
      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted">Saved Activities</div>
          <Link href="/browse" className="font-display text-xs font-semibold text-primary hover:underline">Browse more →</Link>
        </div>
        {visibleSaves.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="text-2xl mb-2">🤍</div>
            <div className="font-display text-sm font-semibold text-ink-mid mb-1">No saved activities yet</div>
            <p className="text-xs text-ink-muted">Tap the heart on any activity to save it here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visibleSaves.map(save => {
              const listing  = save.listing as any
              const category = listing?.category
              const area     = listing?.area
              const accent   = category?.accent_color ?? '#ccc'
              const isFull   = (listing?.spots_available ?? 1) === 0

              return (
                <div key={save.id} className="px-4 py-3.5 flex gap-3">
                  <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5" style={{ background: accent }} />
                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/browse/${listing?.id}`} className="font-display text-sm font-bold text-ink hover:text-primary transition-colors leading-snug">
                        {listing?.title}
                      </Link>
                      <button onClick={() => handleUnsave(save.id, listing?.id)} className="w-5 h-5 rounded flex items-center justify-center text-ink-muted hover:text-danger flex-shrink-0 mt-0.5">
                        <svg width="9" height="9" viewBox="0 0 15 15" fill="none"><path d="M3 3l9 9M12 3l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                    {/* Meta */}
                    <div className="text-xs text-ink-muted mt-0.5">
                      {[category?.name, `Ages ${listing?.age_min}–${listing?.age_max}`, area?.name].filter(Boolean).join(' · ')}
                    </div>
                    {/* Price + actions */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-display text-sm font-bold text-ink">{listing?.price_monthly} RON</span>
                      <span className="text-xs text-ink-muted font-body">/mo</span>
                      <span className={cn('inline-flex px-2 py-0.5 rounded font-display text-[10px] font-semibold ml-1', isFull ? 'bg-danger-lt text-danger' : 'bg-success-lt text-success')}>
                        {isFull ? 'Full' : 'Open'}
                      </span>
                      {!isFull && (
                        <Link href={`/browse/${listing?.id}?book=1`} className="ml-auto px-3 py-1.5 rounded font-display text-xs font-semibold bg-primary text-white hover:bg-primary-deep transition-colors">
                          Book trial
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="bg-white border border-border rounded-lg p-12 text-center">
      <div className="text-3xl mb-3">👧</div>
      <div className="font-display text-sm font-semibold text-ink-mid mb-1">No children added yet</div>
      <p className="text-sm text-ink-muted">Add your first child to get started.</p>
    </div>
  )

  // ── Kids list ─────────────────────────────────────────────────────────────
  const KidsList = (
    <div className="flex flex-col gap-2">
      {kids.map(kid => (
        <button
          key={kid.id}
          onClick={() => selectKid(kid.id)}
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
            <div className="text-xs text-ink-muted">{getAgeLabel(kid.birth_year)}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none" className="text-ink-muted flex-shrink-0"><path d="M5 3l5 4.5L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      ))}

      {showAdd ? (
        <ChildForm areas={areas} onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-border text-ink-muted hover:border-primary/40 hover:text-ink-mid transition-all"
        >
          <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </div>
          <span className="font-display text-sm font-semibold">Add a child</span>
        </button>
      )}
    </div>
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold tracking-tight text-ink mb-0.5">My Kids</h1>
        <p className="text-sm text-ink-muted">Manage profiles and saved activities</p>
      </div>

      {/* Mobile: single column, toggle between list and detail */}
      <div className="md:hidden">
        {showDetail && selectedKid ? (
          <div>
            <button
              onClick={() => setShowDetail(false)}
              className="flex items-center gap-1.5 text-sm font-display font-semibold text-primary mb-4"
            >
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M10 3L5 7.5 10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              All kids
            </button>
            {DetailPanel}
          </div>
        ) : (
          KidsList
        )}
      </div>

      {/* Desktop: two-column layout */}
      <div className="hidden md:grid grid-cols-[260px_1fr] gap-5 items-start">
        {KidsList}
        {DetailPanel}
      </div>
    </div>
  )
}
