'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgot')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError('')
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? t('genericError'))
      setStatus('idle')
      return
    }
    setStatus('sent')
  }

  const inputCls = 'w-full px-3.5 py-2.5 border border-border rounded-[10px] bg-white font-display text-[13.5px] text-ink placeholder:text-ink-muted outline-none focus:border-primary transition-all'

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block font-display font-black leading-none hover:opacity-80 transition-opacity" style={{ fontSize: '28px', letterSpacing: '-1px' }}>
            <span className="text-ink">kid</span><span className="text-primary">vo</span>
          </Link>
        </div>
        <div className="bg-white border border-border rounded-[18px] p-7 shadow-card">
          {status === 'sent' ? (
            <div className="text-center py-2">
              <div className="text-3xl mb-3">📧</div>
              <h1 className="font-display text-[18px] font-extrabold text-ink mb-2">{t('sentTitle')}</h1>
              <p className="font-display text-[13px] text-ink-muted">{t('sentSub')}</p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-[20px] font-extrabold text-ink mb-1" style={{ letterSpacing: '-0.3px' }}>{t('title')}</h1>
              <p className="font-display text-[13px] text-ink-muted mb-6">{t('subtitle')}</p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="font-display text-[10.5px] font-bold tracking-[.08em] uppercase text-ink-mid block mb-1.5">{t('emailLabel')}</label>
                  <input className={inputCls} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                {error && <div className="bg-[#fff0f0] border border-[#fecaca] text-[#dc2626] font-display text-[12.5px] rounded-[8px] px-3.5 py-2.5">{error}</div>}
                <button type="submit" disabled={status === 'sending'} className="w-full py-2.5 rounded-[10px] font-display text-[13.5px] font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-50 transition-colors mt-1">
                  {status === 'sending' ? t('sending') : t('sendLink')}
                </button>
              </form>
            </>
          )}
        </div>
        <p className="text-center font-display text-[13px] text-ink-muted mt-5">
          <Link href="/auth/login" className="text-primary font-semibold hover:opacity-75 transition-opacity">{t('backToLogin')}</Link>
        </p>
      </div>
    </div>
  )
}
