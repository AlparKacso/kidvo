'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  src:     string
  alt:     string
  /** Thumbnail aspect — 4:3 activity hero (default) | 4:5 event poster */
  aspect?: '4/3' | '4/5'
}

// Below this width the source is too low-res to upscale into a
// full-screen modal — we just leave the photo as a static thumbnail.
const ZOOM_MIN_WIDTH = 800

export function CoverPhotoZoom({ src, alt, aspect = '4/3' }: Props) {
  const [open, setOpen]               = useState(false)
  const [zoomable, setZoomable]       = useState(false)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)

  // Track the source's natural dimensions to decide if it's worth zooming
  // and to cap the modal image so we never upscale.
  const measure = useCallback((img: HTMLImageElement) => {
    if (img.naturalWidth >= ZOOM_MIN_WIDTH) {
      setZoomable(true)
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
    }
  }, [])

  const onImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    measure(e.currentTarget)
  }, [measure])

  // Cached / already-complete images can finish loading before React attaches
  // onLoad. Fire the measurement manually when the ref attaches if complete.
  const imgRef = useCallback((node: HTMLImageElement | null) => {
    if (node && node.complete && node.naturalWidth > 0) {
      measure(node)
    }
  }, [measure])

  // ESC closes
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Body scroll lock while modal is open
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    document.documentElement.classList.add('modal-open')
    return () => {
      document.body.style.overflow = ''
      document.documentElement.classList.remove('modal-open')
    }
  }, [open])

  return (
    <>
      {/* Thumbnail card — clickable when source is zoomable */}
      <div
        className={[
          'group relative overflow-hidden rounded-xl border border-border bg-surface shadow-card-on-white',
          aspect === '4/5' ? 'aspect-[4/5]' : 'aspect-[4/3]',
          zoomable ? 'cursor-zoom-in' : '',
        ].join(' ')}
        onClick={zoomable ? () => setOpen(true) : undefined}
        role={zoomable ? 'button' : undefined}
        tabIndex={zoomable ? 0 : undefined}
        onKeyDown={zoomable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true) } } : undefined}
        aria-label={zoomable ? `View ${alt} larger` : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onLoad={onImgLoad}
        />

        {/* Zoom hint — only on hoverable devices and only when zoomable */}
        {zoomable && (
          <div
            className="pointer-events-none absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/55 backdrop-blur-md border border-white/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            aria-hidden
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
              <path d="M11 8v6M8 11h6" />
            </svg>
          </div>
        )}
      </div>

      {/* Full-screen modal */}
      {open && naturalSize && createPortal(
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Image — capped at natural size to avoid upscaling blur */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="relative rounded-xl shadow-2xl object-contain"
            style={{
              maxWidth:  `min(92vw, ${naturalSize.w}px)`,
              maxHeight: `min(92vh, ${naturalSize.h}px)`,
            }}
          />

          {/* Close button */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>,
        document.body,
      )}
    </>
  )
}
