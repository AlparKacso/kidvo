import Link from 'next/link'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { localizeCategoryName } from '@/lib/categoryName'
import { hexa } from '@/lib/hexa'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { FamilyCalendarShowcase } from '@/components/landing/FamilyCalendarShowcase'
import { OfferToast } from '@/components/landing/OfferToast'
import { Icon, Check, type IconName } from '@/components/landing/LandingIcon'
import { ActivityCard } from '@/components/ui/ActivityCard'
import { JsonLd } from '@/components/ui/JsonLd'
import type { ListingWithRelations } from '@/types/database'

// ── Category emoji mapping (matches DB slugs) ──────────────────────────────
const CATEGORY_EMOJI: Record<string, string> = {
  sport: '⚽', dance: '💃', music: '🎵', coding: '💻', arts: '🎨', 'arts-crafts': '🎨',
  language: '🌍', languages: '🌍', chess: '♟️', gym: '🤸', gymnastics: '🤸',
  babysitting: '🍼', health: '❤️', other: '✨',
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('landingParents')
  return { title: t('metaTitle'), description: t('metaDescription') }
}

type Category = { slug: string; name: string; accent_color: string }

export default async function ParentsLanding() {
  const supabase = await createClient()
  const t = await getTranslations('landingParents')
  const tCat = await getTranslations('categories')

  const [{ data: categoriesRaw }, { data: showcaseRaw }] = await Promise.all([
    supabase.from('categories').select('slug, name, accent_color').order('sort_order'),
    supabase
      .from('listings')
      .select('*, category:categories(*), area:areas(*), provider:providers(*), schedules:listing_schedules(*)')
      .eq('status', 'active')
      .eq('type', 'activity') // events carry NULL category/area — they must never enter the activities showcase
      .not('cover_image_url', 'is', null)
      .order('featured', { ascending: false })
      .limit(4),
  ])

  const categories = (categoriesRaw ?? []).filter((c: Category) => c.slug !== 'babysitting') as Category[]
  const showcase = (showcaseRaw ?? []) as unknown as ListingWithRelations[]

  const features: { ic: IconName; title: string; desc: string; tint: string }[] = [
    { ic: 'palette', title: t('fcF1Title'), desc: t('fcF1Desc'), tint: '#c38cfa' },
    { ic: 'layers', title: t('fcF2Title'), desc: t('fcF2Desc'), tint: '#2aa7ff' },
    { ic: 'alert', title: t('fcF3Title'), desc: t('fcF3Desc'), tint: '#f87171' },
    { ic: 'calendarPlus', title: t('fcF4Title'), desc: t('fcF4Desc'), tint: '#4ade80' },
  ]
  const points = [
    { title: t('rcP1Title'), desc: t('rcP1Desc') },
    { title: t('rcP2Title'), desc: t('rcP2Desc') },
    { title: t('rcP3Title'), desc: t('rcP3Desc') },
  ]
  const steps: { n: string; ic: IconName; title: string; desc: string; tint: string }[] = [
    { n: '01', ic: 'search', title: t('howS1Title'), desc: t('howS1Desc'), tint: '#7c3aed' },
    { n: '02', ic: 'raiseHand', title: t('howS2Title'), desc: t('howS2Desc'), tint: '#2aa7ff' },
    { n: '03', ic: 'calendar', title: t('howS3Title'), desc: t('howS3Desc'), tint: '#1A7A4A' },
  ]
  const reassurance = [t('r1'), t('r2'), t('r3'), t('r4'), t('r5')]

  const BrowseCTA = () => (
    <div className="inline-flex flex-col items-center gap-2.5">
      <Link
        href="/browse"
        className="inline-flex items-center gap-2.5 font-display font-extrabold rounded-full whitespace-nowrap hover:opacity-90 transition-opacity"
        style={{ background: '#7c3aed', color: '#fff', fontSize: 15.5, padding: '15px 28px', boxShadow: '0 10px 28px -8px rgba(124,58,237,0.5)' }}
      >
        {t('cta')}
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 9999, background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 12 }}>→</span>
      </Link>
      <span style={{ fontSize: 12.5, color: '#9590b3', fontWeight: 500 }}>{t('ctaSub')}</span>
    </div>
  )

  return (
    <div className="font-display" style={{ background: '#fff' }}>
      <LandingNav audience="parents" />

      {/* 1 — HERO */}
      <section style={{ background: '#f6f4ff', position: 'relative', overflow: 'hidden' }} className="py-14 md:py-[72px]">
        <div style={{ position: 'absolute', top: -200, right: -140, width: 640, height: 640, background: 'radial-gradient(circle, rgba(124,58,237,0.20), transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -220, left: -160, width: 560, height: 560, background: 'radial-gradient(circle, rgba(42,167,255,0.13), transparent 65%)', pointerEvents: 'none' }} />
        <div className="relative max-w-[800px] mx-auto px-5 text-center">
          <span className="inline-flex items-center gap-2" style={{ padding: '6px 14px', background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 9999, fontSize: 12.5, fontWeight: 700, color: '#7c3aed', marginBottom: 22 }}>
            <Icon name="calendar" size={13} stroke={2} color="#7c3aed" />
            {t('heroEyebrow')}
          </span>
          <h1 className="font-black text-ink" style={{ fontSize: 'clamp(36px, 6.4vw, 64px)', lineHeight: 1.04, letterSpacing: '-2.4px', margin: 0 }}>
            {t('heroH1a')}<br />
            <span style={{ background: 'linear-gradient(96deg, #7c3aed, #2aa7ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{t('heroH1b')}</span>
          </h1>
          <p className="mx-auto" style={{ marginTop: 20, fontSize: 18, color: '#55527a', lineHeight: 1.6, maxWidth: 540 }}>{t('heroSub')}</p>
          <div style={{ marginTop: 30 }} className="flex justify-center"><BrowseCTA /></div>
        </div>
      </section>

      {/* 2 — FAMILY CALENDAR (dark) */}
      <section style={{ background: 'linear-gradient(180deg, #1c1c27 0%, #221d30 100%)', position: 'relative', overflow: 'hidden' }} className="py-16 md:pt-16 md:pb-[88px]">
        <div style={{ position: 'absolute', top: -160, right: -100, width: 560, height: 560, background: 'radial-gradient(circle, rgba(124,58,237,0.30), transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -180, left: -120, width: 520, height: 520, background: 'radial-gradient(circle, rgba(42,167,255,0.18), transparent 65%)', pointerEvents: 'none' }} />
        <div className="relative max-w-[1180px] mx-auto px-5 md:px-10">
          <div className="text-center mx-auto" style={{ maxWidth: 700, marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#c38cfa', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 12 }}>{t('fcEyebrow')}</div>
            <h2 className="font-extrabold text-white" style={{ fontSize: 'clamp(30px, 4.6vw, 44px)', letterSpacing: '-1.5px', lineHeight: 1.08, margin: 0 }}>
              {t('fcH2a')}<br />{t('fcH2b')}
            </h2>
            <p style={{ marginTop: 16, fontSize: 17, color: 'rgba(255,255,255,0.66)', lineHeight: 1.6 }}>{t('fcSub')}</p>
          </div>

          {/* showcase scrolls horizontally on narrow viewports (designed at desktop width) */}
          <div className="overflow-x-auto pb-2 -mx-5 px-5 md:mx-0 md:px-0">
            <div style={{ minWidth: 760 }}><FamilyCalendarShowcase /></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 16, marginTop: 36 }}>
            {features.map(f => (
              <div key={f.title} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 22 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: hexa(f.tint, 0.18), color: f.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}><Icon name={f.ic} size={21} /></div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', letterSpacing: '-0.3px', marginBottom: 5 }}>{f.title}</div>
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 — DISCOVER (real listings) */}
      <section style={{ background: '#ece8f5' }} className="py-16 md:py-20">
        <div className="max-w-[1180px] mx-auto px-5 md:px-10">
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 12 }}>{t('discEyebrow')}</div>
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <h2 className="font-extrabold text-ink" style={{ fontSize: 'clamp(26px, 3.6vw, 34px)', letterSpacing: '-1px', margin: 0 }}>{t('discH2')}</h2>
              <Link href="/browse" style={{ fontSize: 13.5, fontWeight: 700, color: '#7c3aed' }}>{t('discSeeAll')} →</Link>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 15, color: '#55527a', lineHeight: 1.55, maxWidth: 620 }}>{t('discSub')}</p>
          </div>

          {/* Category pills — single horizontally-scrollable row (bleeds to screen edge on mobile) */}
          <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden" style={{ marginBottom: 22, scrollbarWidth: 'none' }}>
            <Link href="/browse" className="shrink-0 inline-flex items-center rounded-full font-display whitespace-nowrap" style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 600, background: '#f0e8ff', border: '1.5px solid #7c3aed', color: '#7c3aed' }}>{tCat('all')}</Link>
            {categories.map(cat => (
              <Link key={cat.slug} href={`/browse?category=${cat.slug}`} className="shrink-0 inline-flex items-center gap-1.5 rounded-full font-display whitespace-nowrap hover:border-primary/40 hover:text-primary transition-colors" style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 600, background: '#fff', border: '1.5px solid #e8e4f0', color: '#55527a' }}>
                {CATEGORY_EMOJI[cat.slug] && <span style={{ fontSize: 14, lineHeight: 1 }}>{CATEGORY_EMOJI[cat.slug]}</span>}
                {localizeCategoryName(tCat, cat)}
              </Link>
            ))}
          </div>

          {/* Activity cards (real data) + browse fallback */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 18 }}>
            {showcase.map(act => (
              <ActivityCard key={act.id} listing={act} featured={act.featured} />
            ))}

            {showcase.length < 4 && (
              <Link href="/browse" className="card-hover flex flex-col items-center justify-center text-center gap-3 p-8" style={{ background: '#fff', border: '1.5px dashed #e8e4f0', borderRadius: 22, boxShadow: '0 2px 12px rgba(124,58,237,0.06)' }}>
                <span style={{ fontSize: 40, lineHeight: 1 }}>🔍</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#55527a' }}>{t('discSeeAll')} →</div>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 4 — REQUEST-TO-CONFIRM */}
      <section style={{ background: '#fff' }} className="py-16 md:py-[88px]">
        <div className="max-w-[1180px] mx-auto px-5 md:px-10 grid md:grid-cols-2 items-center" style={{ gap: 56 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 12 }}>{t('rcEyebrow')}</div>
            <h2 className="font-extrabold text-ink" style={{ fontSize: 'clamp(28px, 4.2vw, 40px)', letterSpacing: '-1.3px', lineHeight: 1.1, margin: 0 }}>
              {t('rcH2a')}<br />{t('rcH2b')}
            </h2>
            <p style={{ marginTop: 16, fontSize: 16, color: '#55527a', lineHeight: 1.6 }}>{t('rcSub')}</p>
            <div className="flex flex-col" style={{ gap: 12, marginTop: 24 }}>
              {points.map(p => (
                <div key={p.title} className="flex items-start" style={{ gap: 12 }}>
                  <span className="inline-flex items-center justify-center flex-shrink-0" style={{ marginTop: 2, width: 22, height: 22, borderRadius: 9999, background: 'rgba(26,122,74,0.12)', color: '#1A7A4A' }}><Icon name="check" size={13} stroke={2.6} /></span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: '#1c1c27' }}>{p.title}</div>
                    <div style={{ fontSize: 13, color: '#55527a', lineHeight: 1.5, marginTop: 1 }}>{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Listing price card mock */}
          <ListingPriceCard />
        </div>
      </section>

      {/* 5 — IN-APP OFFERS (dark) */}
      <section style={{ background: '#1c1c27', position: 'relative', overflow: 'hidden' }} className="py-16 md:py-[88px]">
        <div style={{ position: 'absolute', top: -160, right: -100, width: 520, height: 520, background: 'radial-gradient(circle, rgba(245,197,66,0.20), transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -180, left: -120, width: 480, height: 480, background: 'radial-gradient(circle, rgba(124,58,237,0.32), transparent 65%)', pointerEvents: 'none' }} />
        <div className="relative max-w-[1180px] mx-auto px-5 md:px-10 grid md:grid-cols-[1.1fr_0.9fr] items-center" style={{ gap: 56 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f5c542', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 12 }}>{t('offEyebrow')}</div>
            <h2 className="font-extrabold text-white" style={{ fontSize: 'clamp(28px, 4.4vw, 42px)', letterSpacing: '-1.4px', lineHeight: 1.1, margin: 0 }}>
              {t('offH2a')}<br />{t('offH2b')}
            </h2>
            <p style={{ marginTop: 16, fontSize: 16, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, maxWidth: 480 }}>{t('offSub')}</p>
            <div className="flex flex-wrap" style={{ gap: 22, marginTop: 24 }}>
              {[t('offTag1'), t('offTag2'), t('offTag3')].map(item => (
                <span key={item} className="inline-flex items-center gap-2" style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                  <Check color="#f5c542" size={14} /> {item}
                </span>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <div style={{ width: 320, maxWidth: '100%' }}><OfferToast /></div>
          </div>
        </div>
      </section>

      {/* 6 — HOW IT WORKS */}
      <section id="how" className="scroll-mt-20 py-16 md:py-[88px]" style={{ background: '#fff' }}>
        <div className="max-w-[1180px] mx-auto px-5 md:px-10">
          <div className="text-center" style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 12 }}>{t('howEyebrow')}</div>
            <h2 className="font-extrabold text-ink" style={{ fontSize: 'clamp(28px, 4vw, 38px)', letterSpacing: '-1.2px', margin: 0 }}>{t('howH2')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 20 }}>
            {steps.map(s => (
              <div key={s.n} style={{ background: '#faf8fd', borderRadius: 18, padding: 28, border: '1px solid #e8e4f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: hexa(s.tint, 0.14), color: s.tint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={s.ic} size={23} /></div>
                  <span style={{ fontSize: 42, fontWeight: 900, color: hexa(s.tint, 0.18), letterSpacing: '-1.5px', lineHeight: 1 }}>{s.n}</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 19, color: '#1c1c27', letterSpacing: '-0.4px', marginBottom: 6 }}>{s.title}</div>
                <p style={{ margin: 0, fontSize: 14, color: '#55527a', lineHeight: 1.55 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7 — REASSURANCE STRIP (dark) — single row, horizontally scrollable on mobile */}
      <section style={{ background: '#1c1c27' }} className="py-9">
        <div className="max-w-[1180px] mx-auto px-5 md:px-10 flex items-center md:justify-center flex-nowrap overflow-x-auto [&::-webkit-scrollbar]:hidden gap-x-3.5" style={{ scrollbarWidth: 'none' }}>
          {reassurance.map((item, i) => (
            <span key={item} className="contents">
              <span className="inline-flex items-center gap-2 shrink-0 whitespace-nowrap" style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                <Check color="#f5c542" size={14} /> {item}
              </span>
              {i < reassurance.length - 1 && <span aria-hidden className="shrink-0" style={{ color: 'rgba(255,255,255,0.18)' }}>·</span>}
            </span>
          ))}
        </div>
      </section>

      {/* 8 — FINAL CTA */}
      <section style={{ background: '#fff', position: 'relative', overflow: 'hidden' }} className="py-20 md:py-[88px]">
        <div style={{ position: 'absolute', top: -160, left: '50%', transform: 'translateX(-50%)', width: 760, height: 460, background: 'radial-gradient(ellipse, rgba(124,58,237,0.16), transparent 65%)', pointerEvents: 'none' }} />
        <div className="relative max-w-[680px] mx-auto px-5 text-center">
          <h2 className="font-black text-ink" style={{ fontSize: 'clamp(34px, 5.2vw, 50px)', letterSpacing: '-1.8px', lineHeight: 1.05, margin: 0 }}>
            {t('finalH2a')}<br />{t('finalH2b')}
          </h2>
          <p style={{ marginTop: 16, fontSize: 17, color: '#55527a', lineHeight: 1.55 }}>{t('finalSub')}</p>
          <div style={{ marginTop: 30 }} className="flex justify-center"><BrowseCTA /></div>
        </div>
      </section>

      {/* 9 — PROVIDERS BAND (dark) */}
      <section style={{ background: '#1c1c27' }} className="py-8">
        <div className="max-w-[1180px] mx-auto px-5 md:px-10 flex items-center justify-center flex-wrap gap-4 text-center">
          <span className="inline-flex" style={{ color: '#f5c542' }}><Icon name="users" size={20} color="#f5c542" /></span>
          <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)' }}>
            <strong style={{ color: '#fff', fontWeight: 700 }}>{t('bandStrong')}</strong> {t('bandText')}
          </span>
          <Link href="/providers" className="inline-flex items-center gap-1.5 whitespace-nowrap" style={{ fontSize: 14, fontWeight: 800, color: '#f5c542' }}>
            {t('bandLink')} →
          </Link>
        </div>
      </section>

      <LandingFooter audience="parents" tone="dark" />

      {/* Structured data */}
      <JsonLd schema={{
        '@context': 'https://schema.org', '@type': 'WebSite', name: 'kidvo', url: 'https://kidvo.eu',
        potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: 'https://kidvo.eu/browse?q={search_term_string}' }, 'query-input': 'required name=search_term_string' },
      }} />
      <JsonLd schema={{
        '@context': 'https://schema.org', '@type': 'Organization', name: 'kidvo', url: 'https://kidvo.eu',
        logo: 'https://kidvo.eu/icon.png', sameAs: [], areaServed: { '@type': 'City', name: 'Timișoara', addressCountry: 'RO' },
      }} />
      <JsonLd schema={{
        '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'kidvo',
        description: 'Platformă pentru activități extra-școlare pentru copii în Timișoara', url: 'https://kidvo.eu',
        address: { '@type': 'PostalAddress', addressLocality: 'Timișoara', addressRegion: 'Timiș', addressCountry: 'RO' },
        areaServed: { '@type': 'City', name: 'Timișoara' }, priceRange: 'Gratuit – 500 RON/lună',
      }} />
    </div>
  )
}

// ── Listing price card (mirrors the real activity-detail price card) ──────────
async function ListingPriceCard() {
  const t = await getTranslations('landingMock')
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e4f0', borderRadius: 20, padding: 24, boxShadow: '0 2px 16px rgba(90,70,140,.06)' }}>
      <div className="flex items-center" style={{ gap: 12, marginBottom: 16 }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: hexa('#be123c', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💃</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#1c1c27', letterSpacing: '-0.3px' }}>{t('lcTitle')}</div>
          <div style={{ fontSize: 12.5, color: '#9590b3' }}>{t('lcMeta')}</div>
        </div>
      </div>
      <div className="flex items-baseline" style={{ gap: 6 }}>
        <span style={{ fontWeight: 800, fontSize: 24, color: '#1c1c27', letterSpacing: '-0.5px' }}>200 RON</span>
        <span style={{ fontSize: 13, color: '#9590b3' }}>{t('lcPerMonth')}</span>
      </div>
      <div style={{ fontSize: 12.5, color: '#9590b3', marginTop: 3, marginBottom: 14 }}>{t('lcFirstTrialFree')}</div>
      <div className="flex items-center justify-between" style={{ padding: '10px 12px', background: '#f7faf8', border: '1px solid #d6f0e2', borderRadius: 11, marginBottom: 14 }}>
        <span className="inline-flex items-center gap-2" style={{ fontSize: 12.5, fontWeight: 600, color: '#1A7A4A' }}><span style={{ width: 8, height: 8, borderRadius: 9999, background: '#1A7A4A' }} />{t('lcSpotsAvailable')}</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1A7A4A' }}>{t('lcSpotsLeft', { count: 8 })}</span>
      </div>
      <div className="flex flex-col" style={{ gap: 9 }}>
        <span className="flex items-center justify-center gap-2" style={{ background: '#7c3aed', color: '#fff', fontWeight: 800, fontSize: 14, padding: 13, borderRadius: 11 }}><Icon name="check" size={15} stroke={2.6} color="#fff" /> {t('lcEnroll')}</span>
        <span className="flex items-center justify-center gap-2" style={{ background: '#f0e8ff', color: '#6d28d9', fontWeight: 800, fontSize: 14, padding: 13, borderRadius: 11 }}><Icon name="calendar" size={15} stroke={2} color="#6d28d9" /> {t('lcBookTrial')}</span>
        <span className="block text-center" style={{ background: '#fff', color: '#55527a', fontWeight: 700, fontSize: 13.5, padding: 11, borderRadius: 11, border: '1px solid #e8e4f0' }}>{t('lcShowContact')}</span>
      </div>
      <div style={{ marginTop: 14, fontSize: 11.5, color: '#9590b3', textAlign: 'center', lineHeight: 1.5 }}>{t('lcHelper')}</div>
    </div>
  )
}
