'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface Kid { id: string; name: string; birth_year: number }
interface Contact { name: string; phone: string; email: string }

interface Props {
  listingId:    string
  listingTitle: string
  isLoggedIn:   boolean
  /** Visual style of the trigger button. */
  variant?: 'card' | 'sticky'
}

type State = 'idle' | 'open' | 'submitting' | 'success' | 'error'

const DAYS = [0, 1, 2, 3, 4, 5, 6]

export function WaitlistButton({ listingId, listingTitle, isLoggedIn, variant = 'card' }: Props) {
  const t = useTranslations('waitlist')
  const [state,    setState]    = useState<State>('idle')
  const [kids,     setKids]     = useState<Kid[] | null>(null)
  const [contact,  setContact]  = useState<Contact | null>(null)
  const [childId,  setChildId]  = useState<string | null>(null)
  const [childName, setChildName] = useState('')
  const [childAge,  setChildAge]  = useState('')
  const [days,     setDays]     = useState<number[]>([])
  const [note,     setNote]     = useState('')
  const [position, setPosition] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Pre-fetch kids + contact on mount so the modal opens with data ready.
  useEffect(() => {
    if (!isLoggedIn) return
    fetch('/api/kids')
      .then(r => r.json())
      .then(data => {
        const list = (data.kids ?? []) as Kid[]
        setKids(list)
        setContact((data.contact ?? null) as Contact | null)
        if (list.length === 1) selectKid(list[0])
      })
      .catch(() => { setKids([]); setContact(null) })
  }, [isLoggedIn])

  function selectKid(kid: Kid) {
    setChildId(kid.id)
    setChildName(kid.name)
    setChildAge(String(Math.max(0, new Date().getFullYear() - kid.birth_year)))
  }

  function toggleKid(kid: Kid) {
    if (childId === kid.id) { setChildId(null); return }
    selectKid(kid)
  }

  function toggleDay(d: number) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  function openModal() {
    if (!isLoggedIn) { window.location.href = `/auth/signup?next=/browse/${listingId}`; return }
    setState('open')
  }

  const canSubmit = childName.trim().length > 0 && childAge.trim().length > 0 && days.length > 0

  async function submit() {
    setState('submitting')
    const res = await fetch('/api/waitlist', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_id:     listingId,
        child_id:       childId,
        child_name:     childName.trim(),
        child_age:      Number(childAge) || null,
        preferred_days: days,
        note:           note.trim() || null,
      }),
    })
    if (res.status === 401) { setState('error'); setErrorMsg(t('notLoggedIn')); return }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setState('error'); setErrorMsg(data.error ?? t('genericError'))
      return
    }
    const data = await res.json()
    setPosition(typeof data.position === 'number' ? data.position : null)
    setState('success')
  }

  const triggerCls = variant === 'sticky'
    ? 'w-full flex items-center justify-center gap-2 py-2.5 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep transition-colors'
    : 'w-full flex items-center justify-center gap-2 py-2.5 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep transition-colors'

  return (
    <>
      <button onClick={openModal} className={triggerCls}>
        <svg width="13" height="13" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5v12M1.5 7.5h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        {t('joinWaitlist')}
      </button>

      {/* Success */}
      {state === 'success' && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setState('idle')} />
          <div className="relative z-10 bg-white rounded-[18px] shadow-xl w-full max-w-[460px] p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-3xl mb-2">🎉</div>
            <h2 className="font-display text-lg font-bold text-ink mb-1">{t('successTitle')}</h2>
            <p className="text-sm text-ink-mid mb-4">{t('successSub', { child: childName, listing: listingTitle })}</p>

            {position !== null && (
              <div className="rounded-[14px] px-5 py-4 mb-4 text-white relative overflow-hidden" style={{ background: 'linear-gradient(150deg,#1c1c27,#2a2438)' }}>
                <div className="font-display text-[10.5px] font-bold tracking-[.12em] uppercase mb-1" style={{ color: '#f5c542' }}>{t('yourPosition')}</div>
                <div className="font-display text-[34px] font-extrabold leading-none">#{position}</div>
                <div className="font-display text-[11.5px] mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {position <= 1 ? t('nextInLine') : t('familiesAhead', { count: position - 1 })}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5 mb-5 text-left">
              <div className="flex items-center gap-2 text-[12.5px] text-ink-mid">
                <span className="text-success">✓</span>{t('emailToYou')}
              </div>
              <div className="flex items-center gap-2 text-[12.5px] text-ink-mid">
                <span className="text-success">✓</span>{t('emailToProvider')}
              </div>
            </div>

            <button onClick={() => setState('idle')} className="w-full py-2.5 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep transition-colors">
              {t('done')}
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      {(state === 'open' || state === 'submitting' || state === 'error') && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setState('idle')} />
          <div className="relative z-10 bg-white rounded-[18px] shadow-xl w-full max-w-[460px] p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setState('idle')} className="absolute top-4 right-4 w-7 h-7 rounded flex items-center justify-center text-ink-muted hover:bg-surface transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>

            <div className="font-display text-[10.5px] font-bold tracking-[.12em] uppercase text-primary mb-1">{t('eyebrow')}</div>
            <h2 className="font-display text-lg font-bold text-ink mb-0.5">{t('modalTitle')}</h2>
            <p className="text-sm text-ink-muted mb-5">{t('modalSub', { listing: listingTitle })}</p>

            {/* Kid picker */}
            {kids && kids.length > 0 && (
              <div className="mb-4">
                <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1.5">{t('forLabel')}</label>
                <div className="flex flex-wrap gap-2">
                  {kids.map(kid => (
                    <button key={kid.id} type="button" onClick={() => toggleKid(kid)}
                      className={cn('px-3 py-1.5 rounded border font-display text-xs font-semibold transition-all',
                        childId === kid.id ? 'bg-primary-lt border-primary text-primary' : 'bg-bg border-border text-ink-mid hover:border-primary')}>
                      {kid.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Name + age */}
            <div className="grid grid-cols-[1fr_84px] gap-2 mb-4">
              <div>
                <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1.5">{t('childName')}</label>
                <input value={childName} onChange={e => { setChildName(e.target.value); setChildId(null) }} placeholder={t('childNamePlaceholder')}
                  className="w-full px-3 py-2 border border-border rounded bg-bg font-body text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary transition-all" />
              </div>
              <div>
                <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1.5">{t('childAge')}</label>
                <input value={childAge} onChange={e => setChildAge(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="—"
                  className="w-full px-3 py-2 border border-border rounded bg-bg font-body text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary transition-all text-center" />
              </div>
            </div>

            {/* Preferred days */}
            <div className="mb-4">
              <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1.5">{t('preferredDays')}</label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map(d => (
                  <button key={d} type="button" onClick={() => toggleDay(d)}
                    className={cn('px-3 py-1.5 rounded-full border font-display text-xs font-semibold transition-all',
                      days.includes(d) ? 'bg-primary border-primary text-white' : 'bg-white border-border text-ink-mid hover:border-primary')}>
                    {t(`days.${d}` as 'days.0')}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="mb-4">
              <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1.5">
                {t('noteLabel')} <span className="text-ink-muted font-normal normal-case">{t('optional')}</span>
              </label>
              <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder={t('notePlaceholder')}
                className="w-full px-3 py-2 border border-border rounded bg-bg font-body text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary transition-all resize-none" />
            </div>

            {/* Auto-filled contact */}
            {contact && (contact.name || contact.email || contact.phone) && (
              <div className="mb-5 rounded-[12px] bg-primary-lt border border-primary-border p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-[11px] font-semibold text-ink-mid">{t('yourContact')}</span>
                  <span className="font-display text-[9.5px] font-bold tracking-[.08em] uppercase bg-white text-primary px-2 py-0.5 rounded-full">{t('fromAccount')}</span>
                </div>
                <div className="flex flex-col gap-1 text-[12.5px] text-ink">
                  {contact.name  && <div>{contact.name}</div>}
                  {contact.phone && <div className="text-ink-mid">{contact.phone}</div>}
                  {contact.email && <div className="text-ink-mid">{contact.email}</div>}
                </div>
              </div>
            )}

            {state === 'error' && (
              <div className="mb-4 bg-danger-lt border border-danger/20 text-danger text-sm rounded p-3">{errorMsg}</div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setState('idle')} className="flex-1 py-2.5 rounded font-display text-sm font-semibold border border-border text-ink-mid hover:bg-surface transition-colors">
                {t('cancel')}
              </button>
              <button onClick={submit} disabled={state === 'submitting' || !canSubmit}
                className="flex-1 py-2.5 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-50 transition-colors">
                {state === 'submitting' ? t('joining') : t('joinWaitlist')}
              </button>
            </div>
            <p className="text-[11px] text-ink-muted text-center mt-3">{t('noPayment')}</p>
          </div>
        </div>
      )}
    </>
  )
}
