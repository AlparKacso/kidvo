'use client'

import { useState } from 'react'

type Lang = 'ro' | 'en'

const C = {
  ro: {
    badge: '✨ Acum în Timișoara',
    headline: {
      line1: 'kidvo pune la un loc',
      line2: 'activitățile pentru copii',
      line3: 'din Timișoara',
    },
    sub: 'Caută, compară și rezervă o ședință de probă gratuită — fără angajament.',
    ctaBtn: 'Intră în platformă →',
    stats: [
      { value: '66+', label: 'Activități', color: '#c38cfa' },
      { value: '4', label: 'Furnizori', color: '#2aa7ff' },
      { value: 'Gratuit', label: 'Sesiuni de probă', color: '#22c55e' },
      { value: '4.2 ★', label: 'Rating mediu', color: '#1c1c27' },
    ],
    forParents: {
      badge: 'Pentru Părinți',
      title: 'Pentru părinți',
      sub: 'Găsește activitatea perfectă pentru copilul tău în câteva minute.',
    },
    forProviders: {
      badge: 'Pentru Furnizori',
      title: 'Pentru furnizori',
      sub: 'Ajunge la familiile din Timișoara. Gratuit, fără comisioane.',
    },
    cta: {
      headline: 'Gata să începi?',
      sub: 'Gratuit pentru părinți și furnizori.',
      btn: 'Intră în platformă →',
    },
    parentScreens: [
      { file: 'IMG_6826', label: 'Pagina principală', caption: 'Descoperă activitățile din Timișoara' },
      { file: 'IMG_6833', label: 'Explorează', caption: 'Filtrează după vârstă, zonă și limbă' },
      { file: 'IMG_6834', label: 'Detalii activitate', caption: 'Prețuri, program și probă gratuită' },
      { file: 'IMG_6837', label: 'Dashboard', caption: 'Probe rezervate și activități salvate' },
    ],
    providerScreens: [
      { file: 'IMG_6838', label: 'Pentru furnizori', caption: 'Zero comisioane, zero intermediari' },
      { file: 'IMG_6841', label: 'Listează activitatea', caption: 'Completează detaliile în 2 minute' },
      { file: 'IMG_6842', label: 'Dashboard furnizor', caption: 'Statistici: vizualizări și cereri de probă' },
      { file: 'IMG_6845', label: 'Cereri de probă', caption: 'Confirmă sau refuză direct din aplicație', blurEmail: true },
    ],
  },
  en: {
    badge: '✨ Now in Timișoara',
    headline: {
      line1: 'kidvo connects',
      line2: "families with kids'",
      line3: 'activities in Timișoara',
    },
    sub: 'Browse, compare and book a free trial session — no commitment required.',
    ctaBtn: 'Enter platform →',
    stats: [
      { value: '66+', label: 'Activities', color: '#c38cfa' },
      { value: '4', label: 'Providers', color: '#2aa7ff' },
      { value: 'Free', label: 'Trial sessions', color: '#22c55e' },
      { value: '4.2 ★', label: 'Avg. rating', color: '#1c1c27' },
    ],
    forParents: {
      badge: 'For Parents',
      title: 'For parents',
      sub: 'Find the perfect activity for your child in minutes.',
    },
    forProviders: {
      badge: 'For Providers',
      title: 'For providers',
      sub: 'Reach families in Timișoara. Free, no commissions.',
    },
    cta: {
      headline: 'Ready to get started?',
      sub: 'Free for parents and providers.',
      btn: 'Enter platform →',
    },
    parentScreens: [
      { file: 'IMG_6827', label: 'Home', caption: 'Discover activities in Timișoara' },
      { file: 'IMG_6832', label: 'Browse', caption: 'Filter by age, area and language' },
      { file: 'IMG_6835', label: 'Activity detail', caption: 'Pricing, schedule and free trial' },
      { file: 'IMG_6836', label: 'Dashboard', caption: 'Track trials and saved activities' },
    ],
    providerScreens: [
      { file: 'IMG_6839', label: 'For providers', caption: 'No commissions, no intermediaries' },
      { file: 'IMG_6840', label: 'List your activity', caption: 'Fill in details in 2 minutes' },
      { file: 'IMG_6843', label: 'Provider dashboard', caption: 'Real-time views and trial stats' },
      { file: 'IMG_6844', label: 'Trial requests', caption: 'Confirm or decline directly in the app', blurEmail: true },
    ],
  },
}

