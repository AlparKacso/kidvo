'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface Props {
  listingId:    string
  listingTitle: string
  schedules:    { day_of_week: number; time_start: string; time_end: string }[]
  isFull:       boolean
}

type State = 'idle' | 'open' | 'submitting' | 'success' | 'error'

export function TrialRequestButton({ listingId, listingTitle, schedules, isFull }: Props) {
  const searchParams            = useSearchParams()
  const [state, setState]       = useState<State>('idle')
  const [preferredDay, setDay]  = useState<number | null>(schedules[0]?.day_of_week ?? null)
  const [message, setMessage]   = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (searchParams.get('book') === '1' && !isFull) setState('open')
  }, [searchParams, isFull])

  async function submit() {
    setState('submitting')

    const res = await fetch('/api/trial-requests', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        listing_id:    listingId,
        preferred_day: preferredDay,
        message:       message || null,
      }),
    })

    if (res.status === 401) {
      setState('error')
      setErrorMsg('You must be logged in.')
      return
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setState('error')
      setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
      return
    }

    setState('success')
  }

  if (state === 'success') {
    return (
      <div className="w-full flex flex-col items-center gap-2 py-4 px-3 bg-success-lt border border-success/20 rounded text-center">
        <div className="text-2xl">🎉</div>
        <div className="font-display text-sm font-semibold text-success">Request sent!</div>
        <p className="text-xs text-ink-muted">The provider will get back to you within 24 hours.</p>
      </div>
    )
  }

  return (
    <>
      <button
        disabled={isFull}
        onClick={() => setState('open')}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 15 15" fill="none"><rect x="2" y="2" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.8" fill="none"/><path d="M2 6h11M6 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        Book a trial session
      </button>

      {(state === 'open' || state === 'submitting' || state === 'error') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setState('idle')} />

          <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-[420px] p-6" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setState('idle')}
              className="absolute top-4 right-4 w-7 h-7 rounded flex items-center justify-center text-ink-muted hover:bg-surface transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>

            <h2 className="font-display text-base font-bold text-ink mb-0.5">Book a trial session</h2>
            <p className="text-sm text-ink-muted mb-5">{listingTitle}</p>

            <div className="mb-4">
              <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1.5">
                Preferred day
              </label>
              <div className="flex flex-wrap gap-2">
                {schedules.map(s => (
                  <button
                    key={s.day_of_week}
                    type="button"
                    onClick={() => setDay(s.day_of_week)}
                    className={cn(
                      'px-3 py-1.5 rounded border font-display text-xs font-semibold transition-all',
                      preferredDay === s.day_of_week
                        ? 'bg-primary-lt border-primary text-primary'
                        : 'bg-bg border-border text-ink-mid hover:border-primary'
                    )}
                  >
                    {DAYS[s.day_of_week]} · {s.time_start?.slice(0,5)}–{s.time_end?.slice(0,5)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-mid block mb-1.5">
                Message <span className="text-ink-muted font-normal normal-case">(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. My son is 7 years old and has no prior experience..."
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
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={state === 'submitting' || preferredDay === null}
                className="flex-1 py-2.5 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-50 transition-colors"
              >
                {state === 'submitting' ? 'Sending...' : 'Send request'}
              </button>
            </div>

            <p className="text-[11px] text-ink-muted text-center mt-3">
              No payment required · Provider responds within 24h
            </p>
          </div>
        </div>
      )}
    </>
  )
}
