'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { LocaleToggle } from '@/components/ui/LocaleToggle'

const IconLocation = () => (
  <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
    <path d="M7.5 1.5a5 5 0 0 1 5 5c0 3.5-5 8-5 8s-5-4.5-5-8a5 5 0 0 1 5-5Z" stroke="currentColor" strokeWidth="1.3" fill="none"/>
    <circle cx="7.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
  </svg>
)

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
    <path d="M7.5 1.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" stroke="currentColor" strokeWidth="1.4" fill="none"/>
    <line x1="11" y1="11" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const IconSettings = () => (
  <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
    <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3" fill="none"/>
  </svg>
)

const IconSignOut = () => (
  <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
    <path d="M6 2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3M10 10l3-3-3-3M13 7.5H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

interface TopbarProps {
  isProvider?:    boolean
  userName?:      string
  initials?:      string
  userEmail?:     string
  listingsCount?: number
}

export function Topbar({
  isProvider    = false,
  userName      = '',
  initials      = '?',
  userEmail     = '',
  listingsCount = 0,
}: TopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen,   setMenuOpen]   = useState(false)
  const pathname  = usePathname()
  const isBrowse  = pathname === '/browse'
  const menuRef   = useRef<HTMLDivElement>(null)
  const t = useTranslations('topbar')

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  async function signOut() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const locationLine = (
    <div className="flex items-center gap-1.5 font-display text-xs font-semibold text-ink-muted whitespace-nowrap">
      <IconLocation />
      {t('location', { count: listingsCount })}
    </div>
  )

  const avatarBtn = (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(v => !v)}
        className="w-[34px] h-[34px] rounded-full bg-primary flex items-center justify-center font-display text-xs font-bold text-white hover:opacity-90 transition-opacity flex-shrink-0"
      >
        {initials}
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-[210px] bg-white border border-border rounded-[14px] shadow-card py-1.5 z-50">
          {/* User info */}
          <div className="px-3.5 py-2.5">
            <div className="font-display text-sm font-semibold text-ink leading-tight truncate">{userName}</div>
            <div className="font-display text-[11px] text-ink-muted leading-tight truncate mt-0.5">{userEmail}</div>
          </div>
          <div className="h-px bg-border mx-2 my-1" />
          {/* Actions */}
          <Link
            href="/settings"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2 font-display text-[13px] font-medium text-ink-mid hover:bg-bg hover:text-ink transition-colors mx-1.5 rounded-[8px]"
          >
            <IconSettings /> {t('settings')}
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 font-display text-[13px] font-medium text-ink-mid hover:bg-bg hover:text-danger transition-colors mx-1.5 rounded-[8px]"
            style={{ width: 'calc(100% - 12px)' }}
          >
            <IconSignOut /> {t('signOut')}
          </button>
        </div>
      )}
    </div>
  )

  return (
    <header className="bg-white border-b border-border h-topbar flex items-center gap-3 px-4 md:px-[28px] sticky top-0 z-20">

      {/* ── Mobile content (logo + location + search) ── */}
      <div className="flex md:hidden items-center gap-2 flex-1 min-w-0">
        {searchOpen ? (
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted">
                <IconSearch />
              </span>
              <input
                autoFocus
                type="text"
                placeholder={t('searchPlaceholder')}
                className="w-full pl-8 pr-3 py-1.5 border border-border rounded-full bg-bg font-display text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary transition-all"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const v = (e.target as HTMLInputElement).value
                    if (v) { setSearchOpen(false); window.location.href = `/browse?q=${encodeURIComponent(v)}` }
                  }
                }}
              />
            </div>
            <button onClick={() => setSearchOpen(false)} className="text-xs font-display font-semibold text-primary px-1">
              {t('cancel')}
            </button>
          </div>
        ) : (
          <>
            <Link href="/dashboard" className="font-display font-black leading-none hover:opacity-80 transition-opacity" style={{ fontSize: '22px', letterSpacing: '-1px' }}>
              <span style={{ color: '#1c1c27' }}>kid</span><span style={{ color: '#7c3aed' }}>vo</span>
            </Link>
            <div className="flex-1" />
            <LocaleToggle />
            {!isBrowse && (
              <button
                onClick={() => setSearchOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-ink-muted hover:border-primary transition-colors"
              >
                <IconSearch />
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Desktop content (location) ── */}
      <div className="hidden md:flex items-center gap-3 flex-1">
        {locationLine}
        <div className="flex-1" />
        <LocaleToggle />
      </div>

      {/* ── Avatar + dropdown — rendered ONCE, shared across breakpoints ── */}
      {!searchOpen && avatarBtn}

    </header>
  )
}
