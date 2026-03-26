import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'kidvo — Activități pentru copii în Timișoara'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#ece8f5',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '60px 80px',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 52 }}>
          <span style={{ fontSize: 42, fontWeight: 900, color: '#1c1c27', letterSpacing: '-2px' }}>kid</span>
          <span style={{ fontSize: 42, fontWeight: 900, color: '#7c3aed', letterSpacing: '-2px' }}>vo</span>
        </div>

        {/* Headline — line 1 */}
        <div style={{ display: 'flex', fontSize: 86, fontWeight: 900, color: '#1c1c27', letterSpacing: '-4px', lineHeight: 1.05, marginBottom: 4 }}>
          Găsește activitatea
        </div>

        {/* Headline — line 2: "perfectă" purple + "pentru" dark */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 22, fontSize: 86, fontWeight: 900, letterSpacing: '-4px', lineHeight: 1.05, marginBottom: 4 }}>
          <span style={{ color: '#7c3aed' }}>perfectă</span>
          <span style={{ color: '#1c1c27' }}>pentru</span>
        </div>

        {/* Headline — line 3: "copilul tău" blue */}
        <div style={{ display: 'flex', fontSize: 86, fontWeight: 900, color: '#2aa7ff', letterSpacing: '-4px', lineHeight: 1.05, marginBottom: 44 }}>
          copilul tău
        </div>

        {/* Subtitle */}
        <div style={{ display: 'flex', fontSize: 26, color: '#55527a', fontWeight: 400, textAlign: 'center', maxWidth: 680 }}>
          Descoperă sporturi, dans, muzică, arte și programare în Timișoara — rezervă o ședință de probă gratuită.
        </div>

        {/* URL pill */}
        <div style={{
          display: 'flex',
          marginTop: 48,
          background: '#1c1c27',
          borderRadius: 100,
          padding: '10px 28px',
          fontSize: 20,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.7)',
          letterSpacing: '0.02em',
        }}>
          kidvo.eu
        </div>
      </div>
    ),
    { ...size },
  )
}
