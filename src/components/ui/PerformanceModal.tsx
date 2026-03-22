'use client'

import { useState, useEffect } from 'react'

export interface PerformanceRow {
  id:      string
  title:   string
  status:  string
  views:   number
  reveals: number
  trials:  number
}

const STATUS_CLS: Record<string, string> = {
  active:  'bg-success-lt text-success',
  pending: 'bg-gold-lt text-gold-text',
  paused:  'bg-surface text-ink-muted',
  draft:   'bg-surface text-ink-muted',
}

export function PerformanceModal({ rows }: { rows: PerformanceRow[] }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="font-display text-[12.5px] font-semibold text-blue whitespace-nowrap hover:opacity-80"
      >
        View all ({rows.length}) →
      </button>

      {open && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-[22px] w-full max-w-[680px] max-h-[80vh] flex flex-col" style={{ boxShadow: '0 8px 40px rgba(90,70,140,.18)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-[22px] py-[18px] border-b border-border flex-shrink-0">
              <div>
                <div className="font-display text-[17px] font-extrabold tracking-[-0.3px] text-ink">Performance</div>
                <div className="font-display text-[12px] text-ink-muted mt-0.5">All-time · all {rows.length} listings</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:bg-surface transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-y-auto flex-1">
              {/* Col headers */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-[22px] py-[10px] border-b border-border sticky top-0 bg-white">
                <span className="font-display text-[10px] font-bold tracking-[.08em] uppercase text-ink-muted">Listing</span>
                <span className="font-display text-[10px] font-bold tracking-[.08em] uppercase text-ink-muted text-right w-14">Status</span>
                <span className="font-display text-[10px] font-bold tracking-[.08em] uppercase text-ink-muted text-right w-12">Views</span>
                <span className="font-display text-[10px] font-bold tracking-[.08em] uppercase text-ink-muted text-right w-14">Reveals</span>
                <span className="font-display text-[10px] font-bold tracking-[.08em] uppercase text-ink-muted text-right w-12">Trials</span>
              </div>
              {rows.map((r, i) => (
                <div
                  key={r.id}
                  className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-[22px] py-[12px] ${i < rows.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <div className="font-display text-[13px] font-semibold text-ink truncate min-w-0">{r.title}</div>
                  <div className="w-14 flex justify-end">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold font-display capitalize ${STATUS_CLS[r.status] ?? STATUS_CLS.draft}`}>
                      {r.status}
                    </span>
                  </div>
                  <span className="font-display text-[13px] font-bold text-ink text-right w-12 tabular-nums">{r.views}</span>
                  <span className="font-display text-[13px] font-bold text-primary text-right w-14 tabular-nums">{r.reveals}</span>
                  <span className="font-display text-[13px] font-bold text-ink text-right w-12 tabular-nums">{r.trials}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
    </>
  )
}
