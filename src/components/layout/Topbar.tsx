'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const IconSearch   = () => <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" stroke="#A8A8AD" strokeWidth="1.4" fill="none"/><line x1="11" y1="11" x2="14" y2="14" stroke="#A8A8AD" strokeWidth="1.5" strokeLinecap="round"/></svg>
const IconLocation = () => <svg width="12" height="12" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5a5 5 0 0 1 5 5c0 3.5-5 8-5 8s-5-4.5-5-8a5 5 0 0 1 5-5Z" stroke="#A8A8AD" strokeWidth="1.3" fill="none"/><circle cx="7.5" cy="6.5" r="1.5" stroke="#A8A8AD" strokeWidth="1.3" fill="none"/></svg>

export function Topbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()
  const isBrowse = pathname === '/browse'

  return (
    <header className="bg-white border-b border-border h-topbar flex items-center gap-3 px-4 md:px-[28px] sticky top-0 z-10">

      {/* Mobile */}
      <div className="flex md:hidden items-center gap-2 flex-1">
        {searchOpen ? (
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"><IconSearch /></span>
              <input autoFocus type="text" placeholder="Search activities…"
                className="w-full pl-8 pr-3 py-1.5 border border-border rounded bg-bg font-body text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary transition-all"
                onKeyDown={e => { if (e.key === 'Enter') { const v = (e.target as HTMLInputElement).value; if (v) { setSearchOpen(false); window.location.href = `/browse?q=${encodeURIComponent(v)}` } } }}
              />
            </div>
            <button onClick={() => setSearchOpen(false)} className="text-xs font-display font-semibold text-primary px-1">Cancel</button>
          </div>
        ) : (
          <>
            <Link href="/browse" className="font-display leading-none" style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.03em' }}>
              <span style={{ color: '#523650' }}>kid</span><span style={{ color: '#F0A500' }}>vo</span>
            </Link>
            <div className="flex items-center gap-1.5 font-display text-xs font-semibold text-ink-muted ml-2">
              <IconLocation />Timișoara
            </div>
            <div className="flex-1" />
            <span className="font-display text-[9px] text-ink-muted italic tracking-wide">
              where your <span style={{ color: '#523650' }}>kid</span> finds their <span style={{ color: '#F0A500' }}>vo</span>cation
            </span>
            {!isBrowse && <button onClick={() => setSearchOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-ink-muted hover:border-primary transition-colors">
              <IconSearch />
            </button>}
          </>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden md:flex items-center gap-3 flex-1">
        {!isBrowse && (
        <div className="relative flex-1 max-w-[380px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"><IconSearch /></span>
          <input type="text" placeholder="Search activities, providers, areas…"
            className="w-full pl-8 pr-3 py-1.5 border border-border rounded bg-bg font-body text-base text-ink placeholder:text-ink-muted outline-none focus:border-primary focus:shadow-focus transition-all"
            onKeyDown={e => { if (e.key === 'Enter') { const v = (e.target as HTMLInputElement).value; if (v) window.location.href = `/browse?q=${encodeURIComponent(v)}` } }}
          />
        </div>
        )}
        <div className="w-px h-[22px] bg-border flex-shrink-0" />
        <div className="flex items-center gap-1.5 font-display text-xs font-semibold text-ink-muted whitespace-nowrap">
          <IconLocation />Timișoara
        </div>
        <div className="flex-1" />
        <span className="font-display text-[10px] text-ink-muted italic tracking-wide">
          where your <span style={{ color: '#523650' }}>kid</span> finds their <span style={{ color: '#F0A500' }}>vo</span>cation
        </span>
      </div>

    </header>
  )
}
