import { ImageResponse } from 'next/og'
import { createBrowserClient } from '@supabase/ssr'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data: l } = await supabase
    .from('listings')
    .select('title, price_monthly, age_min, age_max, cover_image_url, category:categories(name), provider:providers(display_name), area:areas(name)')
    .eq('id', id)
    .single()

  const title        = l?.title ?? 'Activitate'
  const providerName = (l?.provider as any)?.display_name ?? ''
  const categoryName = (l?.category as any)?.name ?? ''
  const areaName     = (l?.area as any)?.name ?? 'Timișoara'
  const price        = l?.price_monthly ? `${l.price_monthly} RON/lună` : ''
  const ages         = l ? `Vârstă ${l.age_min}–${l.age_max} ani` : ''

  return new ImageResponse(
    (
      <div
        style={{
          background: '#1c1c27',
          width: '100%',
          height: '100%',
          display: 'flex',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Cover image if available */}
        {l?.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={l.cover_image_url}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.25 }}
          />
        )}

        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(28,28,39,0.95) 0%, rgba(124,58,237,0.3) 100%)',
          display: 'flex',
        }} />

        {/* Content */}
        <div style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 72px',
          width: '100%',
        }}>
          {/* Top: logo + category badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: 'white', letterSpacing: '-1.5px' }}>kid</span>
              <span style={{ fontSize: 32, fontWeight: 900, color: '#a78bfa', letterSpacing: '-1.5px' }}>vo</span>
            </div>
            {categoryName ? (
              <div style={{
                background: 'rgba(124,58,237,0.35)',
                border: '1px solid rgba(167,139,250,0.4)',
                borderRadius: 100,
                padding: '8px 20px',
                fontSize: 18,
                fontWeight: 600,
                color: '#c4b5fd',
              }}>
                {categoryName}
              </div>
            ) : null}
          </div>

          {/* Middle: title + provider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 68, fontWeight: 900, color: 'white', letterSpacing: '-2px', lineHeight: 1.05 }}>
              {title}
            </div>
            {providerName ? (
              <div style={{ fontSize: 28, color: '#a78bfa', fontWeight: 600 }}>
                {providerName}
              </div>
            ) : null}
          </div>

          {/* Bottom: pills row */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {[
              areaName ? `📍 ${areaName}, Timișoara` : null,
              ages,
              price,
            ].filter(Boolean).map((pill, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 100,
                padding: '10px 22px',
                fontSize: 20,
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 500,
              }}>
                {pill}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
