'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { localizeCategoryName } from '@/lib/categoryName'

// Shared child add/edit form — used by the My Kids page and the folded-in
// Calendar kid management. Kept presentation-only: the caller owns persistence.

const CURRENT_YEAR = new Date().getFullYear()

export interface ChildFormChild {
  id: string; name: string; birth_year: number
  school_grade: string | null; area_id: string | null; interests: string[]
}
export interface ChildFormArea { id: string; name: string }
export interface ChildFormCategory { id: string; name: string; slug: string; accent_color: string }

export function ChildForm({ areas, categories, initial, onSave, onCancel, saving }: {
  areas:      ChildFormArea[]
  categories: ChildFormCategory[]
  initial?:   Partial<ChildFormChild>
  onSave:     (data: Omit<ChildFormChild, 'id'>) => Promise<void>
  onCancel:   () => void
  saving:     boolean
}) {
  const t = useTranslations('kids')
  const tGrades = useTranslations('grades')
  const tCat = useTranslations('categories')
  const GRADES = [
    tGrades('preschool'),
    tGrades('grade1'), tGrades('grade2'), tGrades('grade3'), tGrades('grade4'),
    tGrades('grade5'), tGrades('grade6'), tGrades('grade7'), tGrades('grade8'),
    tGrades('hs1'), tGrades('hs2'), tGrades('hs3'), tGrades('hs4'),
  ]
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
                    {localizeCategoryName(tCat, cat)}
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
