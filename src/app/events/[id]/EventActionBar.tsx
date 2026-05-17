'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { SaveButton } from '@/components/ui/SaveButton'
import { googleCalendarUrl, downloadIcs, type CalendarEvent } from '@/lib/calendarLinks'

export function EventActionBar({
  listingId, initialSaved, calEvent, shareTitle,
}: {
  listingId:    string
  initialSaved: boolean
  calEvent:     CalendarEvent | null
  shareTitle:   string
}) {
  const t = useTranslations('events')
  const [calOpen, setCalOpen] = useState(false)
  const calRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!calOpen) return
    function onOutside(e: MouseEvent) {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [calOpen])

  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (navigator.share) {
      try { await navigator.share({ title: shareTitle, url }); return } catch { /* cancelled */ }
    }
    try { await navigator.clipboard.writeText(url); alert(t('linkCopied')) } catch { /* noop */ }
  }

  const btn = 'inline-flex items-center gap-2 font-display text-[13px] font-semibold px-3 sm:px-4 py-2.5 rounded-lg border transition-colors whitespace-nowrap'
  const calItem = 'flex items-center gap-2.5 w-full text-left bg-transparent border-none px-2.5 py-2 rounded-lg font-display text-[13px] font-semibold text-ink cursor-pointer no-underline hover:bg-primary-lt hover:text-primary'

  return (
    <div className="flex items-center gap-2 flex-nowrap">
      {calEvent && (
        <div ref={calRef} className="relative">
          <button type="button" onClick={() => setCalOpen(v => !v)} aria-haspopup="menu" aria-expanded={calOpen}
            className={`${btn} bg-ink text-white border-ink hover:opacity-90`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span className="hidden sm:inline">{t('addToCalendar')}</span><span className="sm:hidden">{t('addToCalendarShort')}</span> ▾
          </button>
          {calOpen && (
            <div role="menu" className="absolute left-0 top-[calc(100%+6px)] min-w-[200px] z-50 bg-white border border-border rounded-[12px] p-1.5 [animation:cardMenuIn_.15s_ease-out]"
              style={{ boxShadow: '0 16px 40px rgba(28,28,39,0.18), 0 2px 8px rgba(28,28,39,0.08)' }}>
              <a className={calItem} href={googleCalendarUrl(calEvent)} target="_blank" rel="noopener noreferrer" onClick={() => setCalOpen(false)}>
                <span className="text-[15px] w-[18px] text-center">📅</span> {t('calGoogle')}
              </a>
              <button type="button" className={calItem} onClick={() => { downloadIcs(calEvent); setCalOpen(false) }}>
                <span className="text-[15px] w-[18px] text-center">🍎</span> {t('calApple')}
              </button>
              <button type="button" className={calItem} onClick={() => { downloadIcs(calEvent); setCalOpen(false) }}>
                <span className="text-[15px] w-[18px] text-center">⬇︎</span> {t('calIcs')}
              </button>
            </div>
          )}
        </div>
      )}
      <button type="button" onClick={share} className={`${btn} bg-white text-ink-mid border-border hover:border-primary hover:text-primary`}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        <span className="hidden sm:inline">{t('share')}</span>
      </button>
      <SaveButton listingId={listingId} initialSaved={initialSaved} variant="icon" />
    </div>
  )
}
