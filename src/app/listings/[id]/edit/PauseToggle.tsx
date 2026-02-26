'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  listingId: string
  status:    string
}

export function PauseToggle({ listingId, status: initialStatus }: Props) {
  const [status,  setStatus]  = useState(initialStatus)
  const [loading, setLoading] = useState(false)

  const isActive = status === 'active'
  const isPaused = status === 'paused'
  const isPending = status === 'pending'

  async function toggle() {
    if (!isActive && !isPaused) return
    setLoading(true)
    const supabase  = createClient()
    const newStatus = isActive ? 'paused' : 'active'
    await supabase.from('listings').update({ status: newStatus }).eq('id', listingId)
    setStatus(newStatus)
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-between mb-6 bg-white border border-border rounded-lg px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isActive  ? 'bg-success' :
          isPaused  ? 'bg-zinc-400' :
          isPending ? 'bg-[#F0A500]' : 'bg-border'
        }`} />
        <span className="font-display text-sm font-semibold text-ink capitalize">{status}</span>
        {isPending && <span className="text-xs text-ink-muted">— awaiting review</span>}
        {isPaused  && <span className="text-xs text-ink-muted">— not visible to parents</span>}
        {isActive  && <span className="text-xs text-ink-muted">— visible on browse</span>}
      </div>

      {(isActive || isPaused) && (
        <button
          onClick={toggle}
          disabled={loading}
          className={`px-3 py-1.5 rounded font-display text-xs font-semibold transition-colors disabled:opacity-50 ${
            isActive
              ? 'border border-border text-ink-mid hover:border-danger/50 hover:text-danger'
              : 'border border-border text-ink-mid hover:border-success/50 hover:text-success'
          }`}
        >
          {loading ? '...' : isActive ? 'Pause listing' : 'Unpause listing'}
        </button>
      )}
    </div>
  )
}
