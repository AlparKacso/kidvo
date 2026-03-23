import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FooterLegalLinks } from '@/components/ui/FooterLegalLinks'
import { LocaleToggle } from '@/components/ui/LocaleToggle'
import { getTranslations } from 'next-intl/server'

// ── Category emoji mapping (matches DB slugs) ──────────────────────────────
const CATEGORY_EMOJI: Record<string, string> = {
  sport:       '⚽',
  dance:       '💃',
  music:       '🎵',
  coding:      '💻',
  arts:        '🎨',
  language:    '🌍',
  languages:   '🌍',
  chess:       '♟️',
  gym:         '🤸',
  gymnastics:  '🤸',
  babysitting: '🍼',
  other:       '✨',
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(124,58,237,${alpha})`
  return `rgba(${r},${g},${b},${alpha})`
}

// ── Page ──────────────────────────────────────────────────────────────────
export default async function LandingPage() {
  const supabase = await createClient()
  const t = await getTranslations('landing')

  const [{ data: categoriesRaw }, { data: showcaseRaw }] = await Promise.all([
    supabase
      .from('categories')
      .select('slug, name, accent_color')
      .order('sort_order'),
    supabase
      .from('listings')
      .select('id, title, cover_image_url, price_monthly, age_min, age_max, category:categories(slug, name, accent_color), area:areas(name)')
      .eq('status', 'active')
      .not('cover_image_url', 'is', null)
      .order('featured', { ascending: false })
      .limit(4),
  ])
  const categories = (categoriesRaw ?? []) as { slug: string; name: string; accent_color: string }[]
  type ShowcaseListing = {
    id: string; title: string; cover_image_url: string | null; price_monthly: number
    age_min: number; age_max: number
    category: { slug: string; name: string; accent_color: string }
    area: { name: string }
  }
  const showcase = (showcaseRaw ?? []) as unknown as ShowcaseListing[]

  const HOW_IT_WORKS = [
    {
      step: '01',
      title: t('step1Title'),
      desc:  t('step1Desc'),
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      step: '02',
      title: t('step2Title'),
      desc:  t('step2Desc'),
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="4" width="16" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <path d="M2 8h16M7 2v4M13 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      step: '03',
      title: t('step3Title'),
      desc:  t('step3Desc'),
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <path d="M6.5 10l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-bg font-display flex flex-col">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-border h-16 flex items-center">
        <div className="max-w-[1200px] mx-auto w-full flex items-center gap-3 px-5 md:px-9">

          {/* Logo — wordmark only */}
          <Link href="/" className="font-display font-black leading-none hover:opacity-80 transition-opacity flex-shrink-0" style={{ fontSize: '22px', letterSpacing: '-1px' }}>
            <span className="text-ink">kid</span><span className="text-primary">vo</span>
          </Link>

          {/* Center nav links — desktop only */}
          <div className="hidden md:flex items-center gap-0.5 ml-4">
            <Link href="/browse"       className="px-3 py-2 rounded-[8px] font-display font-semibold text-ink-mid hover:bg-primary-lt hover:text-ink transition-all whitespace-nowrap" style={{ fontSize: '13.5px' }}>{t('browseActivities')}</Link>
            <a    href="#for-providers" className="px-3 py-2 rounded-[8px] font-display font-semibold text-ink-mid hover:bg-primary-lt hover:text-ink transition-all whitespace-nowrap" style={{ fontSize: '13.5px' }}>{t('forProviders')}</a>
            <a    href="#how-it-works" className="px-3 py-2 rounded-[8px] font-display font-semibold text-ink-mid hover:bg-primary-lt hover:text-ink transition-all whitespace-nowrap" style={{ fontSize: '13.5px' }}>{t('seeHowItWorks')}</a>
          </div>

          {/* Right CTAs */}
          <div className="ml-auto flex items-center gap-2">
            <LocaleToggle />
            <Link href="/auth/login"  className="hidden sm:block font-display font-semibold text-ink-mid hover:text-ink transition-colors border-[1.5px] border-border bg-white rounded-[8px] hover:border-border-mid" style={{ fontSize: '13.5px', padding: '7px 17px' }}>{t('signIn')}</Link>
            <Link href="/auth/signup" className="font-display font-bold bg-ink text-white rounded-[8px] hover:opacity-80 transition-opacity whitespace-nowrap" style={{ fontSize: '13.5px', padding: '7px 17px' }}>{t('getStarted')}</Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="max-w-[1200px] mx-auto px-5 md:px-8 pt-10 md:pt-14 pb-6 md:pb-8 text-center">

          {/* Badge */}
          <div className="inline-block mb-6 font-display font-bold text-primary rounded-full"
               style={{ background: '#ece6ff', fontSize: '13px', padding: '6px 14px' }}>
            {t('badge')}
          </div>

          {/* Headline */}
          <h1 className="font-display font-black text-ink leading-[1.05] mb-5"
              style={{ fontSize: 'clamp(36px, 4.5vw, 54px)', letterSpacing: '-2.5px' }}>
            {t('headline1')}<br />
            <span className="text-primary">{t('headline2')}</span><br />
            <span style={{
              background: 'linear-gradient(90deg, #2aa7ff, #c38cfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {t('headline3')}
            </span>
          </h1>

          <p className="font-display text-ink-mid mx-auto mb-8"
             style={{ fontSize: '17px', lineHeight: '1.65', maxWidth: '480px' }}>
            {t('sub')}
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 bg-ink text-white font-display font-bold rounded-[16px] hover:opacity-80 transition-opacity"
              style={{ fontSize: '16px', padding: '14px 28px' }}
            >
              {t('browseActivities')}
            </Link>
            <a
              href="#for-providers"
              className="inline-flex items-center gap-2 border-[1.5px] border-border bg-white text-ink font-display font-bold rounded-[16px] hover:border-ink/30 hover:shadow-card transition-all"
              style={{ fontSize: '16px', padding: '14px 28px' }}
            >
              {t('imProvider')}
            </a>
          </div>

          {/* Stats row — border-top separator, flex-centered */}
          <div className="border-t border-border mt-6 md:mt-8 pt-5 md:pt-7 flex flex-wrap justify-center gap-x-8 gap-y-5">
            {[
              { value: '120+',  label: t('activities'),    color: '#c38cfa' },
              { value: '48',    label: t('providers'),     color: '#2aa7ff' },
              { value: 'Free',  label: t('trialSessions'), color: '#22c55e' },
              { value: '4.9 ★', label: t('avgRating'),    color: '#1c1c27' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="font-display font-black" style={{ fontSize: '32px', letterSpacing: '-1px', color: stat.color }}>{stat.value}</div>
                <div className="font-display font-medium mt-0.5" style={{ fontSize: '13px', color: '#9590b3' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Activity showcase ────────────────────────────────────────────── */}
        <section className="max-w-[1200px] mx-auto px-5 md:px-8 pb-14 md:pb-18">

          {/* Section header */}
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="font-display font-extrabold text-ink flex-shrink-0" style={{ fontSize: '21px', letterSpacing: '-0.4px' }}>
              {t('trendingNearYou')}
            </div>
            <Link href="/browse" className="font-display text-sm font-semibold text-primary hover:underline whitespace-nowrap flex-shrink-0">
              {t('seeAll', { count: 120 })}
            </Link>
          </div>

          {/* Category pills — horizontal scroll row */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {categories.filter(cat => cat.slug !== 'babysitting').map(cat => (
              <Link
                key={cat.slug}
                href={`/browse?category=${cat.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-white text-ink-mid font-display text-[13px] font-semibold transition-all hover:border-primary/40 hover:text-primary hover:bg-primary-lt/50 whitespace-nowrap flex-shrink-0"
                style={{ padding: '7px 16px' }}
              >
                {CATEGORY_EMOJI[cat.slug] && (
                  <span style={{ fontSize: '14px', lineHeight: 1 }}>{CATEGORY_EMOJI[cat.slug]}</span>
                )}
                {cat.name}
              </Link>
            ))}
          </div>

          {/* Cards grid — up to 4 real listings with cover photos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {showcase.map(act => {
              const accent = act.category.accent_color ?? '#7c3aed'
              const emoji  = CATEGORY_EMOJI[act.category.slug] ?? '✨'
              return (
                <Link
                  key={act.id}
                  href={`/browse/${act.id}`}
                  className="bg-white rounded-[22px] border-[1.5px] border-border overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all block"
                >
                  {/* Header — real photo or emoji fallback */}
                  {act.cover_image_url ? (
                    <div className="h-[140px] overflow-hidden">
                      <img
                        src={act.cover_image_url}
                        alt={act.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="h-[140px] flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${hexToRgba(accent, 0.15)}, ${hexToRgba(accent, 0.40)})` }}
                    >
                      <span style={{ fontSize: '52px', lineHeight: 1 }}>{emoji}</span>
                    </div>
                  )}

                  {/* Body */}
                  <div className="p-4">
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      <span
                        className="inline-flex items-center rounded-full font-display text-[11px] font-semibold"
                        style={{ background: hexToRgba(accent, 0.12), color: accent, padding: '3px 9px' }}
                      >
                        {act.category.name}
                      </span>
                      <span
                        className="inline-flex items-center rounded-full font-display text-[11px] font-semibold"
                        style={{ background: '#f1f0f5', color: '#55527a', padding: '3px 9px' }}
                      >
                        Ages {act.age_min}–{act.age_max}
                      </span>
                    </div>

                    <div
                      className="font-display font-extrabold text-ink mb-1 leading-snug"
                      style={{ fontSize: '15px', letterSpacing: '-0.3px' }}
                    >
                      {act.title}
                    </div>
                    <div className="text-[13px] text-ink-muted">{act.area.name}</div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center border-t border-border px-4 py-3 gap-2">
                    <div className="whitespace-nowrap">
                      <span className="font-display font-extrabold text-ink" style={{ fontSize: '16px' }}>
                        {act.price_monthly} RON
                      </span>
                      <span className="text-[11px] text-ink-muted">/mo</span>
                    </div>
                    <span
                      className="ml-auto whitespace-nowrap rounded-full font-display text-[12px] font-bold"
                      style={{ background: '#e8fde9', color: '#15803d', padding: '5px 12px' }}
                    >
                      {t('trialSessions')}
                    </span>
                  </div>
                </Link>
              )
            })}

            {/* Fill remaining slots with a browse CTA if fewer than 4 real listings */}
            {showcase.length < 4 && showcase.length > 0 && (
              <Link
                href="/browse"
                className="bg-white rounded-[22px] border-[1.5px] border-dashed border-border overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all flex flex-col items-center justify-center p-8 text-center gap-3"
              >
                <span style={{ fontSize: '40px', lineHeight: 1 }}>🔍</span>
                <div className="font-display font-bold text-ink-mid" style={{ fontSize: '14px' }}>
                  {t('seeAllActivities')}
                </div>
              </Link>
            )}
          </div>
        </section>

        {/* ── Provider section (dark) ──────────────────────────────────────── */}
        <section id="for-providers" className="scroll-mt-20 max-w-[1200px] mx-auto px-5 md:px-8 pb-14 md:pb-18">
          <div className="rounded-2xl p-6 md:p-12 relative overflow-hidden" style={{ background: '#1c1c27' }}>

            {/* Decorative gradient orbs */}
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20 pointer-events-none"
                 style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', transform: 'translate(25%, -35%)' }} />
            <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full opacity-15 pointer-events-none"
                 style={{ background: 'radial-gradient(circle, #2aa7ff 0%, transparent 70%)', transform: 'translate(-20%, 35%)' }} />

            <div className="relative grid md:grid-cols-2 gap-6 md:gap-16 items-center">

              {/* Left: copy */}
              <div>
                <div className="font-display text-[11px] font-bold tracking-widest uppercase mb-3"
                     style={{ color: 'rgba(255,255,255,0.35)' }}>{t('forProviders')}</div>
                <h2 className="font-display font-bold text-white leading-snug mb-4"
                    style={{ fontSize: 'clamp(24px, 3.5vw, 38px)' }}>
                  {t('providerHeadline1')}<br />{t('providerHeadline2')}
                </h2>
                <p className="text-[15px] leading-relaxed mb-8"
                   style={{ color: 'rgba(255,255,255,0.52)' }}>
                  {t('providerSub')}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <Link
                    href="/auth/signup"
                    className="inline-flex items-center justify-center gap-2 font-display text-sm font-bold px-6 py-3 rounded-full transition-opacity hover:opacity-90 w-full sm:w-auto"
                    style={{ background: '#f5c542', color: '#1c1c27' }}
                  >
                    {t('listActivity')}
                  </Link>
                  <a
                    href="#how-it-works"
                    className="inline-flex items-center justify-center gap-2 font-display text-sm font-semibold px-6 py-3 rounded-full border transition-colors w-full sm:w-auto"
                    style={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.15)' }}
                  >
                    {t('seeHowItWorks')}
                  </a>
                </div>
              </div>

              {/* Right: stats + benefits */}
              <div className="flex flex-col gap-3">

                {/* Stats row — 3 cols */}
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {[
                    { value: '500+',  label: t('familiesReached') },
                    { value: '0 RON', label: t('toGetStarted') },
                    { value: '2 min', label: t('toListActivity') },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-2.5 md:p-4 text-center"
                         style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="font-display text-base md:text-xl font-bold text-white mb-0.5 whitespace-nowrap">{s.value}</div>
                      <div className="text-[9px] md:text-[11px] font-display leading-tight whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Benefits card */}
                <div className="rounded-xl p-5"
                     style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex flex-col gap-2.5">
                    {[
                      t('benefitFree'),
                      t('benefitInbox'),
                      t('benefitProfile'),
                      t('benefitNoCommission'),
                    ].map(item => (
                      <div key={item} className="flex items-center gap-2.5 font-display text-sm"
                           style={{ color: 'rgba(255,255,255,0.68)' }}>
                        <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0"
                             style={{ background: 'rgba(245,197,66,0.18)' }}>
                          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                            <path d="M1.5 4.5l2 2 4-4" stroke="#f5c542" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section id="how-it-works" className="scroll-mt-20 max-w-[1200px] mx-auto px-5 md:px-8 pb-16 md:pb-24">
          <div className="text-center mb-8 md:mb-10">
            <div className="font-display text-[10px] font-bold tracking-widest uppercase text-ink-muted mb-2.5">{t('simpleByDesign')}</div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-ink">{t('howKidvoWorks')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {HOW_IT_WORKS.map(({ step, title, desc, icon }) => (
              <div key={step} className="bg-white rounded-xl p-5 md:p-6 border border-border shadow-card flex md:flex-col gap-4 md:gap-0">
                <div className="flex md:items-start md:justify-between md:mb-5">
                  <div className="w-10 h-10 rounded-xl bg-primary-lt flex items-center justify-center flex-shrink-0 text-primary">
                    {icon}
                  </div>
                  <span className="hidden md:block font-display font-bold leading-none select-none"
                        style={{ fontSize: '34px', color: 'rgba(124,58,237,0.07)' }}>
                    {step}
                  </span>
                </div>
                <div>
                  <div className="font-display text-base font-bold text-ink mb-1.5">{title}</div>
                  <p className="text-sm text-ink-muted leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-white">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-5 md:py-6 flex flex-col md:flex-row items-center gap-3 md:gap-0 md:justify-between">

          <span className="font-display font-bold leading-none" style={{ fontSize: '18px', letterSpacing: '-0.03em' }}>
            <span className="text-ink">kid</span><span className="text-primary">vo</span>
          </span>

          <p className="text-xs text-ink-muted order-last md:order-none font-display">{t('copyright')}</p>

          <div className="flex items-center gap-5">
            <Link href="/browse"      className="text-xs text-ink-mid hover:text-ink transition-colors font-display font-semibold">{t('footerBrowse')}</Link>
            <Link href="/auth/signup" className="text-xs text-ink-mid hover:text-ink transition-colors font-display font-semibold">{t('footerSignUp')}</Link>
            <FooterLegalLinks />
          </div>

        </div>
      </footer>

    </div>
  )
}
