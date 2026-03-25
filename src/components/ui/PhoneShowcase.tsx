'use client'

import { useTranslations, useLocale } from 'next-intl'

// RO vs EN image file mappings
const IMAGES = {
  parents: {
    ro: ['IMG_6826', 'IMG_6833', 'IMG_6834', 'IMG_6837'],
    en: ['IMG_6827', 'IMG_6832', 'IMG_6835', 'IMG_6836'],
  },
  providers: {
    ro: ['IMG_6838', 'IMG_6841', 'IMG_6842', 'IMG_6845'],
    en: ['IMG_6839', 'IMG_6840', 'IMG_6843', 'IMG_6866'],  // IMG_6866 = anonymised EN trial requests
  },
}

interface Props {
  variant: 'parents' | 'providers'
}

export function PhoneShowcase({ variant }: Props) {
  const t = useTranslations('landing')
  const locale = useLocale() as 'ro' | 'en'
  const isDark = variant === 'providers'

  const files = IMAGES[variant][locale] ?? IMAGES[variant]['ro']

  const screens =
    variant === 'parents'
      ? [
          { label: t('screenP1Label'), caption: t('screenP1Caption') },
          { label: t('screenP2Label'), caption: t('screenP2Caption') },
          { label: t('screenP3Label'), caption: t('screenP3Caption') },
          { label: t('screenP4Label'), caption: t('screenP4Caption') },
        ]
      : [
          { label: t('screenV1Label'), caption: t('screenV1Caption') },
          { label: t('screenV2Label'), caption: t('screenV2Caption') },
          { label: t('screenV3Label'), caption: t('screenV3Caption') },
          { label: t('screenV4Label'), caption: t('screenV4Caption') },
        ]

  const subtitle = variant === 'parents' ? t('screenParentsSub') : t('screenProvidersSub')

  // Parents: white bg + purple pill; Providers: dark bg, context set by card above
  const bg = isDark ? '#1c1c27' : 'white'

  return (
    <section
      className="scroll-mt-20 overflow-hidden"
      style={{ background: bg }}
    >
      <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-12 md:py-[72px]">

        {/* Section header — sized to match "Trending near you" */}
        <div className="mb-8 md:mb-10">
          {!isDark && (
            <span
              className="font-display text-[11px] font-bold tracking-widest uppercase rounded-full mb-3 inline-block"
              style={{ background: '#ece6ff', color: '#7c3aed', padding: '4px 12px' }}
            >
              {t('screenParentsBadge')}
            </span>
          )}
          <p
            className="font-display font-extrabold"
            style={{
              fontSize: '21px',
              letterSpacing: '-0.4px',
              color: isDark ? 'white' : '#1c1c27',
              maxWidth: 520,
            }}
          >
            {subtitle}
          </p>
        </div>

        {/* Phone frames grid — 1 col on mobile, 2 on sm, 4 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-5 md:gap-7">
          {screens.map((screen, i) => (
            <div key={i} className="flex flex-col min-w-0">

              {/* Label + caption ABOVE the phone frame */}
              <p
                className="font-display font-bold text-[13px] md:text-[13px] leading-snug mb-1"
                style={{ color: isDark ? 'white' : '#1c1c27' }}
              >
                {screen.label}
              </p>
              <p
                className="font-display text-[12px] leading-snug mb-3"
                style={{ color: '#9590b3' }}
              >
                {screen.caption}
              </p>

              {/* Phone frame */}
              <div
                className="w-full overflow-hidden"
                style={{
                  background: isDark ? '#2a2a3a' : '#f5f2fb',
                  borderRadius: 20,
                  boxShadow: isDark
                    ? '0 20px 40px -10px rgba(0,0,0,0.55)'
                    : '0 10px 28px -5px rgba(124,58,237,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/screenshots/${files[i]}.png`}
                  alt={screen.label}
                  style={{ display: 'block', width: '100%', height: 'auto' }}
                />
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
