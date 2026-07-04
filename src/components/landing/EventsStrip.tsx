import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { eventsEnabled } from '@/lib/eventsEnabled'
import { fmtEventDate, type Locale } from '@/lib/eventDate'
import { groupEventsBySeries } from '@/lib/events/series'
import { Icon } from '@/components/landing/LandingIcon'
import type { ListingWithRelations } from '@/types/database'

/**
 * Quiet events teaser on the parents landing: three slim cards (date · title ·
 * place, no imagery) + one link out to /events. Self-collapsing: renders
 * nothing when events are disabled or fewer than two upcoming events exist,
 * so a zero-events state leaves the landing unchanged.
 */
export async function EventsStrip() {
  if (!eventsEnabled()) return null

  const supabase = await createClient()
  const t = await getTranslations('landingParents')
  const locale = (await getLocale()) as Locale

  const { data } = await supabase
    .from('listings')
    .select('*, area:areas(*)')
    .eq('status', 'active')
    .eq('type', 'event')
    .gte('event_end_at', new Date().toISOString())
    .order('event_start_at', { ascending: true })
    .limit(9)

  const groups = groupEventsBySeries((data as unknown as ListingWithRelations[] | null) ?? [])
  if (groups.length < 2) return null
  const top = groups.slice(0, 3)

  return (
    <section style={{ background: 'linear-gradient(140deg, rgba(124,58,237,0.06) 0%, rgba(245,197,66,0.12) 100%)' }} className="py-12 md:py-14">
      <div className="max-w-[1180px] mx-auto px-5 md:px-10">
        <div className="flex items-baseline justify-between gap-4 flex-wrap" style={{ marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a07800', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 10 }}>{t('evEyebrow')}</div>
            <h2 className="font-extrabold text-ink" style={{ fontSize: 'clamp(22px, 3vw, 28px)', letterSpacing: '-0.8px', margin: 0 }}>{t('evH2')}</h2>
          </div>
          <Link href="/events" style={{ fontSize: 13.5, fontWeight: 700, color: '#7c3aed', whiteSpace: 'nowrap' }}>{t('evSeeAll')} →</Link>
        </div>

        {/* one scrollable row on mobile (same pattern as the category pills) */}
        <div className="flex md:grid md:grid-cols-3 gap-3 md:gap-4 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
          {top.map(({ lead, extraCount }) => {
            const d = fmtEventDate(new Date(lead.event_start_at!), locale)
            const place = lead.venue_name || lead.area?.name || 'Timișoara'
            return (
              <Link
                key={lead.id}
                href={`/events/${lead.id}`}
                className="card-hover shrink-0 w-[78%] sm:w-[46%] md:w-auto flex flex-col"
                style={{ background: '#fff', border: '1.5px solid #e8e4f0', borderRadius: 16, padding: '14px 16px', boxShadow: '0 2px 12px rgba(124,58,237,0.05)' }}
              >
                <span className="inline-flex items-center gap-1.5 self-start" style={{ fontSize: 11.5, fontWeight: 800, color: '#a07800', background: '#fef9e6', border: '1px solid rgba(212,160,23,0.25)', borderRadius: 9999, padding: '3px 10px', marginBottom: 10, whiteSpace: 'nowrap' }}>
                  <Icon name="calendar" size={12} stroke={2.2} color="#a07800" />
                  {d.day} {d.dnum} {d.mo}{extraCount > 0 ? ` +${extraCount}` : ` · ${d.time}`}
                </span>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: '#1c1c27', letterSpacing: '-0.2px', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{lead.title}</span>
                <span className="mt-auto" style={{ fontSize: 12.5, color: '#9590b3', paddingTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {place}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
