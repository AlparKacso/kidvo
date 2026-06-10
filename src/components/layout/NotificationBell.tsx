'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface Notif {
  id: string
  type: string
  payload: { token?: string; childName?: string; listingTitle?: string; providerName?: string }
  read: boolean
  createdAt: string
  phase: string | null
}

export function NotificationBell() {
  const t = useTranslations('notifications')
  const router = useRouter()
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  async function load() {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setItems(data.notifications ?? [])
      setUnread(data.unread ?? 0)
    } catch { /* ignore */ }
  }

  useEffect(() => { load() }, [])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      setUnread(0)
      fetch('/api/notifications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read_all' }),
      }).catch(() => {})
    }
  }

  async function respond(n: Notif, action: 'accept' | 'decline') {
    if (!n.payload.token) return
    setBusy(n.id)
    const res = await fetch(`/api/offers/${n.payload.token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
    })
    setBusy(null)
    if (!res.ok) return
    const data = await res.json().catch(() => ({}))
    setItems(prev => prev.map(x => x.id === n.id ? { ...x, phase: data.phase ?? action + 'ed' } : x))
    router.refresh()
  }

  // Don't render an empty bell for users who never get notifications.
  if (items.length === 0) return null

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} aria-label={t('title')}
        className="relative w-[34px] h-[34px] rounded-full flex items-center justify-center text-ink-mid hover:bg-bg transition-colors flex-shrink-0">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 2a4.5 4.5 0 0 0-4.5 4.5c0 3.5-1.5 4.5-1.5 4.5h12s-1.5-1-1.5-4.5A4.5 4.5 0 0 0 9 2Z"/>
          <path d="M7.5 14a1.5 1.5 0 0 0 3 0"/>
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-gold pulse-gold ring-2 ring-white" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[300px] bg-white border border-border rounded-[14px] shadow-card py-1.5 z-50 max-h-[420px] overflow-y-auto">
          <div className="px-3.5 py-2 font-display text-[13px] font-bold text-ink">{t('title')}</div>
          <div className="h-px bg-border mx-2 mb-1" />
          {items.map(n => {
            const child = n.payload.childName ?? ''
            const listing = n.payload.listingTitle ?? ''
            const provider = n.payload.providerName ?? ''
            if (n.type === 'spot_offer') {
              const pending = n.phase === 'pending' || n.phase == null
              return (
                <div key={n.id} className="px-3 py-2.5 mx-1 rounded-[10px]" style={{ background: '#fffdf5' }}>
                  <div className="font-display text-[12.5px] font-bold text-ink leading-tight mb-0.5">{t('offerTitle', { child })}</div>
                  <div className="font-display text-[11.5px] text-ink-muted mb-2">{listing}{provider && ` · ${provider}`}</div>
                  {pending ? (
                    <div className="flex gap-1.5">
                      <button disabled={busy === n.id} onClick={() => respond(n, 'accept')}
                        className="flex-1 py-1.5 rounded-md font-display text-[11.5px] font-semibold bg-success text-white hover:opacity-90 transition-opacity disabled:opacity-50">{t('accept')}</button>
                      <button disabled={busy === n.id} onClick={() => respond(n, 'decline')}
                        className="flex-1 py-1.5 rounded-md font-display text-[11.5px] font-semibold border border-border text-ink-mid hover:bg-bg transition-colors disabled:opacity-50">{t('decline')}</button>
                    </div>
                  ) : (
                    <div className="font-display text-[11px] font-semibold text-ink-muted">
                      {n.phase === 'accepted' ? `✓ ${t('accepted')}` : n.phase === 'declined' ? t('declined') : t('settled')}
                    </div>
                  )}
                </div>
              )
            }
            // enroll_confirmed / enroll_declined — informational
            const confirmed = n.type === 'enroll_confirmed'
            return (
              <div key={n.id} className="px-3 py-2.5 mx-1">
                <div className="font-display text-[12.5px] font-semibold text-ink leading-tight">
                  {confirmed ? `🎉 ${t('enrollConfirmed', { child })}` : t('enrollDeclined', { child })}
                </div>
                <div className="font-display text-[11.5px] text-ink-muted">{listing}{provider && ` · ${provider}`}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
