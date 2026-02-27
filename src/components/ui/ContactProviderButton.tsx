'use client'

import { useState } from 'react'

interface Props {
  displayName:  string
  contactEmail: string
  contactPhone: string | null
}

export function ContactProviderButton({ displayName, contactEmail, contactPhone }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded font-display text-sm font-semibold border border-border text-ink-mid hover:bg-surface transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 15 15" fill="none"><path d="M2 3.5h11M2 7.5h8M2 11.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
        Contact provider
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-[360px] p-6">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded flex items-center justify-center text-ink-muted hover:bg-surface transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>

            <h2 className="font-display text-base font-bold text-ink mb-0.5">Contact provider</h2>
            <p className="text-sm text-ink-muted mb-5">{displayName}</p>

            <div className="flex flex-col gap-3">
              <a
                href={`mailto:${contactEmail}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:border-primary hover:bg-primary-lt transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center flex-shrink-0 group-hover:bg-white transition-colors">
                  <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                    <rect x="1.5" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                    <path d="M1.5 4.5l6 4.5 6-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-muted mb-0.5">Email</div>
                  <div className="text-sm text-ink truncate">{contactEmail}</div>
                </div>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-ink-muted flex-shrink-0">
                  <path d="M4.5 2.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>

              {contactPhone && (
                <a
                  href={`tel:${contactPhone}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:border-primary hover:bg-primary-lt transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center flex-shrink-0 group-hover:bg-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                      <path d="M4.5 1.5h2l1 3-1.5 1a8 8 0 0 0 3.5 3.5l1-1.5 3 1v2a1 1 0 0 1-1 1A11 11 0 0 1 3.5 2.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-muted mb-0.5">Phone</div>
                    <div className="text-sm text-ink">{contactPhone}</div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-ink-muted flex-shrink-0">
                    <path d="M4.5 2.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              )}
            </div>

            <p className="text-[11px] text-ink-muted text-center mt-4 leading-relaxed">
              You're contacting this provider directly.<br />kidvo is not involved in this communication.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
