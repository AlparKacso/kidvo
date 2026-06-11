import { getTranslations } from 'next-intl/server'
import { hexa } from '@/lib/hexa'
import { Icon } from './LandingIcon'

/**
 * Static, presentational reproduction of the real /calendar Family Calendar
 * surface (src/app/kids/calendar/FamilyCalendarClient.tsx) for the parents
 * landing. Sample data only — structure, tokens and labels mirror production.
 */

type KidId = 'all' | 'emma' | 'noah'
const KIDS: Record<KidId, { name: string; color: string; initial: string; count: number }> = {
  all: { name: 'All kids', color: '#7c3aed', initial: '', count: 9 },
  emma: { name: 'Emma', color: '#be123c', initial: 'E', count: 2 },
  noah: { name: 'Noah', color: '#2aa7ff', initial: 'N', count: 7 },
}

const DATES = [8, 9, 10, 11, 12, 13, 14]
const START_H = 9, END_H = 17, ROW_H = 34

type Block = { day: number; start: number; end: number; kid: KidId; title: string; state: 'enrolled' | 'pending' | 'waitlisted'; popover?: boolean }
const CAL_BLOCKS: Block[] = [
  { day: 0, start: 16, end: 17, kid: 'noah', title: 'Art Studio', state: 'waitlisted' },
  { day: 1, start: 15, end: 16, kid: 'emma', title: 'Ballet', state: 'enrolled' },
  { day: 2, start: 16, end: 17, kid: 'noah', title: 'Art Studio', state: 'waitlisted' },
  { day: 3, start: 15, end: 16, kid: 'emma', title: 'Dance trial', state: 'pending' },
  { day: 4, start: 16, end: 17, kid: 'noah', title: 'No Trial', state: 'enrolled', popover: true },
  { day: 5, start: 10, end: 11, kid: 'emma', title: 'Gymnastics', state: 'enrolled' },
  { day: 6, start: 16, end: 17, kid: 'noah', title: 'Art Studio', state: 'waitlisted' },
]

