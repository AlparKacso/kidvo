'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

interface Props {
  listingId: string
}

export function ListingCardMenu({ listingId }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
        aria-label="Actions"
      >
        <svg width="14" height="14" viewBox="0 0 4 16" fill="currentColor">
          <circle cx="2" cy="2"  r="1.5"/>
          <circle cx="2" cy="8"  r="1.5"/>
          <circle cx="2" cy="14" r="1.5"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 bg-white border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
          <Link
            href={`/browse/${listingId}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-ink-mid hover:bg-surface transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 15 15" fill="none"><path d="M1 7.5S3.5 2 7.5 2 14 7.5 14 7.5 11.5 13 7.5 13 1 7.5 1 7.5Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>
            Preview
          </Link>
          <Link
            href={`/listings/${listingId}/edit`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-ink-mid hover:bg-surface transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 15 15" fill="none"><path d="M10.5 2.5l2 2-9 9H1.5v-2l9-9Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none"/></svg>
            Edit
          </Link>
        </div>
      )}
    </div>
  )
}
