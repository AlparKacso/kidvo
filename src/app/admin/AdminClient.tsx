'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
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
    const supabase = createClient()
    await supabase.from('listings').update({ status }).eq('id', listing.id)
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

interface Props {
  pending: Listing[]
  active:  Listing[]
  paused:  Listing[]
}

export function AdminClient({ pending: initialPending, active: initialActive, paused: initialPaused }: Props) {
  const [listings, setListings] = useState<Listing[]>([
    ...initialPending,
    ...initialActive,
    ...initialPaused,
  ])

  function handleStatusChange(id: string, status: string) {
    setListings(prev => prev.map(l => l.id === id ? { ...l, status } : l))
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
            <p className="text-sm text-ink-muted">{pending.length} pending · {active.length} active · {paused.length} paused</p>
          </div>
          <Link href="/browse" className="font-display text-sm font-semibold text-ink-muted hover:text-primary transition-colors">
            ← Back to app
          </Link>
        </div>

        {/* Pending — priority section */}
        {pending.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-muted">Pending approval</div>
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
