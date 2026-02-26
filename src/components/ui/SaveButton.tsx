'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface SaveButtonProps {
  listingId:    string
  initialSaved: boolean
  variant?:     'icon' | 'full'   // icon = small card button, full = full-width detail page button
}

export function SaveButton({ listingId, initialSaved, variant = 'icon' }: SaveButtonProps) {
  const [saved, setSaved]     = useState(initialSaved)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = '/auth/login'
      return
    }

    // Optimistic update
    setSaved(prev => !prev)

    const res = await fetch('/api/saves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId }),
    })

    if (!res.ok) {
      // Revert on error
      setSaved(prev => !prev)
    }

    setLoading(false)
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={e => { e.preventDefault(); toggle() }}
        disabled={loading}
        title={saved ? 'Remove from saved' : 'Save activity'}
        className={cn(
          'w-[30px] h-[30px] rounded flex items-center justify-center border transition-all flex-shrink-0',
          saved
            ? 'bg-gold-lt border-gold text-gold-deep'
            : 'border-border text-ink-muted hover:bg-gold-lt hover:border-gold hover:text-gold-deep',
        )}
      >
        <svg width="13" height="13" viewBox="0 0 15 15" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4">
          <path d="M7.5 13S2 9 2 5.5a3.5 3.5 0 0 1 5.5-2.9A3.5 3.5 0 0 1 13 5.5C13 9 7.5 13 7.5 13Z" />
        </svg>
      </button>
    )
  }

  return (
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
  )
}
