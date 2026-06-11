'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ComingUpBand } from '@/components/ui/ComingUpBand'
import type { ListingWithRelations } from '@/types/database'

const DISMISS_KEY = 'kidvo:browse-events-dismissed'

// Read storage before paint (no flash) on the client; fall back to useEffect on
// the server to silence the SSR warning.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * The /browse events band is a one-time teaser. The first time the parent scrolls
 * past it, it dismisses for the rest of the session — it never comes back on
 * scroll-back or refresh, so the sticky search/filter bar becomes the topmost
 * thing. Events keep their own /events surface.
 */
export function BrowseEventsTeaser({ events }: { events: ListingWithRelations[] }) {
  const [dismissed, setDismissed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Already dismissed this session → hide before the first paint (no flash, no shift).
  useIsoLayoutEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') setDismissed(true)
    } catch { /* storage blocked — keep showing the teaser */ }
  }, [])

  // Dismiss once the band has scrolled fully above the sticky filters (54px Topbar line).
  useEffect(() => {
    if (dismissed) return
    const el = ref.current
    if (!el) return
    const onScroll = () => {
      if (el.getBoundingClientRect().bottom > 54) return
      const h = el.offsetHeight
      try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
      window.removeEventListener('scroll', onScroll)
      setDismissed(true)
      window.scrollBy({ top: -h }) // compensate the reflow so the view doesn't jump
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [dismissed])

  if (!events.length || dismissed) return null
  return <div ref={ref}><ComingUpBand events={events} /></div>
}
