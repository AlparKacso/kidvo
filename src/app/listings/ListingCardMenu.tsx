'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

interface Props {
  listingId: string
  status?:   string
}

export function ListingCardMenu({ listingId, status }: Props) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const t = useTranslations('listingMenu')
  const router = useRouter()

  const isActive = status === 'active'
  const isPaused = status === 'paused'
  const canPause = isActive || isPaused

  async function handleDelete() {
    if (!window.confirm(t('deleteConfirm'))) return
    setDeleting(true)
    setOpen(false)
    await fetch(`/api/listings/${listingId}`, { method: 'DELETE' })
    router.refresh()
  }

  // Pause/activate is a simple status flip the provider owns under RLS.
  async function handlePauseToggle() {
    setBusy(true)
    setOpen(false)
    const supabase = createClient()
    await supabase.from('listings').update({ status: isActive ? 'paused' : 'active' }).eq('id', listingId)
    setBusy(false)
    router.refresh()
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 flex items-center justify-center rounded text-ink-muted hover:bg-surface transition-colors"
        aria-label={t('actions')}
      >
        <svg width="14" height="14" viewBox="0 0 4 16" fill="currentColor">
          <circle cx="2" cy="2"  r="1.5"/>
          <circle cx="2" cy="8"  r="1.5"/>
          <circle cx="2" cy="14" r="1.5"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 bg-white border border-border rounded-lg shadow-lg py-1 min-w-[150px]">
          <Link
            href={`/browse/${listingId}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-ink-mid hover:bg-surface transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 15 15" fill="none"><path d="M1 7.5S3.5 2 7.5 2 14 7.5 14 7.5 11.5 13 7.5 13 1 7.5 1 7.5Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>
            {t('preview')}
          </Link>
          <Link
            href={`/listings/${listingId}/edit`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-ink-mid hover:bg-surface transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 15 15" fill="none"><path d="M10.5 2.5l2 2-9 9H1.5v-2l9-9Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none"/></svg>
            {t('edit')}
          </Link>
          {canPause && (
            <button
              onClick={handlePauseToggle}
              disabled={busy}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-mid hover:bg-surface transition-colors disabled:opacity-50"
            >
              {isActive ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 15 15" fill="none"><rect x="4" y="3" width="2.5" height="9" rx="0.6" fill="currentColor"/><rect x="8.5" y="3" width="2.5" height="9" rx="0.6" fill="currentColor"/></svg>
                  {busy ? '…' : t('pause')}
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 15 15" fill="none"><path d="M4 3l8 4.5L4 12V3Z" fill="currentColor"/></svg>
                  {busy ? '…' : t('activate')}
                </>
              )}
            </button>
          )}
          <div className="border-t border-border mx-1 my-1" />
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-surface transition-colors disabled:opacity-50"
          >
            <svg width="12" height="12" viewBox="0 0 15 15" fill="none"><path d="M3 3l9 9M12 3l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            {deleting ? '…' : t('delete')}
          </button>
        </div>
      )}
    </div>
  )
}
