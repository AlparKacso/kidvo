'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']
const GOLD   = '#f5c542'
const EMPTY  = '#e8e4f0'

interface EditReviewFormProps {
  reviewId:       string
  initialRating:  number
  initialComment: string | null
  status:         'pending' | 'approved' | 'rejected'
  onCancel?:      () => void
}

export function EditReviewForm({
  reviewId,
  initialRating,
  initialComment,
  status,
  onCancel,
}: EditReviewFormProps) {
  const router = useRouter()

  const [rating,  setRating]  = useState(initialRating)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState(initialComment ?? '')
  const [state,   setState]   = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errMsg,  setErrMsg]  = useState('')

  const active = hovered || rating

  const commentChanged = comment.trim() !== (initialComment ?? '').trim()
  const ratingChanged  = rating !== initialRating
  const hasChanges     = commentChanged || ratingChanged

  // A rating-only change on a rejected review will resubmit for moderation
  const goesToModeration = commentChanged || status === 'rejected'

  const handleSubmit = async () => {
    if (!rating || state === 'submitting' || !hasChanges) return
    setState('submitting')
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rating, comment: comment.trim() || null }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrMsg(data.error ?? 'Something went wrong')
        setState('error')
        return
      }
      setState('success')
      router.refresh()
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
        {goesToModeration ? 'Review updated — awaiting moderation.' : 'Rating updated.'}
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

      {/* Moderation hint */}
      {goesToModeration && hasChanges && (
        <p className="text-xs text-ink-muted">
          {commentChanged
            ? 'Editing your comment will re-submit your review for moderation.'
            : 'Resubmitting your review for moderation.'}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!hasChanges || state === 'submitting'}
          className="px-4 py-2 rounded font-display text-sm font-semibold bg-primary text-white hover:bg-primary-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state === 'submitting' ? 'Saving…' : 'Save changes'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-ink-muted hover:text-ink font-display transition-colors"
          >
            Cancel
          </button>
        )}
        {state === 'error' && (
          <span className="text-sm text-danger">{errMsg}</span>
        )}
      </div>
    </div>
  )
}
