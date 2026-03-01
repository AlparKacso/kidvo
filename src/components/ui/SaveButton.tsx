'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Kid { id: string; name: string }

interface SaveButtonProps {
  listingId:    string
  initialSaved: boolean
  variant?:     'icon' | 'full'   // icon = small card button, full = full-width detail page button
}

export function SaveButton({ listingId, initialSaved, variant = 'icon' }: SaveButtonProps) {
  const [saved,      setSaved]      = useState(initialSaved)
  const [loading,    setLoading]    = useState(false)
  const [kids,       setKids]       = useState<Kid[] | null>(null) // null = not fetched yet
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef                   = useRef<HTMLDivElement>(null)

  // Dismiss picker on click-outside
  useEffect(() => {
    if (!showPicker) return
    function onOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [showPicker])

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/auth/login'; return }

    // Filled heart → unsave ALL saves for this listing (across all kids)
    if (saved) {
      setSaved(false)
      setShowPicker(false)
      const r = await fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId }),
      })
      if (!r.ok) setSaved(true)
      return
    }

    // Empty heart → fetch kids list on first click, then decide what to do
    setLoading(true)
    let kidList = kids
    if (kidList === null) {
      const res  = await fetch('/api/kids')
      const data = await res.json()
      kidList    = (data.kids ?? []) as Kid[]
      setKids(kidList)
    }
    setLoading(false)

    if (kidList.length === 0) {
      // Parent has no children set up — save without kid assignment
      setSaved(true)
      const r = await fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId }),
      })
      if (!r.ok) setSaved(false)
    } else {
      // Show kid picker so the parent can tag which child this is for
      setShowPicker(true)
    }
  }

  async function saveForKid(kidId: string) {
    setShowPicker(false)
    setSaved(true)
    const r = await fetch('/api/saves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId, kid_id: kidId }),
    })
    if (!r.ok) setSaved(false)
  }

  // Kid picker dropdown — rendered inside the relative wrapper
  const Picker = showPicker && kids && kids.length > 0 ? (
    <div
      ref={pickerRef}
      className="absolute z-50 right-0 top-full mt-1 bg-white border border-border rounded-lg shadow-lg p-1.5 min-w-[150px]"
    >
      <div className="font-display text-[10px] font-semibold tracking-label uppercase text-ink-muted px-2 py-1">
        Save for
      </div>
      {kids.map(kid => (
        <button
          key={kid.id}
          onClick={e => { e.preventDefault(); e.stopPropagation(); saveForKid(kid.id) }}
          className="w-full text-left px-2 py-1.5 rounded font-display text-sm font-semibold text-ink hover:bg-primary-lt hover:text-primary transition-colors"
        >
          {kid.name}
        </button>
      ))}
    </div>
  ) : null

  if (variant === 'icon') {
    return (
      <div className="relative flex-shrink-0">
        <button
          onClick={toggle}
          disabled={loading}
          title={saved ? 'Remove from saved' : 'Save activity'}
          className={cn(
            'w-[30px] h-[30px] rounded flex items-center justify-center border transition-all',
            saved
              ? 'bg-gold-lt border-gold text-gold-deep'
              : 'border-border text-ink-muted hover:bg-gold-lt hover:border-gold hover:text-gold-deep',
          )}
        >
          <svg width="13" height="13" viewBox="0 0 15 15" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4">
            <path d="M7.5 13S2 9 2 5.5a3.5 3.5 0 0 1 5.5-2.9A3.5 3.5 0 0 1 13 5.5C13 9 7.5 13 7.5 13Z" />
          </svg>
        </button>
        {Picker}
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <button
        onClick={toggle}
        disabled={loading}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2.5 rounded font-display text-sm font-semibold border transition-all',
          saved
            ? 'bg-gold-lt border-gold text-gold-deep'
            : 'bg-white border-border text-ink-mid hover:bg-gold-lt hover:border-gold hover:text-gold-deep',
        )}
      >
        <svg width="13" height="13" viewBox="0 0 15 15" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
          <path d="M7.5 13S2 9 2 5.5a3.5 3.5 0 0 1 5.5-2.9A3.5 3.5 0 0 1 13 5.5C13 9 7.5 13 7.5 13Z"/>
        </svg>
        {saved ? 'Saved' : 'Save to list'}
      </button>
      {Picker}
    </div>
  )
}
