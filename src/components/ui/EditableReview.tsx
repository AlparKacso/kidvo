'use client'

import { useState } from 'react'
import { StarRating }     from '@/components/ui/StarRating'
import { EditReviewForm } from '@/components/ui/EditReviewForm'

interface EditableReviewProps {
  reviewId:  string
  rating:    number
  comment:   string | null
  createdAt: string
}

export function EditableReview({ reviewId, rating, comment, createdAt }: EditableReviewProps) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <div className="py-3 border-b border-border last:border-0">
        <EditReviewForm
          reviewId={reviewId}
          initialRating={rating}
          initialComment={comment}
          status="approved"
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-2 mb-1">
        <StarRating rating={rating} size="sm" />
        <span className="text-[11px] text-ink-muted">
          {new Date(createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
        </span>
        <span className="text-[11px] text-ink-muted">·</span>
        <span className="font-display text-[11px] text-ink-muted">Your review</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="ml-auto font-display text-[11px] font-semibold text-primary hover:underline"
        >
          Edit
        </button>
      </div>
      {comment && (
        <p className="text-sm text-ink-mid leading-relaxed">{comment}</p>
      )}
    </div>
  )
}
