import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { FooterLegalLinks } from '@/components/ui/FooterLegalLinks'

interface Props {
  /** Page audience — drives the cross-audience footer link. */
  audience: 'parents' | 'providers'
  tone?: 'light' | 'dark'
}

export async function LandingFooter({ audience, tone = 'light' }: Props) {
  const t = await getTranslations('landingNav')
  const dark = tone === 'dark'
  const isProviders = audience === 'providers'

  const cross = isProviders
    ? { href: '/', label: t('forParents') }
    : { href: '/providers', label: t('forProviders') }
  const second = isProviders
    ? { href: '/auth/signup', label: t('listActivity') }
    : { href: '/browse', label: t('browseActivities') }

  const linkCls = dark
    ? 'text-xs text-white/60 hover:text-white transition-colors font-display font-semibold'
    : 'text-xs text-ink-mid hover:text-ink transition-colors font-display font-semibold'

  return (
    <footer
      className="border-t"
      style={{
        background: dark ? '#15151e' : '#fff',
        borderColor: dark ? 'rgba(255,255,255,0.07)' : '#e8e4f0',
      }}
    >
      <div className="max-w-[1180px] mx-auto px-5 md:px-10 py-7 md:py-9 flex flex-col md:flex-row items-center gap-4 md:gap-0 md:justify-between">
        <span className="font-display font-black leading-none flex-shrink-0" style={{ fontSize: '20px', letterSpacing: '-1px' }}>
          <span style={{ color: dark ? 'rgba(255,255,255,0.92)' : '#1c1c27' }}>kid</span>
          <span style={{ color: dark ? '#F0A500' : '#7c3aed' }}>vo</span>
        </span>

        <div className="flex items-center flex-wrap justify-center gap-x-5 gap-y-2">
          <Link href={cross.href} className={linkCls}>{cross.label}</Link>
          <Link href={second.href} className={linkCls}>{second.label}</Link>
          <FooterLegalLinks tone={tone} />
        </div>

        <span className="font-display order-last md:order-none" style={{ fontSize: '12.5px', color: dark ? 'rgba(255,255,255,0.4)' : '#9590b3' }}>
          {t('footerCopyright')}
        </span>
      </div>
    </footer>
  )
}
