import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { LocaleToggle } from '@/components/ui/LocaleToggle'
import { eventsEnabled } from '@/lib/eventsEnabled'

interface Props {
  audience: 'parents' | 'providers'
}

/**
 * Sticky marketing nav shared by both landing pages.
 * - parents:   purple audience pill, gold cross-link to /providers, purple "Get started" CTA
 * - providers: purple audience pill, purple cross-link to /,        gold   "List free" CTA
 */
export async function LandingNav({ audience }: Props) {
  const t = await getTranslations('landingNav')
  const isProviders = audience === 'providers'

  const homeHref = isProviders ? '/providers' : '/'
  const firstLink = isProviders
    ? { href: '/auth/signup', label: t('listActivity') }
    : { href: '/browse', label: t('browseActivities') }
  const cross = isProviders
    ? { href: '/', label: t('forParents'), cls: 'text-primary bg-primary-lt border-primary-border' }
    : { href: '/providers', label: t('forProviders'), cls: 'text-gold-text bg-gold-lt' }
  const cta = isProviders
    ? { href: '/auth/signup', label: t('listFree'), cls: 'bg-gold text-ink' }
    : { href: '/auth/signup', label: t('getStarted'), cls: 'bg-primary text-white' }

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-border">
      <div className="max-w-[1180px] mx-auto h-[66px] px-5 md:px-10 flex items-center justify-between gap-3">

        {/* Left — logo + audience pill */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href={homeHref} className="font-display font-black leading-none flex-shrink-0 hover:opacity-80 transition-opacity" style={{ fontSize: '22px', letterSpacing: '-1px' }}>
            <span className="text-ink">kid</span><span className="text-primary">vo</span>
          </Link>
          <span className="hidden sm:inline-flex font-display font-bold text-primary bg-primary-lt rounded-full" style={{ fontSize: '11px', padding: '3px 9px', letterSpacing: '0.04em' }}>
            {isProviders ? t('providersPill') : t('parentsPill')}
          </span>
          {/* Audience switcher — mobile only (desktop has it in the center group) */}
          <Link href={cross.href} className={`md:hidden font-display font-bold rounded-full border whitespace-nowrap inline-flex items-center gap-1 flex-shrink-0 hover:opacity-85 transition-opacity ${cross.cls}`} style={{ fontSize: '11.5px', padding: '5px 11px', borderColor: isProviders ? undefined : 'rgba(212,160,23,0.25)' }}>
            {cross.label} <span aria-hidden style={{ fontSize: '10px' }}>→</span>
          </Link>
        </div>

        {/* Center — desktop only */}
        <div className="hidden md:flex items-center gap-1.5">
          <Link href={firstLink.href} className="font-display font-semibold text-ink-mid rounded-lg hover:bg-primary-lt hover:text-ink transition-all whitespace-nowrap" style={{ fontSize: '13.5px', padding: '8px 12px' }}>
            {firstLink.label}
          </Link>
          {!isProviders && eventsEnabled() && (
            <Link href="/events" className="font-display font-semibold text-ink-mid rounded-lg hover:bg-primary-lt hover:text-ink transition-all whitespace-nowrap" style={{ fontSize: '13.5px', padding: '8px 12px' }}>
              {t('events')}
            </Link>
          )}
          <Link href={cross.href} className={`font-display font-bold rounded-full border whitespace-nowrap inline-flex items-center gap-1.5 hover:opacity-85 transition-opacity ${cross.cls}`} style={{ fontSize: '13.5px', padding: '7px 14px', borderColor: isProviders ? undefined : 'rgba(212,160,23,0.25)' }}>
            {cross.label} <span style={{ fontSize: '12px' }}>→</span>
          </Link>
          <a href="#how" className="font-display font-semibold text-ink-mid rounded-lg hover:bg-primary-lt hover:text-ink transition-all whitespace-nowrap" style={{ fontSize: '13.5px', padding: '8px 12px' }}>
            {t('howItWorks')}
          </a>
        </div>

        {/* Right — locale + sign in + CTA */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <LocaleToggle />
          {/* Sign in — compact person icon on mobile (RO label is long), text on desktop */}
          <Link href="/auth/login" aria-label={t('signIn')} className="sm:hidden inline-flex items-center justify-center w-8 h-8 rounded-full text-ink-mid hover:text-ink hover:bg-primary-lt transition-colors flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
          <Link href="/auth/login" className="hidden sm:inline font-display font-semibold text-ink-mid hover:text-ink transition-colors whitespace-nowrap" style={{ fontSize: '13.5px' }}>
            {t('signIn')}
          </Link>
          {/* CTA hidden on mobile — the mobile audience switcher takes its slot; the
              hero "Browse activities" button is the primary mobile action. */}
          <Link href={cta.href} className={`hidden md:inline font-display font-extrabold rounded-full whitespace-nowrap hover:opacity-90 transition-opacity ${cta.cls}`} style={{ fontSize: '13.5px', padding: '9px 16px' }}>
            {cta.label} <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
