import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

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

// ── Sample showcase activities (static, for marketing only) ───────────────
const SHOWCASE = [
  { slug: 'sport',      accent: '#523650', title: 'Junior Football Academy',   provider: 'Sport Arena Nord',   ages: '5–12', days: 'Mon · Wed · Fri', price: 80,  emoji: '⚽' },
  { slug: 'coding',     accent: '#065f46', title: 'Scratch & Python for Kids', provider: 'TechHub Fabric',     ages: '8–15', days: 'Saturdays',       price: 120, emoji: '💻' },
  { slug: 'arts',       accent: '#7c3aed', title: 'Creative Arts Studio',      provider: 'ArtSpace Centru',    ages: '4–10', days: 'Tue · Thu',       price: 90,  emoji: '🎨' },
  { slug: 'gymnastics', accent: '#b45309', title: 'Rhythmic Gymnastics',       provider: 'Olimpic Club',       ages: '5–14', days: 'Mon · Wed',       price: 110, emoji: '🤸' },
]

// ── How it works steps ────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Browse & filter',
    desc:  'Search by category, age range, or neighborhood. Every active listing in Timișoara, in one place.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    step: '02',
    title: 'Book a free trial',
    desc:  'Request a trial session directly with the provider. No payment, no commitment — just show up.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="4" width="16" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M2 8h16M7 2v4M13 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    step: '03',
    title: 'Decide & enroll',
    desc:  'Loved it? Enroll directly with the provider. All contracts and payments are between you and them.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M6.5 10l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

