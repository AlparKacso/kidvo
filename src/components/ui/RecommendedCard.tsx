import Link from 'next/link'

const CAT_EMOJI: Record<string, string> = {
  sport:       '⚽',
  dance:       '💃',
  music:       '🎵',
  coding:      '💻',
  arts:        '🎨',
  chess:       '♟️',
  gymnastics:  '🤸',
}

export function RecommendedCard({ listing, forKid }: { listing: any; forKid?: string }) {
  if (!listing) return null
  const cat = listing.category as any
  return (
    <div className="rounded-[22px] p-[22px] text-white" style={{ background: '#1c1c27', boxShadow: '0 6px 28px rgba(90,70,140,.12)' }}>
      <div className="font-display text-[10.5px] font-bold tracking-[.1em] uppercase mb-2.5" style={{ color: '#f0e8ff' }}>
        ⚡ {forKid ? `FOR ${forKid.toUpperCase()}` : 'RECOMMENDED FOR YOU'}
      </div>
      <div
        className="w-[42px] h-[42px] rounded-[11px] flex items-center justify-center mb-3 text-xl"
        style={{ background: 'rgba(255,255,255,.1)' }}
      >
        {CAT_EMOJI[cat?.slug] ?? '✨'}
      </div>
      <div className="font-display text-[18px] font-extrabold tracking-[-0.4px] leading-[1.25] mb-1.5">
        {listing.title}
      </div>
      <div className="font-display text-[12px] leading-[1.55] mb-4" style={{ color: 'rgba(255,255,255,.5)' }}>
        {(listing.provider as any)?.display_name}{listing.trial_available ? ' · Trial session available' : ''}
      </div>
      <div className="flex gap-5 mb-4">
        {listing.price_monthly != null && (
          <div>
            <div className="font-display text-[20px] font-extrabold leading-none">{listing.price_monthly}</div>
            <div className="font-display text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,.4)' }}>RON/mo</div>
          </div>
        )}
        {listing.trial_available && (
          <div>
            <div className="font-display text-[20px] font-extrabold leading-none">Free</div>
            <div className="font-display text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,.4)' }}>Trial</div>
          </div>
        )}
      </div>
      <Link
        href={`/browse/${listing.id}`}
        className="block w-full text-center font-display text-[13.5px] font-bold text-white rounded-[12px] py-[11px] hover:opacity-90 transition-opacity"
        style={{ background: '#2aa7ff' }}
      >
        {listing.trial_available ? 'Book trial →' : 'View listing →'}
      </Link>
    </div>
  )
}

/** Score + pick a recommendation for a given kid from a listings pool */
export function pickRecommendation(
  kid: { birth_year: number; interests?: string[]; area_id?: string | null },
  listings: any[],
  excludeIds: Set<string>,
): any | null {
  const kidAge = new Date().getFullYear() - kid.birth_year
  const scored = listings
    .filter((l: any) => !excludeIds.has(l.id))
    .map((l: any) => {
      let score = 0
      if ((kid.interests ?? []).includes(l.category?.slug ?? '')) score += 3
      if (l.age_min <= kidAge && l.age_max >= kidAge)              score += 2
      if (kid.area_id && l.area_id === kid.area_id)                score += 1
      return { ...l, _score: score }
    })
    .sort((a: any, b: any) => b._score - a._score)

  const topPool = scored.slice(0, 5)
  if (topPool.length === 0) return listings[0] ?? null
  return topPool[Math.floor(Math.random() * topPool.length)]
}
