import Link from 'next/link'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { ClassManagerShowcase } from '@/components/landing/ClassManagerShowcase'
import { Icon, Check, type IconName } from '@/components/landing/LandingIcon'
import { hexa } from '@/lib/hexa'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('landingProviders')
  return { title: t('metaTitle'), description: t('metaDescription') }
}

async function ListCTA() {
  const t = await getTranslations('landingProviders')
  return (
    <div className="inline-flex flex-col items-center gap-2.5">
      <Link
        href="/auth/signup"
        className="inline-flex items-center gap-2.5 font-display font-extrabold rounded-full whitespace-nowrap hover:opacity-90 transition-opacity"
        style={{ background: '#f5c542', color: '#1c1c27', fontSize: 16, padding: '16px 30px', boxShadow: '0 10px 28px -8px rgba(245,197,66,0.6)' }}
      >
        {t('cta')}
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 9999, background: '#1c1c27', color: '#f5c542', fontSize: 12 }}>→</span>
      </Link>
      <span style={{ fontSize: 12.5, color: '#9590b3', fontWeight: 500 }}>{t('ctaSub')}</span>
    </div>
  )
}

function Eyebrow({ children, color = '#7c3aed' }: { children: React.ReactNode; color?: string }) {
  return <div className="font-display" style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 12 }}>{children}</div>
}

