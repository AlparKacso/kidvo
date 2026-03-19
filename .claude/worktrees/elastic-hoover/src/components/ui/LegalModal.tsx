'use client'

import { useEffect } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function LegalModal({ title, onClose, children }: Props) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl border border-[#e8e0ec] w-full max-w-[680px] max-h-[80vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e0ec] flex-shrink-0">
          <h2 className="font-display text-base font-bold text-[#1a0f1e]">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9b89a5] hover:bg-[#f0ebf4] hover:text-[#523650] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 py-5 text-sm text-[#4a3a52] leading-relaxed flex flex-col gap-5">
          {children}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e8e0ec] flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg font-display text-sm font-semibold bg-[#523650] text-white hover:bg-[#3d2840] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