export async function FamilyCalendarShowcase() {
  const t = await getTranslations('landingMock')
  const DAYS = [t('fcMon'), t('fcTue'), t('fcWed'), t('fcThu'), t('fcFri'), t('fcSat'), t('fcSun')]
  const hours = Array.from({ length: END_H - START_H + 1 }, (_, i) => START_H + i)
  const bodyH = (END_H - START_H) * ROW_H

  const CalBlock = ({ b }: { b: Block }) => {
    const k = KIDS[b.kid]
    const top = (b.start - START_H) * ROW_H + 2
    const height = (b.end - b.start) * ROW_H - 4
    const timeStr = `${String(b.start).padStart(2, '0')}:00–${String(b.end).padStart(2, '0')}:00`

    let bg: string, border: string, label: string, chip: string | null = null
    if (b.state === 'enrolled') {
      bg = hexa(k.color, 0.14); border = `1px solid ${hexa(k.color, 0.55)}`; label = b.title
    } else if (b.state === 'pending') {
      bg = '#fff'; border = `1.5px dashed ${hexa(k.color, 0.7)}`; label = b.title; chip = t('fcPending')
    } else {
      bg = `repeating-linear-gradient(45deg, ${hexa(k.color, 0.16)} 0 7px, ${hexa(k.color, 0.05)} 7px 14px)`
      border = `1px solid ${hexa(k.color, 0.5)}`; label = t('fcWaitlistLabel'); chip = t('fcWaitlisted')
    }
    const wait = b.state === 'waitlisted'
    return (
      <div style={{ position: 'absolute', top, height, left: 3, right: 3, background: bg, border, borderLeft: `3px solid ${k.color}`, borderRadius: 7, padding: '5px 7px', overflow: 'hidden', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {wait && <Icon name="alert" size={10} stroke={2.2} color={k.color} />}
          <span style={{ fontSize: 10, fontWeight: 800, color: '#1c1c27', letterSpacing: wait ? '0.04em' : '-0.2px', textTransform: wait ? 'uppercase' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        </div>
        <div style={{ fontSize: 9.5, color: '#55527a', marginTop: 1 }}>{timeStr}</div>
        {chip && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 3, fontSize: 8.5, fontWeight: 700, color: '#55527a' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: b.state === 'pending' ? '#fff' : hexa(k.color, 0.3), border: `1px ${b.state === 'pending' ? 'dashed' : 'solid'} ${hexa(k.color, 0.6)}` }} />{chip}
          </div>
        )}
      </div>
    )
  }

  const EventPopover = () => (
    <div style={{ position: 'absolute', top: 44, left: '50%', transform: 'translateX(-46%)', zIndex: 20, width: 230, background: '#fff', borderRadius: 14, border: '1px solid #e8e4f0', boxShadow: '0 24px 48px -16px rgba(28,28,39,0.28)', padding: 16 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '3px 9px', borderRadius: 9999, marginBottom: 10 }}>
        <Icon name="check" size={11} stroke={2.6} color="#15803d" /> {t('fcEnrolledPill')}
      </span>
      <div style={{ fontWeight: 800, fontSize: 15, color: '#1c1c27', letterSpacing: '-0.3px' }}>No Trial</div>
      <div style={{ fontSize: 11.5, color: '#9590b3', marginTop: 1 }}>Kidvo Events · Noah</div>
      <div style={{ fontSize: 11.5, color: '#55527a', marginTop: 8 }}>{t('fcRecurring')}</div>
      <button style={{ width: '100%', marginTop: 12, background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 12.5, padding: '9px', borderRadius: 9 }}>{t('fcAddToCalendar')}</button>
      <button style={{ width: '100%', marginTop: 7, background: '#fff', color: '#1c1c27', fontWeight: 700, fontSize: 12.5, padding: '9px', borderRadius: 9, border: '1px solid #e8e4f0' }}>{t('fcContactProvider')}</button>
    </div>
  )

  const KidCardRail = ({ id, selected }: { id: KidId; selected: boolean }) => {
    const k = KIDS[id]
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderRadius: 14, background: '#fff', border: selected ? '1.5px solid #1c1c27' : '1px solid #e8e4f0', boxShadow: selected ? '0 2px 10px rgba(28,28,39,0.08)' : 'none' }}>
        <div style={{ width: 34, height: 34, borderRadius: 9999, background: id === 'all' ? '#ece8f5' : hexa(k.color, 0.92), color: id === 'all' ? '#7c3aed' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
          {id === 'all' ? <Icon name="users" size={16} color="#7c3aed" /> : k.initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1c1c27' }}>{id === 'all' ? t('fcAllKids') : k.name}</div>
          <div style={{ fontSize: 11, color: '#9590b3' }}>{id === 'all' ? t('fcCombinedView') : t('fcYears', { age: id === 'emma' ? 7 : 5 })}</div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: selected ? '#1c1c27' : '#9590b3' }}>{k.count}</span>
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e8e4f0', boxShadow: '0 24px 60px -24px rgba(124,58,237,0.28), 0 8px 20px -12px rgba(28,28,39,0.10)', overflow: 'hidden', width: '100%', display: 'grid', gridTemplateColumns: '230px 1fr' }}>
      {/* Left rail */}
      <div style={{ borderRight: '1px solid #f0eef7', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: '#faf9fc' }}>
        <KidCardRail id="all" selected={false} />
        <KidCardRail id="emma" selected={false} />
        <KidCardRail id="noah" selected={true} />
        <div style={{ marginTop: 6, background: '#fff', border: '1px solid #e8e4f0', borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9590b3', marginBottom: 10 }}>{t('fcStatus')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 12, color: '#55527a' }}><span style={{ width: 13, height: 13, borderRadius: 9999, background: '#c8c4d4' }} />{t('fcEnrolled')}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 12, color: '#55527a' }}><span style={{ width: 13, height: 13, borderRadius: 9999, border: '1.5px dashed #9590b3' }} />{t('fcPending')}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 12, color: '#55527a' }}><span style={{ width: 13, height: 13, borderRadius: 3, background: 'repeating-linear-gradient(45deg,#cdd6e6 0 3px,#eef1f7 3px 6px)' }} />{t('fcWaitlisted')}</span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ minWidth: 0 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0eef7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 800, fontSize: 14.5, color: '#1c1c27', letterSpacing: '-0.3px' }}>{t('fcWeekRange')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid #e8e4f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9590b3', fontSize: 13 }}>‹</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1c1c27' }}>{t('fcToday')}</span>
            <span style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid #e8e4f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9590b3', fontSize: 13 }}>›</span>
          </div>
        </div>

        {/* day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(7, 1fr)', borderBottom: '1px solid #f0eef7' }}>
          <div />
          {DAYS.map((d, i) => (
            <div key={i} style={{ padding: '8px 0 9px', textAlign: 'center', borderLeft: '1px solid #f0eef7', background: i >= 5 ? '#faf8fd' : '#fff' }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', color: '#9590b3', textTransform: 'uppercase' }}>{d}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: i >= 5 ? '#7c3aed' : '#1c1c27', marginTop: 1 }}>{DATES[i]}</div>
            </div>
          ))}
        </div>

        {/* grid body */}
        <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(7, 1fr)', position: 'relative' }}>
          <div style={{ position: 'relative', height: bodyH }}>
            {hours.map((h, i) => (
              <div key={h} style={{ position: 'absolute', top: i * ROW_H - 6, right: 6, fontSize: 9.5, color: '#9590b3', fontWeight: 600 }}>{h}:00</div>
            ))}
          </div>
          {DAYS.map((d, di) => (
            <div key={di} style={{
              position: 'relative', height: bodyH, borderLeft: '1px solid #f0eef7',
              background: di >= 5
                ? `repeating-linear-gradient(180deg, #fbfafd 0, #fbfafd ${ROW_H - 1}px, #f4f2fa ${ROW_H - 1}px, #f4f2fa ${ROW_H}px)`
                : `repeating-linear-gradient(180deg, transparent 0, transparent ${ROW_H - 1}px, #f4f2fa ${ROW_H - 1}px, #f4f2fa ${ROW_H}px)`,
            }}>
              {CAL_BLOCKS.filter(b => b.day === di).map((b, bi) => <CalBlock key={bi} b={b} />)}
              {CAL_BLOCKS.some(b => b.day === di && b.popover) && <EventPopover />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