export default async function ProvidersLanding() {
  const t = await getTranslations('landingProviders')

  const benefits: { ic: IconName; title: string; desc: string; tint: string }[] = [
    { ic: 'target', title: t('cmB1Title'), desc: t('cmB1Desc'), tint: '#f5c542' },
    { ic: 'clipboard', title: t('cmB2Title'), desc: t('cmB2Desc'), tint: '#2aa7ff' },
    { ic: 'split', title: t('cmB3Title'), desc: t('cmB3Desc'), tint: '#c38cfa' },
  ]
  const steps: { n: string; ic: IconName; title: string; desc: string; tint: string }[] = [
    { n: '01', ic: 'edit', title: t('howS1Title'), desc: t('howS1Desc'), tint: '#7c3aed' },
    { n: '02', ic: 'raiseHand', title: t('howS2Title'), desc: t('howS2Desc'), tint: '#2aa7ff' },
    { n: '03', ic: 'check', title: t('howS3Title'), desc: t('howS3Desc'), tint: '#1A7A4A' },
  ]
  const reassurance = [t('r1'), t('r2'), t('r3'), t('r4'), t('r5'), t('r6')]

  return (
    <div className="font-display" style={{ background: '#fff' }}>
      <LandingNav audience="providers" />

      {/* 1 — HERO */}
      <section style={{ background: '#f6f4ff', position: 'relative', overflow: 'hidden' }} className="py-14 md:py-[72px]">
        <div style={{ position: 'absolute', top: -200, right: -140, width: 640, height: 640, background: 'radial-gradient(circle, rgba(124,58,237,0.20), transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -220, left: -160, width: 560, height: 560, background: 'radial-gradient(circle, rgba(245,197,66,0.14), transparent 65%)', pointerEvents: 'none' }} />
        <div className="relative max-w-[800px] mx-auto px-5 text-center">
          <span className="inline-flex items-center gap-2" style={{ padding: '6px 14px', background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 9999, fontSize: 12.5, fontWeight: 700, color: '#7c3aed', marginBottom: 22 }}>
            <span style={{ width: 7, height: 7, background: '#7c3aed', borderRadius: 9999 }} />
            {t('heroEyebrow')}
          </span>
          <h1 className="font-black text-ink" style={{ fontSize: 'clamp(36px, 6.4vw, 64px)', lineHeight: 1.04, letterSpacing: '-2.4px', margin: 0 }}>
            {t('heroH1a')}<br />
            {t('heroH1b')}<br />
            <span style={{ background: 'linear-gradient(96deg, #7c3aed, #2aa7ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{t('heroH1c')}</span>
          </h1>
          <p className="mx-auto" style={{ marginTop: 20, fontSize: 18, color: '#55527a', lineHeight: 1.6, maxWidth: 540 }}>
            {t('heroSub')} <strong style={{ color: '#1c1c27', fontWeight: 700 }}>{t('heroSubStrong')}</strong>
          </p>
          <div style={{ marginTop: 30 }}><ListCTA /></div>
        </div>
      </section>

      {/* 2 — CLASS MANAGER (dark) */}
      <section style={{ background: 'linear-gradient(180deg, #1c1c27 0%, #221d30 100%)', position: 'relative', overflow: 'hidden' }} className="py-16 md:pt-16 md:pb-[88px]">
        <div style={{ position: 'absolute', top: -160, right: -100, width: 560, height: 560, background: 'radial-gradient(circle, rgba(245,197,66,0.16), transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -180, left: -120, width: 520, height: 520, background: 'radial-gradient(circle, rgba(124,58,237,0.28), transparent 65%)', pointerEvents: 'none' }} />
        <div className="relative max-w-[1180px] mx-auto px-5 md:px-10">
          <div className="text-center mx-auto" style={{ maxWidth: 720, marginBottom: 48 }}>
            <Eyebrow color="#f5c542">{t('cmEyebrow')}</Eyebrow>
            <h2 className="font-extrabold text-white" style={{ fontSize: 'clamp(30px, 4.6vw, 44px)', letterSpacing: '-1.5px', lineHeight: 1.08, margin: 0 }}>
              {t('cmH2a')}<br />{t('cmH2b')}
            </h2>
            <p style={{ marginTop: 16, fontSize: 17, color: 'rgba(255,255,255,0.66)', lineHeight: 1.6 }}>{t('cmSub')}</p>
          </div>

          <ClassManagerShowcase />

          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 18, marginTop: 36 }}>
            {benefits.map(f => (
              <div key={f.title} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: hexa(f.tint, 0.18), color: f.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}><Icon name={f.ic} size={22} /></div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#fff', letterSpacing: '-0.3px', marginBottom: 6 }}>{f.title}</div>
                <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 — HOW IT WORKS */}
      <section id="how" className="scroll-mt-20 py-16 md:py-20" style={{ background: '#ece8f5' }}>
        <div className="max-w-[1180px] mx-auto px-5 md:px-10">
          <div className="text-center" style={{ marginBottom: 48 }}>
            <Eyebrow>{t('howEyebrow')}</Eyebrow>
            <h2 className="font-extrabold text-ink" style={{ fontSize: 'clamp(28px, 4vw, 38px)', letterSpacing: '-1.2px', margin: 0 }}>{t('howH2')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 20 }}>
            {steps.map(s => (
              <div key={s.n} style={{ background: '#fff', borderRadius: 18, padding: 28, border: '1px solid #e8e4f0', boxShadow: '0 2px 12px rgba(124,58,237,0.05)' }}>
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

      {/* 4 — REASSURANCE STRIP */}
      <section style={{ background: '#1c1c27' }} className="py-9">
        <div className="max-w-[1180px] mx-auto px-5 md:px-10 flex items-center justify-center flex-wrap gap-x-3.5 gap-y-2">
          {reassurance.map((item, i) => (
            <span key={item} className="contents">
              <span className="inline-flex items-center gap-2" style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                <Check color="#f5c542" size={14} /> {item}
              </span>
              {i < reassurance.length - 1 && <span aria-hidden style={{ color: 'rgba(255,255,255,0.18)' }}>·</span>}
            </span>
          ))}
        </div>
      </section>

      {/* 5 — REPEAT CTA */}
      <section style={{ background: '#ece8f5', position: 'relative', overflow: 'hidden' }} className="py-20 md:py-[88px]">
        <div style={{ position: 'absolute', top: -160, left: '50%', transform: 'translateX(-50%)', width: 760, height: 460, background: 'radial-gradient(ellipse, rgba(124,58,237,0.18), transparent 65%)', pointerEvents: 'none' }} />
        <div className="relative max-w-[680px] mx-auto px-5 text-center">
          <h2 className="font-black text-ink" style={{ fontSize: 'clamp(34px, 5.2vw, 50px)', letterSpacing: '-1.8px', lineHeight: 1.05, margin: 0 }}>
            {t('repeatH2a')}<br />{t('repeatH2b')}
          </h2>
          <p style={{ marginTop: 16, fontSize: 17, color: '#55527a', lineHeight: 1.55 }}>{t('repeatSub')}</p>
          <div style={{ marginTop: 30 }} className="flex justify-center"><ListCTA /></div>
        </div>
      </section>

      {/* 6 — PARENTS BAND */}
      <section style={{ background: '#fff', borderTop: '1px solid #e8e4f0' }} className="py-8">
        <div className="max-w-[1180px] mx-auto px-5 md:px-10 flex items-center justify-center flex-wrap gap-4 text-center">
          <span className="text-primary inline-flex"><Icon name="parent" size={22} /></span>
          <span style={{ fontSize: 15, color: '#55527a' }}>
            <strong style={{ color: '#1c1c27', fontWeight: 700 }}>{t('bandStrong')}</strong> {t('bandText')}
          </span>
          <Link href="/" className="inline-flex items-center gap-1.5 whitespace-nowrap" style={{ fontSize: 14, fontWeight: 700, color: '#7c3aed' }}>
            {t('bandLink')} →
          </Link>
        </div>
      </section>

      <LandingFooter audience="providers" tone="light" />
    </div>
  )
}