// ── Page ──────────────────────────────────────────────────────────────────
export default async function LandingPage() {
  const supabase = await createClient()
  const { data: categoriesRaw } = await supabase
    .from('categories')
    .select('slug, name, accent_color')
    .order('sort_order')
  const categories = (categoriesRaw ?? []) as { slug: string; name: string; accent_color: string }[]

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
            <Link href="/browse"       className="px-3 py-2 rounded-[8px] font-display font-semibold text-ink-mid hover:bg-primary-lt hover:text-ink transition-all whitespace-nowrap" style={{ fontSize: '13.5px' }}>Browse activities</Link>
            <Link href="/auth/signup"  className="px-3 py-2 rounded-[8px] font-display font-semibold text-ink-mid hover:bg-primary-lt hover:text-ink transition-all whitespace-nowrap" style={{ fontSize: '13.5px' }}>For providers</Link>
            <a    href="#how-it-works" className="px-3 py-2 rounded-[8px] font-display font-semibold text-ink-mid hover:bg-primary-lt hover:text-ink transition-all whitespace-nowrap" style={{ fontSize: '13.5px' }}>How it works</a>
          </div>

          {/* Right CTAs */}
          <div className="ml-auto flex items-center gap-2">
            <Link href="/auth/login"  className="hidden sm:block font-display font-semibold text-ink-mid hover:text-ink transition-colors border-[1.5px] border-border bg-white rounded-[8px] hover:border-border-mid" style={{ fontSize: '13.5px', padding: '7px 17px' }}>Sign in</Link>
            <Link href="/auth/signup" className="font-display font-bold bg-ink text-white rounded-[8px] hover:opacity-80 transition-opacity whitespace-nowrap" style={{ fontSize: '13.5px', padding: '7px 17px' }}>Get started →</Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="max-w-[1200px] mx-auto px-5 md:px-8 pt-10 md:pt-14 pb-12 md:pb-16 text-center">

          {/* Badge */}
          <div className="inline-block mb-6 font-display font-bold text-primary rounded-full"
               style={{ background: '#ece6ff', fontSize: '13px', padding: '6px 14px' }}>
            ✨ Now in Timișoara
          </div>

          {/* Headline */}
          <h1 className="font-display font-black text-ink leading-[1.05] mb-5"
              style={{ fontSize: 'clamp(36px, 4.5vw, 54px)', letterSpacing: '-2.5px' }}>
            Find the perfect<br />
            <span className="text-primary">activity</span> for your<br />
            <span style={{
              background: 'linear-gradient(90deg, #2aa7ff, #c38cfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              little one
            </span>
          </h1>

          <p className="font-display text-ink-mid mx-auto mb-8"
             style={{ fontSize: '17px', lineHeight: '1.65', maxWidth: '480px' }}>
            Browse local sports, arts, music, coding and more — then book a free trial session in seconds.
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 bg-ink text-white font-display font-bold rounded-[16px] hover:opacity-80 transition-opacity"
              style={{ fontSize: '16px', padding: '14px 28px' }}
            >
              🔍 Browse activities
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 border-[1.5px] border-border bg-white text-ink font-display font-bold rounded-[16px] hover:border-ink/30 hover:shadow-card transition-all"
              style={{ fontSize: '16px', padding: '14px 28px' }}
            >
              I&apos;m a provider →
            </Link>
          </div>

          {/* Stats row — border-top separator, flex-centered */}
          <div className="border-t border-border mt-12 pt-10 flex flex-wrap justify-center gap-x-8 gap-y-5">
            {[
              { value: '120+',  label: 'Activities',    color: '#c38cfa' },
              { value: '48',    label: 'Providers',      color: '#2aa7ff' },
              { value: 'Free',  label: 'Trial sessions', color: '#22c55e' },
              { value: '4.9 ★', label: 'Avg. rating',   color: '#1c1c27' },
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
              Trending near you
            </div>
            <Link href="/browse" className="font-display text-sm font-semibold text-primary hover:underline whitespace-nowrap flex-shrink-0">
              See all 120 →
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

          {/* Cards grid — 4 cards, act-card-lg style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SHOWCASE.map(act => (
              <Link
                key={act.title}
                href="/browse"
                className="bg-white rounded-[22px] border-[1.5px] border-border overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all block"
              >
                {/* Header — gradient + large emoji */}
                <div
                  className="h-[120px] flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${hexToRgba(act.accent, 0.15)}, ${hexToRgba(act.accent, 0.40)})` }}
                >
                  <span style={{ fontSize: '52px', lineHeight: 1 }}>{act.emoji}</span>
                </div>

                {/* Body */}
                <div className="p-4">
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    <span
                      className="inline-flex items-center rounded-full font-display text-[11px] font-semibold"
                      style={{ background: hexToRgba(act.accent, 0.12), color: act.accent, padding: '3px 9px' }}
                    >
                      Ages {act.ages}
                    </span>
                    <span
                      className="inline-flex items-center rounded-full font-display text-[11px] font-semibold"
                      style={{ background: '#f1f0f5', color: '#55527a', padding: '3px 9px' }}
                    >
                      {act.days}
                    </span>
                  </div>

                  <div
                    className="font-display font-extrabold text-ink mb-1 leading-snug"
                    style={{ fontSize: '16px', letterSpacing: '-0.3px' }}
                  >
                    {act.title}
                  </div>
                  <div className="text-[13px] text-ink-muted">{act.provider}</div>
                </div>

                {/* Footer */}
                <div className="flex items-center border-t border-border px-4 py-3 gap-2">
                  <div className="whitespace-nowrap">
                    <span className="font-display font-extrabold text-ink" style={{ fontSize: '16px' }}>
                      {act.price} RON
                    </span>
                    <span className="text-[11px] text-ink-muted">/mo</span>
                  </div>
                  <span
                    className="ml-auto whitespace-nowrap rounded-full font-display text-[12px] font-bold"
                    style={{ background: '#e8fde9', color: '#15803d', padding: '5px 12px' }}
                  >
                    Free trial
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Provider section (dark) ──────────────────────────────────────── */}
        <section className="max-w-[1200px] mx-auto px-5 md:px-8 pb-14 md:pb-18">
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
                     style={{ color: 'rgba(255,255,255,0.35)' }}>For providers</div>
                <h2 className="font-display font-bold text-white leading-snug mb-4"
                    style={{ fontSize: 'clamp(24px, 3.5vw, 38px)' }}>
                  Grow your class.<br />Reach more families.
                </h2>
                <p className="text-[15px] leading-relaxed mb-8"
                   style={{ color: 'rgba(255,255,255,0.52)' }}>
                  List your activity, set your schedule and pricing, and receive trial session requests directly from interested parents in Timișoara.
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <Link
                    href="/auth/signup"
                    className="inline-flex items-center justify-center gap-2 font-display text-sm font-bold px-6 py-3 rounded-full transition-opacity hover:opacity-90 w-full sm:w-auto"
                    style={{ background: '#f5c542', color: '#1c1c27' }}
                  >
                    List your activity →
                  </Link>
                  <Link
                    href="/browse"
                    className="inline-flex items-center justify-center gap-2 font-display text-sm font-semibold px-6 py-3 rounded-full border transition-colors w-full sm:w-auto"
                    style={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.15)' }}
                  >
                    See how it works
                  </Link>
                </div>
              </div>

              {/* Right: stats + benefits */}
              <div className="flex flex-col gap-3">

                {/* Stats row — 3 cols */}
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {[
                    { value: '500+',  label: 'Families\nreached' },
                    { value: '0 RON', label: 'To get\nstarted' },
                    { value: '2 min', label: 'To list\nactivity' },
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
                      'Intentionally free to use',
                      'Trial requests straight to your inbox',
                      'Your own provider profile page',
                      'No commissions, no intermediaries',
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
        <section id="how-it-works" className="max-w-[1200px] mx-auto px-5 md:px-8 pb-16 md:pb-24">
          <div className="text-center mb-8 md:mb-10">
            <div className="font-display text-[10px] font-bold tracking-widest uppercase text-ink-muted mb-2.5">Simple by design</div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-ink">How kidvo works</h2>
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

          <p className="text-xs text-ink-muted order-last md:order-none font-display">© 2026 kidvo · Timișoara, Romania</p>

          <div className="flex items-center gap-5">
            <Link href="/browse"      className="text-xs text-ink-mid hover:text-ink transition-colors font-display font-semibold">Browse</Link>
            <Link href="/auth/signup" className="text-xs text-ink-mid hover:text-ink transition-colors font-display font-semibold">Sign up</Link>
            <Link href="/privacy"     className="text-xs text-ink-mid hover:text-ink transition-colors font-display font-semibold">Privacy</Link>
            <Link href="/terms"       className="text-xs text-ink-mid hover:text-ink transition-colors font-display font-semibold">Terms</Link>
          </div>

        </div>
      </footer>

    </div>
  )
}
