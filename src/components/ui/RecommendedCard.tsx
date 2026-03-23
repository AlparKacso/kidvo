'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

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
  const router = useRouter()
  const t      = useTranslations('recommended')
  const tCard  = useTranslations('card')
  if (!listing) return null
  const cat = listing.category as any
  return (
    <div
      className="rounded-[22px] p-[22px] text-white cursor-pointer"
      style={{ background: '#1c1c27', boxShadow: '0 6px 28px rgba(90,70,140,.12)' }}
      onClick={() => router.push(`/browse/${listing.id}`)}
    >
      <div className="font-display text-[10.5px] font-bold tracking-[.1em] uppercase mb-2.5" style={{ color: '#f0e8ff' }}>
        ⚡ {forKid ? t('forKid', { kid: forKid.toUpperCase() }) : t('forYou')}
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
        {(listing.provider as any)?.display_name}{listing.trial_available ? ` · ${t('trialAvailable')}` : ''}
      </div>
      <div className="flex gap-5 mb-4">
        {listing.price_monthly != null && (
          <div>
            <div className="font-display text-[20px] font-extrabold leading-none">{listing.price_monthly}</div>
            <div className="font-display text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,.4)' }}>{t('ronPerMonth')}</div>
          </div>
        )}
        {listing.trial_available && (
          <div>
            <div className="font-display text-[20px] font-extrabold leading-none">{t('free')}</div>
            <div className="font-display text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,.4)' }}>{t('trial')}</div>
          </div>
        )}
      </div>
      <Link
        href={`/browse/${listing.id}`}
        onClick={e => e.stopPropagation()}
        className="block w-full text-center font-display text-[13.5px] font-bold text-white rounded-[12px] py-[11px] hover:opacity-90 transition-opacity"
        style={{ background: '#2aa7ff' }}
      >
        {listing.trial_available ? tCard('bookTrial') : tCard('viewListing')}
      </Link>
    </div>
  )
}

// Re-export from shared lib so existing imports in client components keep working
export { pickRecommendation } from '@/lib/recommendations'
