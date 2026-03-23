'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { LegalModal } from '@/components/ui/LegalModal'
import { TermsContent } from '@/components/ui/LegalContent'
import { CoverCropModal } from '@/components/ui/CoverCropModal'
import type { Category, Area } from '@/types/database'

interface ScheduleRow {
  day_of_week: number
  time_start:  string
  time_end:    string
  group_label: string
}

interface FormData {
  title:           string
  category_id:     string
  area_id:         string
  address:         string
  maps_url:        string
  language:        string[]
  age_min:         string
  age_max:         string
  schedules:       ScheduleRow[]
  price_monthly:   string
  spots_total:     string
  spots_available: string
  description:     string
  includes:              string[]
  trial_available:       boolean
  trial_disabled_reason: string
  cover_image_url:       string
  pricing_type:          'month' | 'session'
}

const TIMES = [
  '07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30',
  '19:00','19:30','20:00','20:30','21:00',
]
const EMPTY_SCHEDULE: ScheduleRow = { day_of_week: 0, time_start: '16:00', time_end: '17:00', group_label: '' }
const INITIAL: FormData = {
  title: '', category_id: '', area_id: '', address: '', maps_url: '', language: ['Romanian'],
  age_min: '', age_max: '', schedules: [{ ...EMPTY_SCHEDULE }],
  price_monthly: '', spots_total: '', spots_available: '', description: '',
  includes: [''], trial_available: true, trial_disabled_reason: 'cohort', cover_image_url: '',
  pricing_type: 'month',
}

function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div className="flex items-start mb-8">
      {steps.map((label, i) => {
        const done   = i < current
        const active = i === current
        return (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div className="flex items-center w-full">
              <div className={cn('flex-1 h-px', i === 0 ? 'invisible' : done || active ? 'bg-primary' : 'bg-border')} />
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center font-display text-xs font-bold flex-shrink-0 border-2',
                done   ? 'bg-primary border-primary text-white' :
                active ? 'bg-white border-primary text-primary' :
                         'bg-surface border-border text-ink-muted'
              )}>
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : i + 1}
              </div>
              <div className={cn('flex-1 h-px', i === steps.length - 1 ? 'invisible' : done ? 'bg-primary' : 'bg-border')} />
            </div>
            <div className={cn('hidden md:block font-display text-[11px] font-semibold mt-1.5', active ? 'text-primary' : done ? 'text-ink-mid' : 'text-ink-muted')}>
              {label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block">{children}</label>
      {hint && <p className="text-[11px] text-ink-muted mt-0.5">{hint}</p>}
    </div>
  )
}

const inputCls  = 'w-full px-3 py-2 border border-border rounded bg-bg font-body text-base text-ink placeholder:text-ink-muted outline-none focus:border-primary focus:shadow-focus transition-all'
const selectCls = inputCls + ' cursor-pointer appearance-none'

function PreviewCard({ data, categories, areas }: { data: FormData; categories: Category[]; areas: Area[] }) {
  const t = useTranslations('wizard')
  const DAYS = [0,1,2,3,4,5,6].map(i => t(`days.${i}` as any))
  const cat     = categories.find(c => c.id === data.category_id)
  const area    = areas.find(a => a.id === data.area_id)
  const hasData = data.title || cat || area

  if (!hasData) return (
    <div className="bg-white border border-border rounded-lg p-6 text-center text-ink-muted text-sm">
      {t('previewEmpty')}
    </div>
  )

  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden relative">
      {cat && <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: cat.accent_color }} />}
      <div className="pl-5 pr-4 pt-4 pb-4">
        <div className="flex items-center gap-1.5 mb-1">
          {cat && <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: cat.accent_color }} />}
          <span className="text-xs text-ink-muted">
            {[cat?.name, data.age_min && data.age_max ? t('previewAges', { min: data.age_min, max: data.age_max }) : null, area?.name].filter(Boolean).join(' - ')}
          </span>
        </div>
        <div className="font-display text-sm font-semibold text-ink mb-2">{data.title || 'Activity title'}</div>
        <div className="h-px bg-border mb-2" />
        {data.schedules.length > 0 && data.schedules[0].time_start && (
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-ink-mid">
              {[...new Set(data.schedules.map(s => DAYS[s.day_of_week]))].join(' & ')} - {data.schedules[0].time_start}-{data.schedules[0].time_end}
            </div>
            {data.price_monthly && (
              <div className="font-display text-sm font-semibold">{data.price_monthly} RON<span className="font-body font-normal text-[11px] text-ink-muted">/mo</span></div>
            )}
          </div>
        )}
        <div className="flex gap-1.5">
          <div className="px-3 py-1.5 rounded font-display text-sm font-semibold bg-primary text-white">{t('previewBookTrial')}</div>
          <div className="px-3 py-1.5 rounded font-display text-sm font-semibold border border-border text-ink-mid">{t('previewDetails')}</div>
        </div>
      </div>
    </div>
  )
}

