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
    <p className="text-sm font-display font-semibold" style={{ color: '#1A7A4A' }}>
      {t('sent')}
    </p>
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
