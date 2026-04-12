'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'

interface Props {
  listingId:    string
  listingTitle: string
  /** 'full' renders an outlined button (detail page); 'icon' renders a compact icon (listing card). */
  variant?: 'full' | 'icon'
}

const APP_URL = 'https://kidvo.eu'

export function ShareButton({ listingId, listingTitle, variant = 'full' }: Props) {
  const [open, setOpen]     = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const t = useTranslations('share')

  const url  = `${APP_URL}/browse/${listingId}`
  const text = `${listingTitle} — ${t('trialCta')}\n${url}`
  const waHref = `https://wa.me/?text=${encodeURIComponent(text)}`

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function copyLink() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: listingTitle, text: t('trialCta'), url })
        setOpen(false)
      } catch { /* user cancelled */ }
    }
  }

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  const triggerCls = variant === 'full'
    ? 'w-full flex items-center justify-center gap-2 py-2.5 rounded font-display text-sm font-semibold border border-border text-ink-mid hover:border-primary hover:text-primary transition-colors'
    : 'w-8 h-8 flex items-center justify-center rounded text-ink-muted hover:bg-surface hover:text-primary transition-colors'

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className={triggerCls}>
        {/* Share icon */}
        <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
          <path d="M11 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM4 6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" stroke="currentColor" strokeWidth="1.3" fill="none"/>
          <path d="M5.5 6.5l4-3M5.5 8.5l4 3" stroke="currentColor" strokeWidth="1.3"/>
        </svg>
        {variant === 'full' && t('share')}
      </button>

      {open && (
        <div
          className={`absolute z-30 bg-white border border-border rounded-lg shadow-lg py-1 min-w-[180px] ${
            variant === 'icon' ? 'right-0 top-9' : 'left-0 bottom-full mb-1'
          }`}
        >
          {/* WhatsApp */}
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-ink-mid hover:bg-surface transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            WhatsApp
          </a>

          {/* Copy link */}
          <button
            onClick={copyLink}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ink-mid hover:bg-surface transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
              <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
              <path d="M3 10H2.5A1.5 1.5 0 0 1 1 8.5v-6A1.5 1.5 0 0 1 2.5 1h6A1.5 1.5 0 0 1 10 2.5V3" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
            {copied ? t('copied') : t('copyLink')}
          </button>

          {/* Native share (mobile) */}
          {hasNativeShare && (
            <button
              onClick={nativeShare}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ink-mid hover:bg-surface transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                <path d="M7.5 1v9M4 4l3.5-3.5L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 10v2.5A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              {t('more')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
