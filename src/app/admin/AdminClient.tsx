'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  active:  'bg-success-lt text-success',
  pending: 'bg-gold-lt text-gold-text',
  paused:  'bg-zinc-lt text-zinc',
  draft:   'bg-surface text-ink-muted',
}

type Listing = any

function ListingRow({ listing, onStatusChange }: {
  listing: Listing
  onStatusChange: (id: string, status: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState<string | null>(null)

  async function updateStatus(status: string) {
    setLoading(true)
    await fetch(`/api/admin/listings/${listing.id}/status`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status }),
    })
    onStatusChange(listing.id, status)
    setLoading(false)
    setConfirm(null)
  }

  const category = listing.category
  const area     = listing.area
  const provider = listing.provider

  return (
    <div className="bg-white border border-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: category?.accent_color }} />
            <span className="font-display text-xs text-ink-muted">{category?.name} · {area?.name}</span>
            <span className={cn('inline-flex px-2 py-0.5 rounded font-display text-[10px] font-semibold capitalize ml-auto', STATUS_STYLES[listing.status])}>
              {listing.status}
            </span>
          </div>
          <div className="font-display text-sm font-bold text-ink">{listing.title}</div>
          <div className="text-xs text-ink-muted mt-0.5">
            Ages {listing.age_min}–{listing.age_max} · {listing.price_monthly} RON/mo · by {provider?.display_name}
          </div>
          <div className="text-xs text-ink-muted">{provider?.contact_email}</div>
        </div>
      </div>

      {listing.description && (
        <p className="text-xs text-ink-muted mb-3 line-clamp-2">{listing.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={`/browse/${listing.id}`}
          target="_blank"
          className="px-3 py-1.5 rounded font-display text-xs font-semibold border border-border text-ink-mid hover:bg-surface transition-colors"
        >
          Preview ↗
        </Link>

        {listing.status !== 'active' && (
          confirm === 'active' ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-ink-muted">Approve?</span>
              <button onClick={() => updateStatus('active')} disabled={loading} className="px-3 py-1.5 rounded font-display text-xs font-semibold bg-success text-white disabled:opacity-50">Yes</button>
              <button onClick={() => setConfirm(null)} className="px-3 py-1.5 rounded font-display text-xs font-semibold border border-border text-ink-mid">No</button>
            </div>
          ) : (
            <button onClick={() => setConfirm('active')} className="px-3 py-1.5 rounded font-display text-xs font-semibold bg-success text-white hover:opacity-90 transition-opacity">
              ✓ Approve
            </button>
          )
        )}

        {listing.status === 'active' && (
          confirm === 'paused' ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-ink-muted">Pause?</span>
              <button onClick={() => updateStatus('paused')} disabled={loading} className="px-3 py-1.5 rounded font-display text-xs font-semibold bg-danger text-white disabled:opacity-50">Yes</button>
              <button onClick={() => setConfirm(null)} className="px-3 py-1.5 rounded font-display text-xs font-semibold border border-border text-ink-mid">No</button>
            </div>
          ) : (
            <button onClick={() => setConfirm('paused')} className="px-3 py-1.5 rounded font-display text-xs font-semibold border border-danger/50 text-danger hover:bg-danger-lt transition-colors">
              Pause
            </button>
          )
        )}

        {listing.status === 'pending' && (
          confirm === 'declined' ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-ink-muted">Reject?</span>
              <button onClick={() => updateStatus('draft')} disabled={loading} className="px-3 py-1.5 rounded font-display text-xs font-semibold bg-danger text-white disabled:opacity-50">Yes</button>
              <button onClick={() => setConfirm(null)} className="px-3 py-1.5 rounded font-display text-xs font-semibold border border-border text-ink-mid">No</button>
            </div>
          ) : (
            <button onClick={() => setConfirm('declined')} className="px-3 py-1.5 rounded font-display text-xs font-semibold border border-border text-ink-mid hover:border-danger/50 hover:text-danger transition-colors">
              ✕ Reject
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ── Review moderation row ────────────────────────────────────────────────────
const STARS = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)

function ReviewRow({ review, onModerate }: {
  review: any
  onModerate: (id: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState<string | null>(null)

  async function moderate(action: 'approve' | 'reject') {
    setLoading(true)
    await fetch(`/api/reviews/${review.id}/moderate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action }),
    })
    onModerate(review.id)
    setLoading(false)
    setConfirm(null)
  }

  const listing  = review.listing
  const reviewer = review.reviewer

  return (
    <div className="bg-white border border-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-display text-[11px] font-bold text-gold-text">{STARS(review.rating)}</span>
            <span className="text-[10px] text-ink-muted">
              {new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="font-display text-sm font-semibold text-ink mb-0.5">{listing?.title ?? '—'}</div>
          <div className="text-xs text-ink-muted mb-2">by {reviewer?.full_name ?? reviewer?.email ?? 'Unknown'}</div>
          {review.comment && (
            <p className="text-xs text-ink-mid italic bg-bg rounded px-2.5 py-2">"{review.comment}"</p>
          )}
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          {confirm === 'approve' ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-ink-muted">Approve?</span>
              <button onClick={() => moderate('approve')} disabled={loading} className="px-3 py-1.5 rounded font-display text-xs font-semibold bg-success text-white disabled:opacity-50">Yes</button>
              <button onClick={() => setConfirm(null)} className="px-3 py-1.5 rounded font-display text-xs font-semibold border border-border text-ink-mid">No</button>
            </div>
          ) : (
            <button onClick={() => setConfirm('approve')} className="px-3 py-1.5 rounded font-display text-xs font-semibold bg-success text-white hover:opacity-90 transition-opacity">
              ✓ Approve
            </button>
          )}
          {confirm === 'reject' ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-ink-muted">Reject?</span>
              <button onClick={() => moderate('reject')} disabled={loading} className="px-3 py-1.5 rounded font-display text-xs font-semibold bg-danger text-white disabled:opacity-50">Yes</button>
              <button onClick={() => setConfirm(null)} className="px-3 py-1.5 rounded font-display text-xs font-semibold border border-border text-ink-mid">No</button>
            </div>
          ) : (
            <button onClick={() => setConfirm('reject')} className="px-3 py-1.5 rounded font-display text-xs font-semibold border border-border text-ink-mid hover:border-danger/50 hover:text-danger transition-colors">
              ✕ Reject
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface Props {
  pending:        Listing[]
  active:         Listing[]
  paused:         Listing[]
  pendingReviews: any[]
}

export function AdminClient({ pending: initialPending, active: initialActive, paused: initialPaused, pendingReviews: initialReviews }: Props) {
  const [listings, setListings] = useState<Listing[]>([
    ...initialPending,
    ...initialActive,
    ...initialPaused,
  ])
  const [reviews, setReviews] = useState<any[]>(initialReviews)

  function handleStatusChange(id: string, status: string) {
    setListings(prev => prev.map(l => l.id === id ? { ...l, status } : l))
  }

  function handleReviewModerated(id: string) {
    setReviews(prev => prev.filter(r => r.id !== id))
  }

  const pending = listings.filter(l => l.status === 'pending')
  const active  = listings.filter(l => l.status === 'active')
  const paused  = listings.filter(l => l.status === 'paused')

  return (
    <div className="min-h-screen bg-[#F5F4F6] font-body">
      <div className="max-w-[900px] mx-auto px-5 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="font-display leading-none mb-1" style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.03em' }}>
              <span style={{ color: '#523650' }}>kid</span><span style={{ color: '#F0A500' }}>vo</span>
              <span className="text-ink-muted font-body font-normal text-sm ml-2">admin</span>
            </div>
            <p className="text-sm text-ink-muted">
              {pending.length} listings pending · {reviews.length} reviews pending
            </p>
          </div>
          <Link href="/browse" className="font-display text-sm font-semibold text-ink-muted hover:text-primary transition-colors">
            ← Back to app
          </Link>
        </div>

        {/* Pending reviews — top priority */}
        {reviews.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-muted">Reviews pending moderation</div>
              <span className="w-5 h-5 rounded-full bg-primary-lt text-primary font-display text-[10px] font-bold flex items-center justify-center">{reviews.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {reviews.map(r => <ReviewRow key={r.id} review={r} onModerate={handleReviewModerated} />)}
            </div>
          </div>
        )}

        {reviews.length === 0 && (
          <div className="bg-white border border-border rounded-lg p-6 text-center mb-8">
            <div className="text-xl mb-1">★</div>
            <div className="font-display text-sm font-semibold text-ink-mid">No reviews pending moderation</div>
          </div>
        )}

        {/* Pending listings */}
        {pending.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-muted">Listings pending approval</div>
              <span className="w-5 h-5 rounded-full bg-gold-lt text-gold-text font-display text-[10px] font-bold flex items-center justify-center">{pending.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {pending.map(l => <ListingRow key={l.id} listing={l} onStatusChange={handleStatusChange} />)}
            </div>
          </div>
        )}

        {pending.length === 0 && (
          <div className="bg-white border border-border rounded-lg p-8 text-center mb-8">
            <div className="text-2xl mb-2">✓</div>
            <div className="font-display text-sm font-semibold text-ink-mid">No listings pending approval</div>
          </div>
        )}

        {/* Active */}
        {active.length > 0 && (
          <div className="mb-8">
            <div className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-muted mb-3">Active listings</div>
            <div className="flex flex-col gap-3">
              {active.map(l => <ListingRow key={l.id} listing={l} onStatusChange={handleStatusChange} />)}
            </div>
          </div>
        )}

        {/* Paused */}
        {paused.length > 0 && (
          <div>
            <div className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-muted mb-3">Paused listings</div>
            <div className="flex flex-col gap-3">
              {paused.map(l => <ListingRow key={l.id} listing={l} onStatusChange={handleStatusChange} />)}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
