import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'kidvo — Activitati pentru copii in Timisoara'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1c1c27 0%, #2d1b5e 55%, #4c1d95 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px 90px',
          position: 'relative',
          fontFamily: 'sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Decorative blobs */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: '50%',
            background: 'rgba(124,58,237,0.35)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -90,
            right: 160,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'rgba(42,167,255,0.18)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 180,
            right: 80,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'rgba(245,197,66,0.12)',
          }}
        />

        {/* Logo badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 44,
          }}
        >
          <div
            style={{
              background: '#7c3aed',
              borderRadius: 18,
              padding: '14px 32px',
              fontSize: 52,
              fontWeight: 900,
              color: 'white',
              letterSpacing: '-1.5px',
              boxShadow: '0 8px 32px rgba(124,58,237,0.45)',
            }}
          >
            kidvo
          </div>
          <div
            style={{
              marginLeft: 20,
              fontSize: 22,
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            Timisoara
          </div>
        </div>

        {/* Main headline */}
        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            color: 'white',
            lineHeight: 1.1,
            marginBottom: 22,
            maxWidth: 820,
            letterSpacing: '-1px',
          }}
        >
          Activitati pentru copii
        </div>

        {/* Sub-headline */}
        <div
          style={{
            fontSize: 34,
            color: 'rgba(255,255,255,0.55)',
            marginBottom: 60,
            fontWeight: 400,
          }}
        >
          Sport · Dans · Muzica · Arte · Programare
        </div>

        {/* CTA pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              background: '#2aa7ff',
              borderRadius: 100,
              padding: '14px 36px',
              fontSize: 24,
              fontWeight: 700,
              color: 'white',
              letterSpacing: '-0.3px',
            }}
          >
            Cere o sedinta de proba
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 100,
              padding: '14px 36px',
              fontSize: 24,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            kidvo.eu
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