interface ScreenItem {
  file: string
  label: string
  caption: string
  blurEmail?: boolean
}

function PhoneFrame({
  screen,
  darkBg,
}: {
  screen: ScreenItem
  darkBg?: boolean
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        style={{
          background: darkBg ? '#2a2a3a' : 'white',
          borderRadius: 28,
          boxShadow: darkBg
            ? '0 25px 50px -12px rgba(0,0,0,0.5)'
            : '0 20px 40px -8px rgba(124,58,237,0.15), 0 4px 16px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          position: 'relative',
          width: '100%',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/mobile%20screenshots/${screen.file}.PNG`}
          alt={screen.label}
          width="100%"
          style={{ display: 'block' }}
        />
        {screen.blurEmail && (
          <div
            style={{
              position: 'absolute',
              top: '56%',
              left: '8%',
              width: '72%',
              height: '4%',
              background: 'rgba(245,242,251,0.95)',
              borderRadius: 4,
              filter: 'blur(2px)',
            }}
          />
        )}
      </div>
      <p
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: darkBg ? 'white' : '#1c1c27',
          marginTop: 16,
          textAlign: 'center',
        }}
      >
        {screen.label}
      </p>
      <p
        style={{
          fontSize: 12,
          color: '#9590b3',
          textAlign: 'center',
          marginTop: 4,
        }}
      >
        {screen.caption}
      </p>
    </div>
  )
}

export default function TeaserPage() {
  const [lang, setLang] = useState<Lang>('ro')
  const t = C[lang]

  return (
    <div style={{ fontFamily: 'inherit', background: '#f5f2fb', minHeight: '100vh' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'white',
          borderBottom: '1px solid #e8e4f0',
          padding: '0 20px',
        }}
      >
        <div
          style={{
            maxWidth: 1024,
            margin: '0 auto',
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <span className="font-display font-black text-2xl tracking-tight">
            <span style={{ color: '#1c1c27' }}>kid</span>
            <span style={{ color: '#7c3aed' }}>vo</span>
          </span>

          {/* Lang toggle */}
          <div
            style={{
              display: 'flex',
              border: '1px solid #e8e4f0',
              borderRadius: 9999,
              padding: 2,
              gap: 0,
            }}
          >
            {(['ro', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 9999,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  background: lang === l ? '#1c1c27' : 'transparent',
                  color: lang === l ? 'white' : '#9590b3',
                  transition: 'all 0.15s',
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: '#f5f2fb',
          paddingTop: 80,
          paddingBottom: 60,
          paddingLeft: 20,
          paddingRight: 20,
          textAlign: 'center',
        }}
      >
        {/* Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <span
            style={{
              background: 'white',
              border: '1px solid #e8e4f0',
              borderRadius: 9999,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              color: '#7c3aed',
            }}
          >
            {t.badge}
          </span>
        </div>

        {/* Headline */}
        <h1
          className="font-display font-black tracking-tight"
          style={{ fontSize: 'clamp(32px, 5vw, 52px)', lineHeight: 1.15, color: '#1c1c27', margin: 0 }}
        >
          <span style={{ display: 'block' }}>{t.headline.line1}</span>
          <span style={{ display: 'block', color: '#7c3aed' }}>{t.headline.line2}</span>
          <span style={{ display: 'block' }}>{t.headline.line3}</span>
        </h1>

        {/* Sub */}
        <p
          style={{
            color: '#55527a',
            fontSize: 'clamp(15px, 2vw, 18px)',
            maxWidth: 520,
            margin: '16px auto 0',
            lineHeight: 1.6,
          }}
        >
          {t.sub}
        </p>

        {/* CTA */}
        <div style={{ marginTop: 32 }}>
          <a
            href="https://kidvo.eu"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: '#7c3aed',
              color: 'white',
              borderRadius: 16,
              padding: '14px 32px',
              fontWeight: 700,
              fontSize: 16,
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#6d28d9')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#7c3aed')}
          >
            {t.ctaBtn}
          </a>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0,
            marginTop: 48,
            maxWidth: 600,
            margin: '48px auto 0',
          }}
        >
          {t.stats.map((stat, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ padding: '0 24px', textAlign: 'center' }}>
                <div
                  className="font-display font-black"
                  style={{ fontSize: 30, color: stat.color, lineHeight: 1 }}
                >
                  {stat.value}
                </div>
                <div style={{ fontSize: 11, color: '#9590b3', fontWeight: 500, marginTop: 4 }}>
                  {stat.label}
                </div>
              </div>
              {i < t.stats.length - 1 && (
                <div style={{ width: 1, height: 36, background: '#e8e4f0', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── For Parents ─────────────────────────────────────────────────────── */}
      <section
        style={{
          background: 'white',
          padding: '80px 20px',
        }}
      >
        <div style={{ maxWidth: 1024, margin: '0 auto' }}>
          {/* Section header */}
          <div style={{ marginBottom: 40 }}>
            <span
              style={{
                background: '#f0e8ff',
                color: '#7c3aed',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                borderRadius: 9999,
                padding: '4px 12px',
              }}
            >
              {t.forParents.badge}
            </span>
            <h2
              className="font-display font-black"
              style={{ fontSize: 30, color: '#1c1c27', marginTop: 12, marginBottom: 0 }}
            >
              {t.forParents.title}
            </h2>
            <p style={{ color: '#55527a', marginTop: 8, maxWidth: 480 }}>{t.forParents.sub}</p>
          </div>

          {/* Screenshots grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 24,
            }}
            className="grid-cols-2 sm:grid-cols-4"
          >
            {t.parentScreens.map((screen) => (
              <PhoneFrame key={screen.file} screen={screen} />
            ))}
          </div>
        </div>
      </section>

      {/* ── For Providers ───────────────────────────────────────────────────── */}
      <section
        style={{
          background: '#1c1c27',
          padding: '80px 20px',
        }}
      >
        <div style={{ maxWidth: 1024, margin: '0 auto' }}>
          {/* Section header */}
          <div style={{ marginBottom: 40 }}>
            <span
              style={{
                background: 'rgba(124,58,237,0.2)',
                color: '#c4a8ff',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                borderRadius: 9999,
                padding: '4px 12px',
              }}
            >
              {t.forProviders.badge}
            </span>
            <h2
              className="font-display font-black"
              style={{ fontSize: 30, color: 'white', marginTop: 12, marginBottom: 0 }}
            >
              {t.forProviders.title}
            </h2>
            <p style={{ color: '#9590b3', marginTop: 8, maxWidth: 480 }}>{t.forProviders.sub}</p>
          </div>

          {/* Screenshots grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 24,
            }}
          >
            {t.providerScreens.map((screen) => (
              <PhoneFrame key={screen.file} screen={screen} darkBg />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: '#7c3aed',
          padding: '80px 20px',
          textAlign: 'center',
        }}
      >
        <h2
          className="font-display font-black"
          style={{ fontSize: 30, color: 'white', margin: 0 }}
        >
          {t.cta.headline}
        </h2>
        <p style={{ color: '#c4a8ff', marginTop: 12 }}>{t.cta.sub}</p>
        <div style={{ marginTop: 32 }}>
          <a
            href="https://kidvo.eu"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: 'white',
              color: '#7c3aed',
              borderRadius: 16,
              padding: '14px 32px',
              fontWeight: 700,
              fontSize: 16,
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f2fb')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
          >
            {t.cta.btn}
          </a>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer
        style={{
          background: '#f5f2fb',
          padding: '24px 20px',
          textAlign: 'center',
          color: '#9590b3',
          fontSize: 12,
        }}
      >
        kidvo · Timișoara, România ·{' '}
        <a
          href="https://kidvo.eu"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#9590b3', textDecoration: 'none' }}
        >
          kidvo.eu
        </a>
      </footer>
    </div>
  )
}
