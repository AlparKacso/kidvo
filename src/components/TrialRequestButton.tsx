'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface Kid { id: string; name: string }

interface Props {
  listingId:    string
  listingTitle: string
  schedules:    { day_of_week: number; time_start: string; time_end: string }[]
  isFull:       boolean
  isLoggedIn:   boolean
}

type State = 'idle' | 'open' | 'submitting' | 'success' | 'error'

export function TrialRequestButton({ listingId, listingTitle, schedules, isFull, isLoggedIn }: Props) {
  const searchParams            = useSearchParams()
  const [state, setState]       = useState<State>('idle')
  const [preferredDay, setDay]  = useState<number | null>(null)
  const [message, setMessage]   = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [kids,     setKids]     = useState<Kid[] | null>(null)
  const [childId,  setChildId]  = useState<string | null>(null)
  const t = useTranslations('trial')

  // Pre-fetch kids on mount so data is ready when modal opens (no lag)
  useEffect(() => {
    if (!isLoggedIn) return
    fetch('/api/kids')
      .then(r => r.json())
      .then(data => {
        const list = (data.kids ?? []) as Kid[]
        setKids(list)
        if (list.length === 1) setChildId(list[0].id)
      })
      .catch(() => setKids([]))
  }, [isLoggedIn])

  useEffect(() => {
    if (searchParams.get('book') === '1' && !isFull) openModal()
  }, [searchParams, isFull])

  // The page can render two TrialRequestButton instances for the same listing
  // (desktop CTA card + mobile sticky bottom bar). When ?book=1 auto-opens both
  // at once, one instance succeeds while the other is still showing its booking
  // modal underneath. Broadcast on success so siblings close their modals.
  useEffect(() => {
    function handleSiblingSuccess(e: Event) {
      const detail = (e as CustomEvent<{ listingId: string }>).detail
      if (detail?.listingId !== listingId) return
      // The dispatcher's prev is already 'success', so this is a no-op there.
      // Other instances reset, which closes their booking modal.
      setState(prev => prev === 'success' ? prev : 'idle')
    }
    window.addEventListener('kidvo:trial-success', handleSiblingSuccess as EventListener)
    return () => window.removeEventListener('kidvo:trial-success', handleSiblingSuccess as EventListener)
  }, [listingId])

  function openModal() {
    setState('open')
  }

  async function submit() {
    setState('submitting')

    const res = await fetch('/api/trial-requests', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        listing_id:    listingId,
        preferred_day: preferredDay,
        message:       message || null,
        child_id:      childId,
      }),
    })

    if (res.status === 401) {
      setState('error')
      setErrorMsg(t('notLoggedIn'))
      return
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setState('error')
      setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
      return
    }

    setState('success')
    window.dispatchEvent(new CustomEvent('kidvo:trial-success', { detail: { listingId } }))
  }

  return (
    <>
      <button
        disabled={isFull}
        onClick={() => {
          if (!isLoggedIn) { window.location.href = `/auth/signup?next=/browse/${listingId}`; return }
          openModal()
        }}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 15 15" fill="none"><rect x="2" y="2" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.8" fill="none"/><path d="M2 6h11M6 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        {t('bookTrial')}
      </button>

      {state === 'success' && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setState('idle')} />

          <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-[420px] p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-3xl mb-2">🎉</div>
            <h2 className="font-display text-base font-bold text-success mb-2">{t('successTitle')}</h2>
            <p className="text-sm text-ink-mid leading-relaxed mb-1.5">{t('successWhatNext')}</p>
            <p className="text-xs text-ink-muted mb-5">{t('successEmailHint')}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setState('idle')}
                className="flex-1 py-2.5 rounded font-display text-sm font-semibold border border-border text-ink-mid hover:bg-surface transition-colors"
              >
                {t('successDone')}
              </button>
              <a
                href="/bookings"
                className="flex-1 py-2.5 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep transition-colors flex items-center justify-center"
              >
                {t('successViewBookings')}
              </a>
            </div>
          </div>
        </div>
      )}

      {(state === 'open' || state === 'submitting' || state === 'error') && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setState('idle')} />

          <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-[420px] p-6" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setState('idle')}
              className="absolute top-4 right-4 w-7 h-7 rounded flex items-center justify-center text-ink-muted hover:bg-surface transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>

            <h2 className="font-display text-base font-bold text-ink mb-0.5">{t('bookTrial')}</h2>
            <p className="text-sm text-ink-muted mb-5">{listingTitle}</p>

            {/* Kid picker — only shown when the parent has children */}
            {kids && kids.length > 0 && (
              <div className="mb-4">
                <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1.5">
                  {t('forLabel')} <span className="text-ink-muted font-normal normal-case">{t('optional')}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {kids.map(kid => (
                    <button
                      key={kid.id}
                      type="button"
                      onClick={() => setChildId(prev => prev === kid.id ? null : kid.id)}
                      className={cn(
                        'px-3 py-1.5 rounded border font-display text-xs font-semibold transition-all',
                        childId === kid.id
                          ? 'bg-primary-lt border-primary text-primary'
                          : 'bg-bg border-border text-ink-mid hover:border-primary'
                      )}
                    >
                      {kid.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1.5">
                {t('preferredDay')}
              </label>
              <div className="flex flex-wrap gap-2">
                {schedules.map(s => (
                  <button
                    key={s.day_of_week}
                    type="button"
                    onClick={() => setDay(prev => prev === s.day_of_week ? null : s.day_of_week)}
                    className={cn(
                      'px-3 py-1.5 rounded border font-display text-xs font-semibold transition-all',
                      preferredDay === s.day_of_week
                        ? 'bg-primary-lt border-primary text-primary'
                        : 'bg-bg border-border text-ink-mid hover:border-primary'
                    )}
                  >
                    {t(`days.${s.day_of_week}` as any)} · {s.time_start?.slice(0,5)}–{s.time_end?.slice(0,5)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1.5">
                {t('messageLabel')} <span className="text-ink-muted font-normal normal-case">{t('optional')}</span>
              </label>
              <textarea
                rows={3}
                placeholder={t('messagePlaceholder')}
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded bg-bg font-body text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary transition-all resize-none"
              />
            </div>

            {state === 'error' && (
              <div className="mb-4 bg-danger-lt border border-danger/20 text-danger text-sm rounded p-3">{errorMsg}</div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setState('idle')}
                className="flex-1 py-2.5 rounded font-display text-sm font-semibold border border-border text-ink-mid hover:bg-surface transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={submit}
                disabled={state === 'submitting' || preferredDay === null}
                className="flex-1 py-2.5 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-50 transition-colors"
              >
                {state === 'submitting' ? t('sending') : t('sendRequest')}
              </button>
            </div>

            <p className="text-[11px] text-ink-muted text-center mt-3">
              {t('noPayment')}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
