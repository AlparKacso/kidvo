import Link from 'next/link'

const CATEGORIES = [
  { name: 'Sport',       color: '#E84545' },
  { name: 'Dance',       color: '#9B59B6' },
  { name: 'Music',       color: '#3498DB' },
  { name: 'Arts',        color: '#E67E22' },
  { name: 'Coding',      color: '#27AE60' },
  { name: 'Gymnastics',  color: '#E91E8C' },
  { name: 'Languages',   color: '#16A085' },
  { name: 'Chess',       color: '#8B6914' },
  { name: 'Babysitting', color: '#FF6B9D' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F5F4F6] font-body flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-5 md:px-8 py-4 md:py-5 max-w-[1200px] mx-auto">
        <span className="font-display leading-none" style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em' }}>
          <span style={{ color: '#523650' }}>kid</span>
          <span style={{ color: '#F0A500' }}>vo</span>
        </span>
        <div className="flex items-center gap-2 md:gap-3">
          <Link href="/auth/login" className="font-display text-sm font-semibold text-[#523650] hover:opacity-70 transition-opacity px-3 md:px-4 py-2">
            Sign in
          </Link>
          <Link href="/auth/signup" className="font-display text-sm font-semibold bg-[#523650] text-white px-3 md:px-4 py-2 rounded-lg hover:bg-[#3d2840] transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      <main className="flex-1">
      {/* Hero */}
      <section className="max-w-[1200px] mx-auto px-5 md:px-8 pt-10 md:pt-12 pb-14 md:pb-20">
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F0A500]/10 border border-[#F0A500]/30 mb-5 md:mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F0A500]" />
            <span className="font-display text-xs font-semibold text-[#8B6914] tracking-wide uppercase">Timișoara · Now live</span>
          </div>
          {/* Responsive heading */}
          <h1 className="font-display text-[36px] md:text-[52px] font-bold tracking-tight text-[#1a0f1e] leading-[1.1] mb-4">
            The right activity.<br />
            <span className="text-[#523650]">Right in your neighborhood.</span>
          </h1>
          <p className="text-base md:text-lg text-[#6b5a73] max-w-[480px] mx-auto leading-relaxed">
            kidvo connects Timișoara families with local sports, arts, music, and more — and helps providers fill their spots.
          </p>
        </div>

        {/* Split cards — stacked on mobile, side by side on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">

          {/* Parent card */}
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#e8e0ec] relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#523650]/5" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-[#F0A500]/8" />
            <div className="relative">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#f0ebf4] flex items-center justify-center mb-4 md:mb-5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" stroke="#523650" strokeWidth="1.6" fill="none"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#523650" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
                  <circle cx="18" cy="8" r="3" fill="#F0A500"/>
                </svg>
              </div>
              <div className="font-display text-[11px] font-semibold tracking-widest uppercase text-[#9b89a5] mb-2">For parents</div>
              <h2 className="font-display text-xl md:text-2xl font-bold text-[#1a0f1e] mb-3 leading-snug">
                Discover. Try. Decide.
              </h2>
              <p className="text-sm text-[#6b5a73] leading-relaxed mb-5 md:mb-6">
                Browse all kids' activities in Timișoara, filter by age and neighborhood, and book a free trial session in under 2 minutes — no commitment.
              </p>
              <div className="flex flex-wrap gap-2 mb-6 md:mb-7">
                {CATEGORIES.map(cat => (
                  <span
                    key={cat.name}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-display font-semibold border"
                    style={{ color: cat.color, borderColor: `${cat.color}30`, backgroundColor: `${cat.color}0f` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                    {cat.name}
                  </span>
                ))}
              </div>
              <Link
                href="/browse"
                className="inline-flex items-center gap-2 bg-[#523650] text-white font-display text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#3d2840] transition-colors"
              >
                Browse activities
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5h8M7 3l3.5 3.5L7 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            </div>
          </div>

          {/* Provider card */}
          <div className="bg-[#523650] rounded-2xl p-6 md:p-8 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-[#F0A500]/15" />
            <div className="relative">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 md:mb-5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" fill="white" opacity="0.9"/>
                  <rect x="14" y="3" width="7" height="7" rx="1.5" fill="white" opacity="0.6"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.6"/>
                  <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#F0A500" opacity="0.9"/>
                </svg>
              </div>
              <div className="font-display text-[11px] font-semibold tracking-widest uppercase text-white/40 mb-2">For providers</div>
              <h2 className="font-display text-xl md:text-2xl font-bold text-white mb-3 leading-snug">
                Reach parents looking for you.
              </h2>
              <p className="text-sm text-white/60 leading-relaxed mb-5 md:mb-6">
                List your activity, set your schedule and pricing, and receive trial session requests directly from interested parents. Free to start.
              </p>
              <ul className="flex flex-col gap-2.5 mb-6 md:mb-7">
                {[
                  '1 free listing to get started',
                  'Trial requests straight to your inbox',
                  'Your own profile page',
                  'No commissions, no intermediaries',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-white/75">
                    <div className="w-4 h-4 rounded-full bg-[#F0A500]/20 flex items-center justify-center flex-shrink-0">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l1.5 1.5 3.5-3" stroke="#F0A500" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 bg-[#F0A500] text-[#1a0f1e] font-display text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#d4920a] transition-colors"
              >
                List your activity
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5h8M7 3l3.5 3.5L7 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-[1200px] mx-auto px-5 md:px-8 pb-14 md:pb-20">
        <div className="text-center mb-8 md:mb-10">
          <div className="font-display text-[11px] font-semibold tracking-widest uppercase text-[#9b89a5] mb-2">Simple by design</div>
          <h2 className="font-display text-xl md:text-2xl font-bold text-[#1a0f1e]">How kidvo works</h2>
        </div>

        {/* 1 col on mobile, 3 on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {[
            {
              step: '01', title: 'Browse & filter',
              desc: 'Search by category, age range, or neighborhood. Every active listing in Timișoara, in one place.',
              icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="#523650" strokeWidth="1.5" fill="none"/><path d="M14 14l4 4" stroke="#523650" strokeWidth="1.5" strokeLinecap="round"/></svg>
            },
            {
              step: '02', title: 'Book a free trial',
              desc: 'Request a trial session directly with the provider. No payment, no commitment — just show up.',
              icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="13" rx="2" stroke="#523650" strokeWidth="1.5" fill="none"/><path d="M2 8h16M7 2v4M13 2v4" stroke="#523650" strokeWidth="1.5" strokeLinecap="round"/></svg>
            },
            {
              step: '03', title: 'Decide & enroll',
              desc: 'Loved it? Enroll directly with the provider. All contracts and payments are between you and them.',
              icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="#523650" strokeWidth="1.5" fill="none"/><path d="M6.5 10l2.5 2.5 4.5-4.5" stroke="#523650" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            },
          ].map(({ step, title, desc, icon }) => (
            <div key={step} className="bg-white rounded-2xl p-5 md:p-6 border border-[#e8e0ec] flex md:flex-col gap-4 md:gap-0">
              <div className="flex md:items-start md:justify-between md:mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#f0ebf4] flex items-center justify-center flex-shrink-0">
                  {icon}
                </div>
                <span className="hidden md:block font-display text-[28px] font-bold text-[#523650]/10 leading-none">{step}</span>
              </div>
              <div>
                <div className="font-display text-base font-bold text-[#1a0f1e] mb-1 md:mb-2">{title}</div>
                <p className="text-sm text-[#6b5a73] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#e8e0ec] bg-white">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-5 md:py-6 flex flex-col md:flex-row items-center gap-3 md:gap-0 md:justify-between">
          <span className="font-display leading-none" style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.03em' }}>
            <span style={{ color: '#523650' }}>kid</span>
            <span style={{ color: '#F0A500' }}>vo</span>
          </span>
          <p className="text-xs text-[#9b89a5] order-last md:order-none">© 2026 kidvo · Timișoara, Romania</p>
          <div className="flex items-center gap-4">
            <Link href="/browse" className="text-xs text-[#6b5a73] hover:text-[#523650] transition-colors font-display font-semibold">Browse</Link>
            <Link href="/auth/signup" className="text-xs text-[#6b5a73] hover:text-[#523650] transition-colors font-display font-semibold">Sign up</Link>
            <Link href="/privacy" className="text-xs text-[#6b5a73] hover:text-[#523650] transition-colors font-display font-semibold">Privacy</Link>
            <Link href="/terms" className="text-xs text-[#6b5a73] hover:text-[#523650] transition-colors font-display font-semibold">Terms</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
