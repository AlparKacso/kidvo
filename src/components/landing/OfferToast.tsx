import { getTranslations } from 'next-intl/server'
import { Icon } from './LandingIcon'

/**
 * In-app waitlist-offer notification card. Used on the parents landing
 * "Never miss an opening" section. Sample data only.
 */
export async function OfferToast() {
  const t = await getTranslations('landingMock')
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0e6c4', boxShadow: '0 4px 16px -6px rgba(124,58,237,0.18)', padding: 16, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ position: 'relative', width: 34, height: 34, borderRadius: 10, background: 'rgba(245,197,66,0.18)', color: '#a07800', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bell" size={17} stroke={1.8} />
          <span style={{ position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: 9999, background: '#f5c542', border: '2px solid #fff' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#1c1c27' }}>{t('otTitle')}</div>
          <div style={{ fontSize: 10.5, color: '#9590b3' }}>{t('otMeta')}</div>
        </div>
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#55527a', lineHeight: 1.45 }}>
        <strong style={{ color: '#1c1c27' }}>Junior Swimming · AquaKids</strong> {t('otBody')}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ flex: 1, background: '#1c1c27', color: '#fff', fontWeight: 700, fontSize: 12, padding: '9px', borderRadius: 9 }}>{t('otAccept')}</button>
        <button style={{ background: '#f5f3fa', color: '#55527a', fontWeight: 700, fontSize: 12, padding: '9px 14px', borderRadius: 9 }}>{t('otCantMake')}</button>
      </div>
    </div>
  )
}
