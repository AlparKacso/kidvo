import { getTranslations } from 'next-intl/server'

/**
 * Static, presentational reproduction of the provider "Groups & waitlist" board
 * (src/app/listings/classes/ClassesManagerClient.tsx) for the providers landing.
 * Sample data only — a simplified flat-column take on the board (the real one
 * is swimlanes per listing); labels and tokens mirror production copy.
 */

const TK = {
  primary: '#7c3aed', primaryLt: '#f0e8ff',
  gold: '#f5c542', goldLt: '#fef9e6', goldText: '#a07800',
  info: '#2563EB', infoLt: '#DBEAFE', zinc: '#6B6B72', zincLt: '#F0F0F2',
  success: '#1A7A4A',
  ink: '#1c1c27', inkMid: '#55527a', inkMuted: '#9590b3',
  border: '#e8e4f0', borderMid: '#d5d0e0', bg: '#ece8f5',
}

type Member = { name: string; age: number; source: 'trial' | 'offline' | 'kidvo'; status: 'enrolled' | 'offered' }
type ClassCol = { name: string; accent: string; listed: boolean; capacity: number; roster: Member[] }
type PoolRow = { name: string; age: number; days: number[] }

const POOL_GROUPS: { label: string; rows: PoolRow[] }[] = [
  { label: '6–8', rows: [
    { name: 'Bogdan', age: 8, days: [1, 3] },
    { name: 'Ștefan', age: 7, days: [2, 4] },
  ] },
  { label: '9–11', rows: [
    { name: 'Tudor', age: 9, days: [6] },
    { name: 'David', age: 10, days: [1] },
  ] },
]

const CLASSES: ClassCol[] = [
  { name: 'Ballet · beginners', accent: '#be123c', listed: true, capacity: 10, roster: [
    { name: 'Maria', age: 6, source: 'trial', status: 'enrolled' },
    { name: 'Sofia', age: 7, source: 'kidvo', status: 'enrolled' },
    { name: 'Ana', age: 5, source: 'kidvo', status: 'offered' },
    { name: 'Ioana', age: 6, source: 'offline', status: 'enrolled' },
    { name: 'Carla', age: 5, source: 'kidvo', status: 'enrolled' },
    { name: 'Elena', age: 7, source: 'trial', status: 'enrolled' },
  ] },
  { name: 'Football academy', accent: '#523650', listed: true, capacity: 5, roster: [
    { name: 'Andrei', age: 9, source: 'kidvo', status: 'enrolled' },
    { name: 'Luca', age: 9, source: 'kidvo', status: 'enrolled' },
    { name: 'Matei', age: 8, source: 'trial', status: 'enrolled' },
    { name: 'Vlad', age: 9, source: 'offline', status: 'enrolled' },
    { name: 'Darius', age: 8, source: 'kidvo', status: 'enrolled' },
  ] },
  { name: 'Chess club', accent: '#374151', listed: false, capacity: 6, roster: [
    { name: 'Rareș', age: 8, source: 'offline', status: 'enrolled' },
    { name: 'Paul', age: 9, source: 'offline', status: 'enrolled' },
    { name: 'Mihai', age: 10, source: 'trial', status: 'enrolled' },
    { name: 'Tudor', age: 9, source: 'offline', status: 'enrolled' },
    { name: 'Alex', age: 8, source: 'kidvo', status: 'enrolled' },
    { name: 'Radu', age: 11, source: 'offline', status: 'enrolled' },
    { name: 'Ștefan', age: 9, source: 'offline', status: 'offered' },
  ] },
]

