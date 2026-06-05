'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface Summary { phase: string; childName: string; listingTitle: string; providerName: string; already?: boolean }

export default function OfferPage() {
  const params = useParams<{ token: string }>()
  const token  = params?.token as string
  const t = useTranslations('offer')

  const [state, setState] = useState<'loading' | 'ready' | 'submitting' | 'done' | 'notfound'>('loading')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [result,  setResult]  = useState<'accepted' | 'declined' | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/offers/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: Summary) => {
        setSummary(data)
        if (data.phase === 'accepted' || data.phase === 'declined') {
          setResult(data.phase); setState('done')
        } else if (data.phase === 'expired') {
          setState('done')
        } else {
          setState('ready')
        }
      })
      .catch(() => setState('notfound'))
  }, [token])

  async function respond(action: 'accept' | 'decline') {
    setState('submitting')
    const res = await fetch(`/api/offers/${token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
    })
    if (!res.ok) { setState('ready'); return }
    const data = await res.json() as Summary
    setSummary(data)
    setResult(data.phase === 'accepted' ? 'accepted' : 'declined')
    setState('done')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#ece8f5' }}>
      <div className="mb-6">
        <span className="font-display font-black leading-none" style={{ fontSize: '26px', letterSpacing: '-1px' }}>
          <span style={{ color: '#1c1c27' }}>kid</span><span style={{ color: '#7c3aed' }}>vo</span>
        </span>
      </div>

      <div className="bg-white rounded-[18px] shadow-xl w-full max-w-[440px] p-7 text-center">
        {state === 'loading' && <p className="font-display text-sm text-ink-muted py-8">{t('loading')}</p>}

        {state === 'notfound' && (
          <>
            <div className="text-3xl mb-2">🔍</div>
            <h1 className="font-display text-lg font-bold text-ink mb-1">{t('notFoundTitle')}</h1>
            <p className="font-display text-[13px] text-ink-muted">{t('notFoundSub')}</p>
            <BrowseCta label={t('browseCta')} />
          </>
        )}

        {(state === 'ready' || state === 'submitting') && summary && (
          <>
            <div className="text-3xl mb-2">🎉</div>
            <h1 className="font-display text-xl font-bold text-ink mb-1">{t('offerTitle')}</h1>
            <p className="font-display text-[13.5px] text-ink-mid mb-1">
              {t('offerBody', { child: summary.childName, listing: summary.listingTitle })}
            </p>
            <p className="font-display text-[12px] text-ink-muted mb-6">{t('offerNote')}</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => respond('accept')} disabled={state === 'submitting'}
                className="w-full py-3 rounded-[10px] font-display text-sm font-bold bg-primary text-white hover:bg-primary-deep disabled:opacity-50 transition-colors">
                {t('accept')}
              </button>
              <button onClick={() => respond('decline')} disabled={state === 'submitting'}
                className="w-full py-3 rounded-[10px] font-display text-sm font-semibold border border-border text-ink-mid hover:bg-surface disabled:opacity-50 transition-colors">
                {t('decline')}
              </button>
            </div>
          </>
        )}

        {state === 'done' && summary && (
          <>
            <div className="text-3xl mb-2">{result === 'accepted' ? '✅' : result === 'declined' ? '👋' : '⌛'}</div>
            <h1 className="font-display text-lg font-bold text-ink mb-1">
              {result === 'accepted' ? t('acceptedTitle') : result === 'declined' ? t('declinedTitle') : t('expiredTitle')}
            </h1>
            <p className="font-display text-[13px] text-ink-muted">
              {result === 'accepted'
                ? t('acceptedSub', { listing: summary.listingTitle, provider: summary.providerName })
                : result === 'declined'
                ? t('declinedSub')
                : t('expiredSub')}
            </p>
            <BrowseCta label={t('browseCta')} />
          </>
        )}
      </div>
    </div>
  )
}

function BrowseCta({ label }: { label: string }) {
  return (
    <Link
      href="/browse"
      className="inline-flex items-center justify-center mt-6 px-5 py-2.5 rounded-[10px] font-display text-sm font-bold bg-primary text-white hover:bg-primary-deep transition-colors"
    >
      {label}
    </Link>
  )
}
