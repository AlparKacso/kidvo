'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

export function FeedbackForm() {
  const t = useTranslations('feedback')
  const [msg,  setMsg]  = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!msg.trim()) return
    setBusy(true)
    await fetch('/api/feedback', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message: msg }),
    })
    setSent(true)
    setBusy(false)
  }

  if (sent) return (
    <div className="space-y-2">
      <p className="text-sm font-display font-semibold" style={{ color: '#1A7A4A' }}>
        {t('sent')}
      </p>
      <p className="text-sm text-ink-muted">{t('googleNudge')}</p>
      <a
        href="https://maps.app.goo.gl/ZtFNm5W13aBqvxuU9"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-4 py-2 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep transition-colors"
      >
        {t('googleCta')} →
      </a>
    </div>
  )

  return (
    <div>
      <textarea
        value={msg}
        onChange={e => setMsg(e.target.value)}
        rows={3}
        placeholder={t('placeholder')}
        className="w-full px-3 py-2 border border-border rounded bg-bg text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary transition-all resize-none mb-2"
      />
      <button
        onClick={submit}
        disabled={busy || !msg.trim()}
        className="px-4 py-2 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep disabled:opacity-40 transition-colors"
      >
        {busy ? t('sending') : t('send')}
      </button>
    </div>
  )
}