export async function ClassManagerShowcase() {
  const t = await getTranslations('landingMock')
  const dayShort = [t('fcSun'), t('fcMon'), t('fcTue'), t('fcWed'), t('fcThu'), t('fcFri'), t('fcSat')]

  const poolCount = POOL_GROUPS.reduce((n, g) => n + g.rows.length, 0)
  const fullCount = CLASSES.filter(c => c.roster.length >= c.capacity).length

  const PoolCard = ({ row }: { row: PoolRow }) => {
    const days = row.days.length ? ` · ${row.days.map(d => dayShort[d]).join(' ')}` : ''
    return (
      <div style={{ borderRadius: 12, border: `1px solid ${TK.border}`, background: '#fff', padding: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: 9999, background: TK.goldLt, color: TK.goldText, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{row.name[0]}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: TK.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</div>
            <div style={{ fontSize: 10.5, color: TK.inkMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('cmAge', { age: row.age })}{days}</div>
          </div>
        </div>
        <button style={{ marginTop: 8, width: '100%', fontSize: 11.5, fontWeight: 600, color: TK.primary, background: TK.primaryLt, borderRadius: 8, padding: '6px 0' }}>{t('cmOfferSpot')}</button>
      </div>
    )
  }

  const KidCard = ({ m }: { m: Member }) => {
    const offered = m.status === 'offered'
    const enrolled = m.status === 'enrolled'
    const bg = offered ? '#fffdf5' : enrolled ? '#f0faf4' : '#fff'
    const border = offered ? 'rgba(245,197,66,0.5)' : enrolled ? 'rgba(26,122,74,0.3)' : TK.border
    return (
      <div style={{ borderRadius: 12, border: `1px solid ${border}`, background: bg, padding: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: 9999, background: TK.primaryLt, color: TK.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{m.name[0]}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: TK.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
            <div style={{ fontSize: 10.5, color: TK.inkMuted }}>{t('cmAge', { age: m.age })}</div>
          </div>
          {m.source === 'trial' && <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 5, background: TK.infoLt, color: TK.info, letterSpacing: '0.04em' }}>{t('cmTrial')}</span>}
          {m.source === 'offline' && <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 5, background: TK.zincLt, color: TK.zinc, letterSpacing: '0.04em' }}>{t('cmWalkIn')}</span>}
        </div>
        {offered && (
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="pulse-gold" style={{ width: 6, height: 6, borderRadius: 9999, background: TK.gold }} />
            <span style={{ fontSize: 10.5, fontWeight: 600, color: TK.goldText }}>{t('cmAwaitingReply')}</span>
          </div>
        )}
      </div>
    )
  }

  const Column = ({ cls }: { cls: ClassCol }) => {
    const occ = cls.roster.length
    const cap = cls.capacity
    const state = occ > cap ? 'over' : occ === cap ? 'full' : 'open'
    const barColor = state === 'over' ? TK.gold : state === 'full' ? '#C0392B' : TK.success
    return (
      <section style={{ flexShrink: 0, width: 260, borderRadius: 18, border: `1px solid ${TK.border}`, background: '#fff', padding: 12, display: 'flex', flexDirection: 'column', boxShadow: '0 2px 12px rgba(124,58,237,.06)' }}>
        <div style={{ padding: '0 4px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 9999, background: cls.accent, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: TK.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cls.name}</span>
            <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 5, background: cls.listed ? TK.primaryLt : TK.zincLt, color: cls.listed ? TK.primary : TK.zinc }}>{cls.listed ? t('cmListed') : t('cmManual')}</span>
          </div>
          <div style={{ fontSize: 11, color: TK.inkMuted, marginBottom: 6 }}>{occ}/{cap} · {t('cmEnrolled')}</div>
          <div style={{ height: 6, borderRadius: 9999, overflow: 'hidden', background: TK.bg }}>
            <div style={{ height: '100%', borderRadius: 9999, width: `${Math.min(100, (occ / Math.max(cap, 1)) * 100)}%`, background: barColor }} />
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 40 }}>
          {cls.roster.map((m, i) => <KidCard key={i} m={m} />)}
        </div>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8, borderTop: `1px solid ${TK.border}` }}>
          {!cls.listed && <button style={{ fontSize: 12, fontWeight: 600, color: TK.primary, borderRadius: 8, padding: '6px 0', background: 'transparent' }}>{t('cmTurnIntoListing')}</button>}
          <button style={{ fontSize: 12, fontWeight: 600, color: TK.inkMid, borderRadius: 8, padding: '6px 0', background: 'transparent' }}>+ {t('cmAddStudent')}</button>
        </div>
      </section>
    )
  }

  return (
    <div style={{ background: '#fff', borderRadius: 20, border: `1px solid ${TK.border}`, boxShadow: '0 24px 60px -24px rgba(124,58,237,0.22), 0 8px 20px -12px rgba(28,28,39,0.08)', overflow: 'hidden' }}>
      {/* faux app topbar */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${TK.border}`, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-0.8px' }}><span style={{ color: TK.ink }}>kid</span><span style={{ color: TK.primary }}>vo</span></span>
          <span style={{ fontSize: 11.5, color: TK.inkMuted }}>{t('cmProvider')}</span>
        </div>
        <div style={{ width: 28, height: 28, borderRadius: 9999, background: 'linear-gradient(135deg,#c38cfa,#7c3aed)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>SI</div>
      </div>

      <div style={{ background: TK.bg, padding: 20 }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TK.primary, marginBottom: 4 }}>{t('cmEyebrow')}</div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', color: TK.ink }}>{t('cmTitle')}</div>
            <div style={{ fontSize: 12.5, color: TK.inkMuted, marginTop: 4 }}>{t('cmStatLine', { pool: poolCount, classes: CLASSES.length, full: fullCount })}</div>
          </div>
          <button style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, padding: '9px 16px', borderRadius: 9999, color: '#fff', background: TK.ink }}>
            <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> {t('cmStartGroup')}
          </button>
        </div>

        {/* toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: 2, borderRadius: 9999, border: `1px solid ${TK.border}`, background: '#fff' }}>
            {[t('cmByAge'), t('cmByDay'), t('cmAll')].map((lbl, i) => (
              <span key={lbl} style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 9999, color: i === 0 ? '#fff' : TK.inkMid, background: i === 0 ? TK.ink : 'transparent' }}>{lbl}</span>
            ))}
          </div>
          <span style={{ fontSize: 11.5, color: TK.inkMuted }}>{t('cmHint')}</span>
        </div>

        {/* board */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4 }}>
            {/* Waiting pool */}
            <section style={{ flexShrink: 0, width: 260, borderRadius: 18, border: `1.5px solid ${TK.border}`, background: 'rgba(255,255,255,0.6)', padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '0 4px' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: TK.ink }}>{t('cmWaitingPool')}</span>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 9999, background: TK.goldLt, color: TK.goldText }}>{poolCount}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {POOL_GROUPS.map(g => (
                  <div key={g.label}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TK.inkMuted, padding: '0 4px', marginBottom: 6 }}>{g.label}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {g.rows.map((r, i) => <PoolCard key={i} row={r} />)}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {CLASSES.map((c, i) => <Column key={i} cls={c} />)}

            {/* New group column */}
            <button style={{ flexShrink: 0, width: 200, borderRadius: 18, border: `2px dashed ${TK.borderMid}`, color: TK.inkMuted, background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '40px 0' }}>
              <span style={{ fontSize: 24, lineHeight: 1 }}>+</span>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{t('cmNewGroup')}</span>
            </button>
          </div>
          {/* right fade — signals horizontal scroll */}
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 4, width: 64, background: `linear-gradient(90deg, transparent, ${TK.bg})`, pointerEvents: 'none' }} />
        </div>
      </div>
    </div>
  )
}
