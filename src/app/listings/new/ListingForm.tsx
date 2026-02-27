'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { LegalModal } from '@/components/ui/LegalModal'
import { TermsContent } from '@/components/ui/LegalContent'
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
  language:        string[]
  age_min:         string
  age_max:         string
  schedules:       ScheduleRow[]
  price_monthly:   string
  spots_total:     string
  spots_available: string
  description:     string
  includes:        string[]
  trial_available: boolean
}

const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TIMES = [
  '07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30',
  '11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30',
  '19:00','19:30','20:00','20:30','21:00',
]
const STEPS = ['Before you start', 'Basic info', 'Schedule', 'Details', 'Preview & publish']
const EMPTY_SCHEDULE: ScheduleRow = { day_of_week: 0, time_start: '16:00', time_end: '17:00', group_label: '' }
const INITIAL: FormData = {
  title: '', category_id: '', area_id: '', address: '', language: ['Romanian'],
  age_min: '', age_max: '', schedules: [{ ...EMPTY_SCHEDULE }],
  price_monthly: '', spots_total: '', spots_available: '', description: '',
  includes: [''], trial_available: true,
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-start mb-8">
      {STEPS.map((label, i) => {
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
              <div className={cn('flex-1 h-px', i === STEPS.length - 1 ? 'invisible' : done ? 'bg-primary' : 'bg-border')} />
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
  const cat     = categories.find(c => c.id === data.category_id)
  const area    = areas.find(a => a.id === data.area_id)
  const hasData = data.title || cat || area

  if (!hasData) return (
    <div className="bg-white border border-border rounded-lg p-6 text-center text-ink-muted text-sm">
      Fill in the form to see a preview
    </div>
  )

  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden relative">
      {cat && <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: cat.accent_color }} />}
      <div className="pl-5 pr-4 pt-4 pb-4">
        <div className="flex items-center gap-1.5 mb-1">
          {cat && <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: cat.accent_color }} />}
          <span className="text-xs text-ink-muted">
            {[cat?.name, data.age_min && data.age_max ? `Ages ${data.age_min}-${data.age_max}` : null, area?.name].filter(Boolean).join(' - ')}
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
          <div className="px-3 py-1.5 rounded font-display text-sm font-semibold bg-primary text-white">Book trial</div>
          <div className="px-3 py-1.5 rounded font-display text-sm font-semibold border border-border text-ink-mid">Details</div>
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
  const isEdit                    = !!listingId
  const [step, setStep]           = useState(0)
  const [data, setData]           = useState<FormData>({ ...INITIAL, ...initialData })
  const [saving, setSaving]       = useState(false)
  const [error,  setError]        = useState('')
  const [showTerms, setShowTerms] = useState(false)

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

  function canProceed(): boolean {
    if (step === 0) return true
    if (step === 1) return !!(data.title && data.category_id && data.area_id)
    if (step === 2) return !!(data.age_min && data.age_max && data.schedules.length > 0)
    if (step === 3) return !!(data.price_monthly && data.description)
    return true
  }

  async function publish() {
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const payload = {
        category_id:     data.category_id,
        area_id:         data.area_id,
        title:           data.title,
        description:     data.description,
        age_min:         parseInt(data.age_min),
        age_max:         parseInt(data.age_max),
        price_monthly:   parseInt(data.price_monthly),
        spots_total:     data.spots_total ? parseInt(data.spots_total) : null,
        spots_available: data.spots_available ? parseInt(data.spots_available) : null,
        address:         data.address,
        language:        data.language.join(', '),
        includes:        data.includes.filter(Boolean),
        trial_available: data.trial_available,
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
        {isEdit ? 'Edit activity' : 'List an activity'}
      </h1>
      <p className="text-sm text-ink-muted mb-8">
        {isEdit ? 'Update the details of your activity.' : 'Fill in the details to publish your activity on kidvo.'}
      </p>

      <StepIndicator current={step} />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 items-start">
        <div className="bg-white border border-border rounded-lg p-6">

          {/* Step 0 */}
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="font-display text-base font-bold text-ink mb-1">Before you list your activity</h2>
                <p className="text-sm text-ink-muted">Please read the following before creating your listing on kidvo.</p>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { icon: "🎯", title: "Free trial is mandatory", desc: "Every listing on kidvo must offer a free trial session. This is non-negotiable — it is what makes kidvo work for parents. If your activity cannot offer a free trial, kidvo is not the right fit." },
                  { icon: "🤝", title: "Direct relationship with parents", desc: "kidvo connects you with parents, but all contracts, payments, and agreements happen directly between you and the family. kidvo is not involved in any financial transactions." },
                  { icon: "📋", title: "You are responsible for compliance", desc: "You must hold all required licenses, certifications, and insurance for your activity. kidvo does not verify credentials and is not liable for any incidents." },
                  { icon: "⏱️", title: "Listings are reviewed before going live", desc: "Every new listing is reviewed by the kidvo team within 24 hours. Listings that do not meet our quality standards may be rejected." },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="flex gap-3 p-4 bg-bg rounded-lg border border-border">
                    <span className="text-xl flex-shrink-0">{icon}</span>
                    <div>
                      <div className="font-display text-sm font-semibold text-ink mb-1">{title}</div>
                      <p className="text-sm text-ink-muted leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink-muted text-center">
                By continuing, you agree to these rules and kidvo&apos;s{' '}
                <button type="button" onClick={() => setShowTerms(true)} className="text-primary font-semibold hover:underline">
                  Terms of Use
                </button>.
              </p>
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <Label>Activity title</Label>
                <input className={inputCls} placeholder="e.g. Academia de Fotbal Timisoara" value={data.title} onChange={e => set('title', e.target.value)} />
              </div>
              <div>
                <Label>Category</Label>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="flex flex-col gap-4">
                  <div>
                    <Label>Neighborhood</Label>
                    <select className={selectCls} value={data.area_id} onChange={e => set('area_id', e.target.value)}>
                      <option value="">Select area...</option>
                      {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label hint="Street address where the activity takes place">Address</Label>
                    <input className={inputCls} placeholder="e.g. Str. Muresului 12, Fabric" value={data.address} onChange={e => set('address', e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Languages spoken</Label>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Minimum age</Label>
                  <input className={inputCls} type="number" min={1} max={18} placeholder="e.g. 5" value={data.age_min} onChange={e => set('age_min', e.target.value)} />
                </div>
                <div>
                  <Label>Maximum age</Label>
                  <input className={inputCls} type="number" min={1} max={18} placeholder="e.g. 14" value={data.age_max} onChange={e => set('age_max', e.target.value)} />
                </div>
              </div>
              <div>
                <Label hint="Add one row per session slot">Weekly schedule</Label>
                <div className="flex flex-col gap-2">
                  {data.schedules.map((s, i) => (
                    <div key={i} className="flex flex-wrap gap-2 items-center p-2 bg-bg rounded-lg border border-border md:p-0 md:bg-transparent md:border-0 md:flex-nowrap">
                      <select className={cn(selectCls, 'flex-1 min-w-[110px]')} value={s.day_of_week} onChange={e => updateSchedule(i, 'day_of_week', parseInt(e.target.value))}>
                        {DAYS.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
                      </select>
                      <select className={cn(selectCls, 'flex-1 min-w-[90px]')} value={s.time_start} onChange={e => updateSchedule(i, 'time_start', e.target.value)}>
                        {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <select className={cn(selectCls, 'flex-1 min-w-[90px]')} value={s.time_end} onChange={e => updateSchedule(i, 'time_end', e.target.value)}>
                        {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input className={cn(inputCls, 'flex-1 min-w-[130px]')} placeholder="Group label (optional)" value={s.group_label} onChange={e => updateSchedule(i, 'group_label', e.target.value)} />
                      <button type="button" onClick={() => removeSchedule(i)} disabled={data.schedules.length === 1}
                        className="w-8 h-8 rounded border border-border flex items-center justify-center text-ink-muted hover:border-danger hover:text-danger disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addSchedule} className="flex items-center gap-2 text-sm font-display font-semibold text-primary hover:text-primary-deep transition-colors mt-1">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4v6M4 7h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    Add another slot
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div>
                  <Label hint="Consider fair local pricing">Monthly price (RON)</Label>
                  <input className={inputCls} type="number" min={0} placeholder="e.g. 120" value={data.price_monthly} onChange={e => set('price_monthly', e.target.value)} />
                </div>
                <div>
                  <Label hint="Total group capacity">Spots total</Label>
                  <input className={inputCls} type="number" min={1} placeholder="e.g. 20" value={data.spots_total} onChange={e => set('spots_total', e.target.value)} />
                </div>
                <div>
                  <Label hint="How many spots are open now">Spots available</Label>
                  <input className={inputCls} type="number" min={0} placeholder="e.g. 8" value={data.spots_available} onChange={e => set('spots_available', e.target.value)} />
                </div>
              </div>
              <div>
                <Label hint="Tell parents what makes your activity special">About</Label>
                <textarea className={inputCls} rows={5} placeholder="Describe the activity..." value={data.description} onChange={e => set('description', e.target.value)} />
              </div>
              <div>
                <Label hint="e.g. UEFA-licensed coaches, free trial session">What&apos;s included</Label>
                <div className="flex flex-col gap-2">
                  {data.includes.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input className={inputCls} placeholder={`Item ${i + 1}`} value={item} onChange={e => updateInclude(i, e.target.value)} />
                      <button type="button" onClick={() => removeInclude(i)} disabled={data.includes.length === 1}
                        className="w-8 h-8 rounded border border-border flex items-center justify-center text-ink-muted hover:border-danger hover:text-danger disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addInclude} className="flex items-center gap-2 text-sm font-display font-semibold text-primary hover:text-primary-deep transition-colors mt-1">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4v6M4 7h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    Add item
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => set('trial_available', !data.trial_available)}
                  className={cn('w-10 h-6 rounded-full transition-colors relative flex-shrink-0', data.trial_available ? 'bg-primary' : 'bg-border')}>
                  <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all', data.trial_available ? 'left-5' : 'left-1')} />
                </button>
                <span className="text-sm text-ink-mid font-body">Trial session available</span>
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
                <div className="flex justify-between"><span className="text-ink-muted">Price</span><span className="font-semibold text-ink">{data.price_monthly} RON/mo</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Sessions</span><span className="font-semibold text-ink">{data.schedules.length} slot{data.schedules.length !== 1 ? 's' : ''}</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Trial</span><span className="font-semibold text-ink">{data.trial_available ? 'Yes' : 'No'}</span></div>
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
        <button type="button" onClick={() => setStep(s => s - 1)} disabled={step === 0}
          className="px-4 py-2 rounded font-display text-sm font-semibold border border-border text-ink-mid hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          Back
        </button>
        <span className="font-display text-xs text-ink-muted">Step {step + 1} of {STEPS.length}</span>
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
            className="px-5 py-2 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Continue
          </button>
        ) : (
          <>
            {!isEdit && (
              <p className="text-xs text-ink-muted text-center">
                Your listing will be reviewed within 24 hours before going live.
              </p>
            )}
            <button type="button" onClick={publish} disabled={saving}
              className="px-5 py-2 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-60 transition-colors">
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Publish listing'}
            </button>
          </>
        )}
      </div>

      {showTerms && (
        <LegalModal title="Terms of Use" onClose={() => setShowTerms(false)}>
          <TermsContent />
        </LegalModal>
      )}
    </div>
  )
}
