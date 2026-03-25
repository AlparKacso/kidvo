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
    en: ['IMG_6839', 'IMG_6840', 'IMG_6843', 'IMG_6844'],
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

  const badge    = variant === 'parents' ? t('screenParentsBadge')    : t('screenProvidersBadge')
  const title    = variant === 'parents' ? t('screenParentsTitle')    : t('screenProvidersTitle')
  const subtitle = variant === 'parents' ? t('screenParentsSub')      : t('screenProvidersSub')

  return (
    <section
      className="scroll-mt-20 overflow-hidden"
      style={{ background: isDark ? '#1c1c27' : '#f5f2fb' }}
    >
      <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-12 md:py-[72px]">

        {/* Section header */}
        <div className="mb-8 md:mb-10">
          <span
            className="font-display text-[11px] font-bold tracking-widest uppercase rounded-full"
            style={{
              background: isDark ? 'rgba(124,58,237,0.2)' : '#ece6ff',
              color: isDark ? '#c4a8ff' : '#7c3aed',
              padding: '4px 12px',
            }}
          >
            {badge}
          </span>
          <h2
            className="font-display font-black mt-3 mb-2"
            style={{
              fontSize: 'clamp(22px, 3vw, 32px)',
              color: isDark ? 'white' : '#1c1c27',
              letterSpacing: '-0.5px',
            }}
          >
            {title}
          </h2>
          <p
            className="font-display text-[14px] md:text-[15px]"
            style={{ color: isDark ? '#9590b3' : '#55527a', maxWidth: 480 }}
          >
            {subtitle}
          </p>
        </div>

        {/* Phone frames grid — 2 cols on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-7">
          {screens.map((screen, i) => (
            <div key={i} className="flex flex-col items-center min-w-0">
              {/* Phone frame */}
              <div
                className="w-full overflow-hidden"
                style={{
                  background: isDark ? '#2a2a3a' : 'white',
                  borderRadius: 20,
                  boxShadow: isDark
                    ? '0 20px 40px -10px rgba(0,0,0,0.55)'
                    : '0 10px 28px -5px rgba(124,58,237,0.13), 0 2px 8px rgba(0,0,0,0.07)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/screenshots/${files[i]}.png`}
                  alt={screen.label}
                  style={{ display: 'block', width: '100%', height: 'auto' }}
                />
              </div>
              {/* Label + caption */}
              <p
                className="font-display font-bold mt-3 text-center text-[12px] md:text-[13px] leading-snug"
                style={{ color: isDark ? 'white' : '#1c1c27' }}
              >
                {screen.label}
              </p>
              <p
                className="font-display text-center mt-0.5 text-[11px] md:text-[12px] leading-snug"
                style={{ color: '#9590b3' }}
              >
                {screen.caption}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
