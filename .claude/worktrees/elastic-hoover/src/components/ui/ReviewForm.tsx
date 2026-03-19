'use client'

import { useState } from 'react'

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']
const GOLD  = '#F0A500'
const EMPTY = '#DDD6E8'

interface ReviewFormProps {
  listingId:  string
  providerId: string
  onSuccess?: () => void
}

export function ReviewForm({ listingId, providerId, onSuccess }: ReviewFormProps) {
  const [rating,  setRating]  = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [state,   setState]   = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errMsg,  setErrMsg]  = useState('')

  const active = hovered || rating

  const handleSubmit = async () => {
    if (!rating || state === 'submitting') return
    setState('submitting')
    try {
      const res = await fetch('/api/reviews', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          listing_id:  listingId,
          provider_id: providerId,
          rating,
          comment: comment.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrMsg(data.error ?? 'Something went wrong')
        setState('error')
        return
      }
      setState('success')
      onSuccess?.()
    } catch {
      setErrMsg('Network error — please try again')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-success">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="7.5" cy="7.5" r="6.5" fill="#D6F5E5" />
          <path d="M4.5 7.5l2 2 4-4" stroke="#1A7A4A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Your review has been submitted. Thank you!
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Star picker */}
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(n)}
            className="p-1 transition-transform hover:scale-110"
          >
            <svg width="22" height="22" viewBox="0 0 12 12" fill="none">
              <path
                d="M6 1l1.27 2.57 2.84.41-2.05 2 .48 2.82L6 7.44 3.46 8.8l.48-2.82-2.05-2 2.84-.41L6 1z"
                fill={n <= active ? GOLD : EMPTY}
              />
            </svg>
          </button>
        ))}
        {active > 0 && (
          <span className="ml-1 text-xs text-ink-muted font-display">{LABELS[active]}</span>
        )}
      </div>

      {/* Comment */}
      <textarea
        placeholder="Tell other parents what you liked… (optional)"
        value={comment}
        onChange={e => setComment(e.target.value)}
        className="w-full border border-border rounded p-2.5 font-body text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary resize-none h-20 bg-bg"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!rating || state === 'submitting'}
          className="px-4 py-2 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state === 'submitting' ? 'Submitting…' : 'Submit review'}
        </button>
        {state === 'error' && (
          <span className="text-sm text-danger">{errMsg}</span>
        )}
      </div>
    </div>
  )
}
