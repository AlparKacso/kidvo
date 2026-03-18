'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// Locked to ActivityCard header ratio: 800 × 350 ≈ 16:7
const OUT_W = 800
const OUT_H = 350
const ASPECT = OUT_W / OUT_H  // ≈ 2.286

interface Crop { x: number; y: number; w: number; h: number }

interface Props {
  src:       string                                        // data-URL of the raw file
  onConfirm: (blob: Blob, previewUrl: string) => void
  onCancel:  () => void
}

export function CoverCropModal({ src, onConfirm, onCancel }: Props) {
  const imgRef     = useRef<HTMLImageElement>(null)
  const previewRef = useRef<HTMLCanvasElement>(null)

  const [natSize, setNatSize] = useState<{ w: number; h: number } | null>(null)
  const [crop,    setCrop]    = useState<Crop | null>(null)
  const [dragging, setDragging] = useState(false)
  const origin = useRef<{ mx: number; my: number; cx: number; cy: number } | null>(null)

  /* ── Init crop centered on load ── */
  function onLoad() {
    const img = imgRef.current!
    const natW = img.naturalWidth
    const natH = img.naturalHeight
    let w: number, h: number
    if (natW / natH > ASPECT) { h = natH; w = h * ASPECT }
    else                       { w = natW; h = w / ASPECT }
    setNatSize({ w: natW, h: natH })
    setCrop({ x: (natW - w) / 2, y: (natH - h) / 2, w, h })
  }

  /* ── Live preview canvas ── */
  useEffect(() => {
    if (!crop || !natSize || !imgRef.current || !previewRef.current) return
    const canvas = previewRef.current
    canvas.width = 280; canvas.height = 120
    canvas.getContext('2d')!.drawImage(
      imgRef.current, crop.x, crop.y, crop.w, crop.h, 0, 0, 280, 120
    )
  }, [crop, natSize])

  /* ── Drag to reposition ── */
  function startDrag(e: React.MouseEvent | React.TouchEvent) {
    if (!crop) return
    e.preventDefault()
    const pt = 'touches' in e ? e.touches[0] : e
    origin.current = { mx: pt.clientX, my: pt.clientY, cx: crop.x, cy: crop.y }
    setDragging(true)
  }

  const moveDrag = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragging || !origin.current || !crop || !natSize || !imgRef.current) return
    const pt    = 'touches' in e ? (e as TouchEvent).touches[0] : (e as MouseEvent)
    const scale = natSize.w / imgRef.current.clientWidth
    const dx    = (pt.clientX - origin.current.mx) * scale
    const dy    = (pt.clientY - origin.current.my) * scale
    setCrop(p => p ? {
      ...p,
      x: Math.max(0, Math.min(natSize.w - p.w, origin.current!.cx + dx)),
      y: Math.max(0, Math.min(natSize.h - p.h, origin.current!.cy + dy)),
    } : p)
  }, [dragging, crop, natSize])

  const endDrag = useCallback(() => setDragging(false), [])

  useEffect(() => {
    window.addEventListener('mousemove', moveDrag)
    window.addEventListener('mouseup',   endDrag)
    window.addEventListener('touchmove', moveDrag, { passive: false })
    window.addEventListener('touchend',  endDrag)
    return () => {
      window.removeEventListener('mousemove', moveDrag)
      window.removeEventListener('mouseup',   endDrag)
      window.removeEventListener('touchmove', moveDrag)
      window.removeEventListener('touchend',  endDrag)
    }
  }, [moveDrag, endDrag])

  /* ── Confirm: generate output blob ── */
  function apply() {
    if (!crop || !imgRef.current) return
    const c = document.createElement('canvas')
    c.width = OUT_W; c.height = OUT_H
    c.getContext('2d')!.drawImage(imgRef.current, crop.x, crop.y, crop.w, crop.h, 0, 0, OUT_W, OUT_H)
    c.toBlob(blob => {
      if (!blob) return
      onConfirm(blob, c.toDataURL('image/jpeg', 0.92))
    }, 'image/jpeg', 0.92)
  }

  /* ── Overlay percentages ── */
  const pct = crop && natSize ? {
    l: (crop.x                          / natSize.w) * 100,
    t: (crop.y                          / natSize.h) * 100,
    r: ((natSize.w - crop.x - crop.w)   / natSize.w) * 100,
    b: ((natSize.h - crop.y - crop.h)   / natSize.h) * 100,
  } : null

  return (
    <div className="fixed inset-0 z-[200] bg-black/75 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <div className="font-display text-base font-bold text-ink">Crop cover photo</div>
            <div className="text-[11px] text-ink-muted mt-0.5">Drag the bright area to choose what to show on the card</div>
          </div>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-full bg-surface flex items-center justify-center hover:bg-border transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col md:flex-row gap-5 p-5 overflow-y-auto flex-1 min-h-0">

          {/* Crop area */}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-display font-semibold tracking-label uppercase text-ink-muted mb-2">
              Adjust position
            </div>
            <div className="relative select-none overflow-hidden rounded-xl border border-border">
              {/* Hidden img used for natural-size canvas drawing */}
              <img
                ref={imgRef}
                src={src}
                alt=""
                className="w-full block"
                onLoad={onLoad}
                draggable={false}
              />

              {pct && (
                <>
                  {/* Semi-transparent overlay — top */}
                  <div className="absolute inset-x-0 top-0 bg-black/50 pointer-events-none"
                    style={{ height: `${pct.t}%` }} />
                  {/* bottom */}
                  <div className="absolute inset-x-0 bottom-0 bg-black/50 pointer-events-none"
                    style={{ height: `${pct.b}%` }} />
                  {/* left */}
                  <div className="absolute left-0 bg-black/50 pointer-events-none"
                    style={{ top: `${pct.t}%`, bottom: `${pct.b}%`, width: `${pct.l}%` }} />
                  {/* right */}
                  <div className="absolute right-0 bg-black/50 pointer-events-none"
                    style={{ top: `${pct.t}%`, bottom: `${pct.b}%`, width: `${pct.r}%` }} />

                  {/* Draggable crop rect */}
                  <div
                    className={`absolute border-2 border-white/90 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                    style={{ left: `${pct.l}%`, top: `${pct.t}%`, right: `${pct.r}%`, bottom: `${pct.b}%` }}
                    onMouseDown={startDrag}
                    onTouchStart={startDrag}
                  >
                    {/* Rule-of-thirds guides */}
                    <div className="absolute top-1/3 inset-x-0 h-px bg-white/30 pointer-events-none" />
                    <div className="absolute top-2/3 inset-x-0 h-px bg-white/30 pointer-events-none" />
                    <div className="absolute left-1/3 inset-y-0 w-px bg-white/30 pointer-events-none" />
                    <div className="absolute left-2/3 inset-y-0 w-px bg-white/30 pointer-events-none" />
                    {/* Corner handles */}
                    {['-top-1 -left-1', '-top-1 -right-1', '-bottom-1 -left-1', '-bottom-1 -right-1'].map(pos => (
                      <div key={pos} className={`absolute w-3 h-3 bg-white rounded-sm pointer-events-none ${pos}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Preview panel */}
          <div className="md:w-[280px] flex-shrink-0">
            <div className="text-[10px] font-display font-semibold tracking-label uppercase text-ink-muted mb-2">
              Card preview
            </div>
            <div className="rounded-[18px] border-[1.5px] border-border overflow-hidden shadow-card">
              {/* Live preview canvas */}
              <canvas
                ref={previewRef}
                width={280}
                height={120}
                className="w-full block"
                style={{ background: '#ede9f8' }}
              />
              {/* Mock card body skeleton */}
              <div className="p-3.5 bg-white">
                <div className="h-3 w-16 bg-surface rounded-full mb-2.5" />
                <div className="flex gap-1.5 mb-2.5">
                  <div className="h-2 w-12 bg-surface rounded-full" />
                  <div className="h-2 w-10 bg-surface rounded-full" />
                  <div className="h-2 w-14 bg-surface rounded-full" />
                </div>
                <div className="h-3.5 w-36 bg-surface rounded-full mb-1" />
                <div className="h-2.5 w-24 bg-surface rounded-full mb-3" />
                <div className="flex items-center justify-between">
                  <div className="h-4 w-16 bg-surface rounded-full" />
                  <div className="h-7 w-20 bg-primary/20 rounded-lg" />
                </div>
              </div>
            </div>
            <div className="text-[10px] text-ink-muted text-center mt-2">
              This is how your photo will appear on the activity card
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border bg-surface/40 flex-shrink-0">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border font-display text-sm font-semibold text-ink-mid hover:border-primary hover:text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={apply}
            className="px-4 py-2 rounded-lg bg-primary font-display text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Use this photo ✓
          </button>
        </div>
      </div>
    </div>
  )
}