interface ListingFormProps {
  categories:   Category[]
  areas:        Area[]
  providerId:   string
  listingId?:   string
  initialData?: Partial<FormData>
}

export function ListingForm({ categories, areas, providerId, listingId, initialData }: ListingFormProps) {
  const isEdit                      = !!listingId
  const [step, setStep]             = useState(0)
  const [data, setData]             = useState<FormData>({ ...INITIAL, ...initialData })
  const [saving, setSaving]         = useState(false)
  const [error,  setError]          = useState('')
  const [showTerms, setShowTerms]   = useState(false)
  const [agreed, setAgreed]         = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [coverFile, setCoverFile]       = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string>(initialData?.cover_image_url ?? '')
  const [rawImageSrc, setRawImageSrc]   = useState<string>('')
  const [showCropModal, setShowCropModal] = useState(false)

  const t = useTranslations('wizard')
  const STEPS = t.raw('steps') as string[]
  const DAYS  = [0,1,2,3,4,5,6].map(i => t(`days.${i}` as any))
  const rules = t.raw('rules') as { icon: string; title: string; desc: string }[]

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData(prev => ({ ...prev, [key]: value }))
  }

  function addSchedule()    { set('schedules', [...data.schedules, { ...EMPTY_SCHEDULE }]) }
  function removeSchedule(i: number) { set('schedules', data.schedules.filter((_, idx) => idx !== i)) }
  function updateSchedule(i: number, field: keyof ScheduleRow, value: string | number) {
    set('schedules', data.schedules.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }
  function updateInclude(i: number, value: string) { set('includes', data.includes.map((v, idx) => idx === i ? value : v)) }
  function addInclude()    { set('includes', [...data.includes, '']) }
  function removeInclude(i: number) { set('includes', data.includes.filter((_, idx) => idx !== i)) }

  useEffect(() => setShowErrors(false), [step])

  function canProceed(): boolean {
    if (step === 0) return agreed
    if (step === 1) return !!(data.title && data.category_id && data.area_id && data.age_min && data.age_max)
    if (step === 2) return data.schedules.length > 0
    if (step === 3) return !!(data.price_monthly && data.description)
    return true
  }

  async function publish() {
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()

      // Upload cover image if a new file was selected
      let coverImageUrl = data.cover_image_url
      if (coverFile) {
        const ext  = coverFile.name.split('.').pop() ?? 'jpg'
        const path = `${providerId}/${Date.now()}.${ext}`
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('listing-images')
          .upload(path, coverFile, { upsert: true, contentType: coverFile.type })
        if (uploadErr) throw uploadErr
        const { data: { publicUrl } } = supabase.storage
          .from('listing-images')
          .getPublicUrl(uploadData.path)
        coverImageUrl = publicUrl
      }

      const payload = {
        category_id:     data.category_id,
        area_id:         data.area_id,
        title:           data.title,
        description:     data.description,
        age_min:         parseInt(data.age_min),
        age_max:         parseInt(data.age_max),
        price_monthly:   parseInt(data.price_monthly),
        pricing_type:    data.pricing_type,
        spots_total:     data.spots_total ? parseInt(data.spots_total) : null,
        spots_available: data.spots_available ? parseInt(data.spots_available) : null,
        address:         data.address,
        maps_url:        data.maps_url || null,
        language:        data.language.join(', '),
        includes:        data.includes.filter(Boolean),
        trial_available:       data.trial_available,
        trial_disabled_reason: data.trial_available ? null : data.trial_disabled_reason,
        cover_image_url: coverImageUrl || null,
        status:          'pending',
      }
      let finalListingId = listingId
      if (isEdit && listingId) {
        const { error: updateErr } = await supabase.from('listings').update(payload).eq('id', listingId)
        if (updateErr) throw updateErr
        await supabase.from('listing_schedules').delete().eq('listing_id', listingId)
      } else {
        const { data: listing, error: insertErr } = await supabase
          .from('listings')
          .insert({ ...payload, provider_id: providerId, featured: false })
          .select()
          .single()
        if (insertErr) throw insertErr
        finalListingId = listing.id
      }
      if (data.schedules.length > 0 && finalListingId) {
        const { error: schedErr } = await supabase.from('listing_schedules').insert(
          data.schedules.map(s => ({
            listing_id:  finalListingId,
            day_of_week: s.day_of_week,
            time_start:  s.time_start,
            time_end:    s.time_end,
            group_label: s.group_label || null,
          }))
        )
        if (schedErr) throw schedErr
      }
      if (!isEdit && finalListingId) {
        await fetch('/api/listings/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: finalListingId, listingTitle: data.title }),
        })
      }
      window.location.href = '/listings?submitted=1'
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-bold tracking-tight text-ink mb-0.5">
        {isEdit ? t('titleEdit') : t('titleNew')}
      </h1>
      <p className="text-sm text-ink-muted mb-8">
        {isEdit ? t('subtitleEdit') : t('subtitleNew')}
      </p>

      <StepIndicator current={step} steps={STEPS} />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 items-start">
        <div className="bg-white border border-border rounded-lg p-6">

          {/* Step 0 */}
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="font-display text-base font-bold text-ink mb-1">{t('beforeTitle')}</h2>
                <p className="text-sm text-ink-muted">{t('beforeSub')}</p>
              </div>
              <div className="flex flex-col gap-3">
                {rules.map(({ icon, title, desc }) => (
                  <div key={title} className="flex gap-3 p-4 bg-bg rounded-lg border border-border">
                    <span className="text-xl flex-shrink-0">{icon}</span>
                    <div>
                      <div className="font-display text-sm font-semibold text-ink mb-1">{title}</div>
                      <p className="text-sm text-ink-muted leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <label className="flex items-start gap-3 p-4 rounded-lg border border-border bg-bg cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-primary flex-shrink-0 cursor-pointer"
                />
                <span className="text-sm text-ink-mid leading-relaxed">
                  {t('agreeText')}{' '}
                  <button type="button" onClick={e => { e.preventDefault(); setShowTerms(true) }} className="text-primary font-semibold hover:underline">
                    {t('termsLink')}
                  </button>
                  {t('agreeTextSuffix') ? ` ${t('agreeTextSuffix')}` : '.'}
                </span>
              </label>
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <Label>{t('activityTitle')}</Label>
                <input className={cn(inputCls, showErrors && !data.title?.trim() && 'border-danger')} placeholder={t('activityTitlePlaceholder')} value={data.title} onChange={e => set('title', e.target.value)} />
                {showErrors && !data.title?.trim() && (
                  <p className="text-[11px] text-danger mt-1">{t('fieldRequired')}</p>
                )}
              </div>
              <div>
                <Label>{t('category')}</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {categories.map(cat => (
                    <button key={cat.id} type="button" onClick={() => set('category_id', cat.id)}
                      className={cn(
                        'px-3 py-2 rounded border font-display text-xs font-semibold transition-all text-left flex items-center gap-2',
                        data.category_id === cat.id ? 'border-primary bg-primary-lt text-primary' : 'border-border bg-bg text-ink-mid hover:border-primary hover:text-primary'
                      )}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.accent_color }} />
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('minAge')}</Label>
                  <input className={cn(inputCls, showErrors && !data.age_min && 'border-danger')} type="number" min={1} max={18} placeholder={t('minAgePlaceholder')} value={data.age_min} onChange={e => set('age_min', e.target.value)} />
                  {showErrors && !data.age_min && (
                    <p className="text-[11px] text-danger mt-1">{t('fieldRequired')}</p>
                  )}
                </div>
                <div>
                  <Label>{t('maxAge')}</Label>
                  <input className={cn(inputCls, showErrors && !data.age_max && 'border-danger')} type="number" min={1} max={18} placeholder={t('maxAgePlaceholder')} value={data.age_max} onChange={e => set('age_max', e.target.value)} />
                  {showErrors && !data.age_max && (
                    <p className="text-[11px] text-danger mt-1">{t('fieldRequired')}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="flex flex-col gap-4">
                  <div>
                    <Label>{t('neighborhood')}</Label>
                    <select className={cn(selectCls, showErrors && !data.area_id && 'border-danger')} value={data.area_id} onChange={e => set('area_id', e.target.value)}>
                      <option value="">{t('selectArea')}</option>
                      {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    {showErrors && !data.area_id && (
                      <p className="text-[11px] text-danger mt-1">{t('fieldRequired')}</p>
                    )}
                  </div>
                  <div>
                    <Label hint={t('addressHint')}>{t('address')}</Label>
                    <input className={inputCls} placeholder={t('addressPlaceholder')} value={data.address} onChange={e => set('address', e.target.value)} />
                  </div>
                  <div>
                    <Label hint={t('mapsHint')}>{t('mapsLink')}</Label>
                    <input className={inputCls} placeholder={t('mapsPlaceholder')} value={data.maps_url} onChange={e => set('maps_url', e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>{t('languages')}</Label>
                  <div className="flex flex-col gap-2 mt-1">
                    {['Romanian', 'English', 'Hungarian', 'German', 'Serbian'].map(lang => {
                      const checked = data.language.includes(lang)
                      return (
                        <label key={lang} className="flex items-center gap-2.5 cursor-pointer group">
                          <div
                            onClick={() => {
                              if (checked && data.language.length === 1) return
                              set('language', checked ? data.language.filter(l => l !== lang) : [...data.language, lang])
                            }}
                            className={cn(
                              'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer',
                              checked ? 'bg-primary border-primary' : 'border-border group-hover:border-primary'
                            )}
                          >
                            {checked && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <span className="text-sm text-ink-mid">{lang}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <Label hint={t('scheduleHint')}>{t('scheduleLabel')}</Label>
                <div className="flex flex-col gap-2">
                  {data.schedules.map((s, i) => (
                    <div key={i} className="flex flex-wrap gap-2 items-center p-2 bg-bg rounded-lg border border-border md:p-0 md:bg-transparent md:border-0 md:flex-nowrap">
                      <select className={cn(selectCls, 'flex-1 min-w-[110px]')} value={s.day_of_week} onChange={e => updateSchedule(i, 'day_of_week', parseInt(e.target.value))}>
                        {DAYS.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
                      </select>
                      <select className={cn(selectCls, 'flex-1 min-w-[90px]')} value={s.time_start} onChange={e => updateSchedule(i, 'time_start', e.target.value)}>
                        {TIMES.map(tm => <option key={tm} value={tm}>{tm}</option>)}
                      </select>
                      <select className={cn(selectCls, 'flex-1 min-w-[90px]')} value={s.time_end} onChange={e => updateSchedule(i, 'time_end', e.target.value)}>
                        {TIMES.map(tm => <option key={tm} value={tm}>{tm}</option>)}
                      </select>
                      <input className={cn(inputCls, 'flex-1 min-w-[130px]')} placeholder={t('groupLabelPlaceholder')} value={s.group_label} onChange={e => updateSchedule(i, 'group_label', e.target.value)} />
                      <button type="button" onClick={() => removeSchedule(i)} disabled={data.schedules.length === 1}
                        className="w-8 h-8 rounded border border-border flex items-center justify-center text-ink-muted hover:border-danger hover:text-danger disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addSchedule} className="flex items-center gap-2 text-sm font-display font-semibold text-primary hover:text-primary-deep transition-colors mt-1">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4v6M4 7h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    {t('addSlot')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="flex flex-col gap-5">

              {/* Cover photo */}
              <div>
                <Label hint={t('coverHint')}>{t('coverLabel')}</Label>
                <div className="flex items-start gap-4 mt-1">
                  {/* Preview or placeholder */}
                  <div
                    className="w-24 h-24 rounded-lg border-2 border-dashed border-border bg-surface flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={coverPreview ? { borderStyle: 'solid', borderColor: 'transparent' } : {}}
                  >
                    {coverPreview
                      ? <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                      : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-ink-muted opacity-40"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="8.5" cy="10.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M3 16l4.5-4.5 3 3 3-3 4 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    }
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-2 rounded border border-border bg-bg font-display text-xs font-semibold text-ink-mid hover:border-primary hover:text-primary transition-all">
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M4 4l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 10v1.5A1.5 1.5 0 0 0 2.5 13h9a1.5 1.5 0 0 0 1.5-1.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                      {coverPreview ? t('changePhoto') : t('uploadPhoto')}
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = () => {
                            setRawImageSrc(reader.result as string)
                            setShowCropModal(true)
                          }
                          reader.readAsDataURL(file)
                          // reset input so same file can be re-selected
                          e.target.value = ''
                        }}
                      />
                    </label>
                    {coverPreview && (
                      <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(''); set('cover_image_url', '') }}
                        className="text-xs text-ink-muted hover:text-danger transition-colors text-left">
                        {t('removePhoto')}
                      </button>
                    )}
                    <p className="text-[11px] text-ink-muted">{t('photoFormats')}</p>
                  </div>
                </div>
              </div>

              <div>
                <Label>{t('pricingType')}</Label>
                <div className="flex gap-2">
                  {(['month', 'session'] as const).map(pt => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => set('pricing_type', pt)}
                      className={cn(
                        'flex-1 py-2 rounded border font-display text-xs font-semibold transition-all',
                        data.pricing_type === pt
                          ? 'bg-primary-lt border-primary text-primary'
                          : 'bg-bg border-border text-ink-mid hover:border-primary'
                      )}
                    >
                      {t(`pricingType_${pt}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div>
                  <Label hint={t('priceHint')}>{t('priceLabel')}</Label>
                  <input className={cn(inputCls, showErrors && !data.price_monthly && 'border-danger')} type="number" min={0} placeholder={t('pricePlaceholder')} value={data.price_monthly} onChange={e => set('price_monthly', e.target.value)} />
                  {showErrors && !data.price_monthly && (
                    <p className="text-[11px] text-danger mt-1">{t('fieldRequired')}</p>
                  )}
                </div>
                <div>
                  <Label hint={t('spotsTotalHint')}>{t('spotsTotal')}</Label>
                  <input className={inputCls} type="number" min={1} placeholder={t('spotsTotalPlaceholder')} value={data.spots_total} onChange={e => set('spots_total', e.target.value)} />
                </div>
                <div>
                  <Label hint={t('spotsAvailableHint')}>{t('spotsAvailable')}</Label>
                  <input className={inputCls} type="number" min={0} placeholder={t('spotsAvailablePlaceholder')} value={data.spots_available} onChange={e => set('spots_available', e.target.value)} />
                </div>
              </div>
              <div>
                <Label hint={t('aboutHint')}>{t('aboutLabel')}</Label>
                <textarea className={cn(inputCls, showErrors && !data.description?.trim() && 'border-danger')} rows={5} placeholder={t('aboutPlaceholder')} value={data.description} onChange={e => set('description', e.target.value)} />
                {showErrors && !data.description?.trim() && (
                  <p className="text-[11px] text-danger mt-1">{t('fieldRequired')}</p>
                )}
              </div>
              <div>
                <Label hint={t('includesHint')}>{t('includesLabel')}</Label>
                <div className="flex flex-col gap-2">
                  {data.includes.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input className={inputCls} placeholder={t('itemPlaceholder', { n: i + 1 })} value={item} onChange={e => updateInclude(i, e.target.value)} />
                      <button type="button" onClick={() => removeInclude(i)} disabled={data.includes.length === 1}
                        className="w-8 h-8 rounded border border-border flex items-center justify-center text-ink-muted hover:border-danger hover:text-danger disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addInclude} className="flex items-center gap-2 text-sm font-display font-semibold text-primary hover:text-primary-deep transition-colors mt-1">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4v6M4 7h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    {t('addItem')}
                  </button>
                </div>
              </div>
              {/* Trial sessions */}
              <div className="border border-border rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-display text-sm font-semibold text-ink">{t('trialLabel')}</div>
                    <div className="text-xs text-ink-muted mt-0.5">
                      {data.trial_available ? t('trialOn') : t('trialOff')}
                    </div>
                  </div>
                  <button type="button" onClick={() => set('trial_available', !data.trial_available)}
                    className={cn('w-10 h-6 rounded-full transition-colors relative flex-shrink-0', data.trial_available ? 'bg-primary' : 'bg-border')}>
                    <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all', data.trial_available ? 'left-5' : 'left-1')} />
                  </button>
                </div>
                {!data.trial_available && (
                  <div className="flex flex-col gap-2 pt-1 border-t border-border">
                    <div className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-muted">Reason shown to parents</div>
                    <div className="flex flex-col gap-1.5">
                      {([
                        { key: 'cohort',     labelKey: 'reasonCohort' as const,  desc: 'Fixed class groups — parents can ask about the next intake' },
                        { key: 'full',       labelKey: 'reasonFull' as const,    desc: 'Currently no open spots — check back soon' },
                        { key: 'contact_us', labelKey: 'reasonDirect' as const,  desc: 'Contact us to set up a visit' },
                      ]).map(({ key, labelKey, desc }) => (
                        <button key={key} type="button" onClick={() => set('trial_disabled_reason', key)}
                          className={cn('flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                            data.trial_disabled_reason === key ? 'border-primary bg-primary-lt' : 'border-border hover:border-primary/40')}>
                          <div className={cn('w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center transition-colors',
                            data.trial_disabled_reason === key ? 'border-primary bg-primary' : 'border-border')}>
                            {data.trial_disabled_reason === key && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <div className="font-display text-sm font-semibold text-ink">{t(labelKey)}</div>
                            <div className="text-xs text-ink-muted">{desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-ink-mid">Review your listing before {isEdit ? 'saving' : 'publishing'}.</p>
              <div className="bg-bg rounded-lg p-4 flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><span className="text-ink-muted">Title</span><span className="font-semibold text-ink">{data.title}</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Category</span><span className="font-semibold text-ink">{categories.find(c => c.id === data.category_id)?.name}</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Area</span><span className="font-semibold text-ink">{areas.find(a => a.id === data.area_id)?.name}</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Ages</span><span className="font-semibold text-ink">{data.age_min}-{data.age_max}</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Price</span><span className="font-semibold text-ink">{data.price_monthly} RON/{data.pricing_type === 'session' ? t('perSession') : t('perMonth')}</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Sessions</span><span className="font-semibold text-ink">{data.schedules.length} slot{data.schedules.length !== 1 ? 's' : ''}</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Trial</span><span className="font-semibold text-ink">{data.trial_available ? t('previewTrialAvailable') : { cohort: t('reasonCohort'), full: t('reasonFull'), contact_us: t('reasonDirect') }[data.trial_disabled_reason] ?? 'Unavailable'}</span></div>
              </div>
              {error && <div className="bg-danger-lt border border-danger/20 text-danger text-sm rounded p-3">{error}</div>}
            </div>
          )}
        </div>

        <div className="hidden md:flex flex-col gap-4 sticky top-[80px]">
          <div className="font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted">Live preview</div>
          <PreviewCard data={data} categories={categories} areas={areas} />
          <div className="text-[11px] text-ink-muted text-center">This is how your listing will appear in browse results</div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
        <div className="flex flex-col items-start gap-1">
          <button type="button" onClick={() => setStep(s => s - 1)} disabled={step === 0}
            className="px-4 py-2 rounded font-display text-sm font-semibold border border-border text-ink-mid hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            {t('back')}
          </button>
          <span className="font-display text-[10px] text-ink-muted pl-1">Step {step + 1} of {STEPS.length}</span>
        </div>
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={() => {
            if (!canProceed()) { setShowErrors(true); return }
            setShowErrors(false)
            setStep(s => s + 1)
          }}
            className="px-5 py-2 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {t('next')}
          </button>
        ) : (
          <div className="flex flex-col items-end gap-1.5">
            {!isEdit && (
              <p className="text-xs text-ink-muted text-right">
                Your listing will be reviewed within 24 hours before going live.
              </p>
            )}
            <button type="button" onClick={publish} disabled={saving}
              className="px-5 py-2 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-60 transition-colors">
              {saving ? t('saving') : t('publish')}
            </button>
          </div>
        )}
      </div>

      {showTerms && (
        <LegalModal title={t('termsLink')} onClose={() => setShowTerms(false)}>
          <TermsContent />
        </LegalModal>
      )}

      {showCropModal && rawImageSrc && (
        <CoverCropModal
          src={rawImageSrc}
          onConfirm={(blob, previewUrl) => {
            setCoverFile(new File([blob], 'cover.jpg', { type: 'image/jpeg' }))
            setCoverPreview(previewUrl)
            setShowCropModal(false)
            setRawImageSrc('')
          }}
          onCancel={() => {
            setShowCropModal(false)
            setRawImageSrc('')
          }}
        />
      )}
    </div>
  )
}
