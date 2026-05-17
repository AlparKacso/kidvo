import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { AppShell } from '@/components/layout/AppShell'
import { EventCard } from '@/components/ui/EventCard'
import { EventActionBar } from './EventActionBar'
import { CoverPhotoZoom } from '@/components/ui/CoverPhotoZoom'
import { createClient } from '@/lib/supabase/server'
import {
  fmtEventDate, urgencyFor, categoryEmoji, categoryPalette, isFreePrice, type Locale,
} from '@/lib/eventDate'
import type { CalendarEvent } from '@/lib/calendarLinks'
import type { ListingWithRelations } from '@/types/database'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('listings').select('title, description').eq('id', id).eq('type', 'event').single()
  const ev = data as { title?: string; description?: string } | null
  if (!ev) return { title: 'Eveniment · kidvo' }
  return {
    title: `${ev.title} · kidvo`,
    description: ev.description?.slice(0, 160) ?? 'Eveniment pentru copii în Timișoara.',
    alternates: { canonical: `https://kidvo.eu/events/${id}` },
  }
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('events')

  const { data: raw } = await supabase
    .from('listings')
    .select(`*, category:categories(*), area:areas(*), provider:providers(*), schedules:listing_schedules(*)`)
    .eq('id', id)
    .eq('type', 'event')
    .eq('status', 'active')
    .single()

  const ev = raw as unknown as ListingWithRelations | null
  if (!ev) notFound()

  const slug   = ev.category?.slug ?? 'other'
  const emoji  = categoryEmoji(slug)
  const [c1, c2, c3] = categoryPalette(slug)
  const start  = ev.event_start_at ? new Date(ev.event_start_at) : null
  const end    = ev.event_end_at ? new Date(ev.event_end_at) : start
  const date   = start ? fmtEventDate(start, locale) : null
  const urg    = start ? urgencyFor(start, new Date(), locale) : null
  const venue  = ev.venue_name || ev.area?.name || ''
  const organizer = ev.organizer_name || ev.provider?.display_name || ''
  const free   = isFreePrice(ev.price_label)
  const includes = (ev.includes ?? []).filter(Boolean)

  const calEvent: CalendarEvent | null = start && end ? {
    title: ev.title, start, end, venue: ev.venue_name, description: ev.description, organizer, locale,
  } : null

  const { data: similarRaw } = await supabase
    .from('listings')
    .select(`*, category:categories(*), area:areas(*), provider:providers(*), schedules:listing_schedules(*)`)
    .eq('status', 'active').eq('type', 'event')
    .eq('category_id', ev.category_id)
    .neq('id', ev.id)
    .gte('event_end_at', new Date().toISOString())
    .order('event_start_at', { ascending: true })
    .limit(3)
  const similar = (similarRaw as unknown as ListingWithRelations[] | null) ?? []

  const toneCls = urg?.tone === 'warm' ? 'bg-gold text-ink' : 'bg-white/90 text-ink-mid'

  return (
    <AppShell>
      <div className="max-w-[1100px] mx-auto flex flex-col gap-6">
        <Link href="/events" className="font-display text-sm font-semibold text-ink-muted hover:text-primary transition-colors">
          {t('backToEvents')}
        </Link>

        {/* Hero */}
        {ev.cover_image_url ? (
          <div className="flex flex-col md:flex-row gap-6 md:items-start">
            <div className="w-full max-w-[300px] mx-auto md:mx-0 shrink-0">
              <CoverPhotoZoom src={ev.cover_image_url} alt={ev.title} aspect="4/5" />
            </div>
            <div className="flex flex-col gap-3 md:pt-1">
              {urg?.label && (
                <span className={`self-start inline-flex items-center gap-[5px] px-2.5 py-1 rounded-full font-display text-[10.5px] font-bold uppercase tracking-[0.08em] border ${urg.tone === 'warm' ? 'bg-gold text-ink border-gold/50' : 'bg-primary-lt text-primary border-primary-border'}`}>
                  {urg.key === 'thisweek' && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />}
                  {urg.label}
                </span>
              )}
              <h1 className="font-display font-black text-ink leading-[1.1]" style={{ fontSize: 'clamp(26px,4vw,40px)', letterSpacing: '-1.2px' }}>
                {ev.title}
              </h1>
              {date && (
                <span className="self-start inline-flex items-center gap-2 font-display text-[13px] font-semibold text-ink-mid bg-surface border border-border px-3 py-1.5 rounded-full">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  {date.day} {date.dnum} {date.mo} · {date.time}{venue ? ` · ${venue}` : ''}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden min-h-[280px] flex flex-col justify-end p-7"
            style={{ background: `linear-gradient(155deg, ${c1} 0%, ${c2} 70%, ${c3} 110%)` }}>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-90"
              style={{ fontSize: 'clamp(80px,14vw,150px)', filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.22))' }}>
              {emoji}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
            <div className="relative flex flex-col gap-3">
              {urg?.label && (
                <span className={`self-start inline-flex items-center gap-[5px] px-2.5 py-1 rounded-full font-display text-[10.5px] font-bold uppercase tracking-[0.08em] border border-white/50 backdrop-blur-[6px] ${toneCls}`}>
                  {urg.key === 'thisweek' && <span className="w-1.5 h-1.5 rounded-full bg-ink/40" />}
                  {urg.label}
                </span>
              )}
              <h1 className="font-display font-black text-white leading-[1.1] [text-shadow:0_2px_14px_rgba(0,0,0,0.4)]"
                style={{ fontSize: 'clamp(28px,4vw,42px)', letterSpacing: '-1.5px' }}>
                {ev.title}
              </h1>
              {date && (
                <span className="self-start inline-flex items-center gap-2 font-display text-[13px] font-semibold text-white bg-black/35 backdrop-blur-[6px] px-3 py-1.5 rounded-full">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  {date.day} {date.dnum} {date.mo} · {date.time}{venue ? ` · ${venue}` : ''}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action bar */}
        <div className="sticky top-[64px] z-20 bg-bg/85 backdrop-blur-sm rounded-xl border border-border shadow-card px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={cnPrice(free)}>{ev.price_label || '—'}</span>
            {organizer && (
              <span className="text-[12px] text-ink-mid"><span className="text-ink-muted">{t('organizedBy')}</span> <span className="font-semibold text-ink">{organizer}</span></span>
            )}
          </div>
          <EventActionBar listingId={ev.id} initialSaved={false} calEvent={calEvent} shareTitle={ev.title} />
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-9 items-start">
          <div className="flex flex-col gap-7">
            {ev.description && (
              <section>
                <h2 className="font-display font-extrabold text-ink mb-2" style={{ fontSize: '19px', letterSpacing: '-0.4px' }}>{t('aboutEvent')}</h2>
                <p className="text-[14.5px] text-ink-mid leading-[1.65] whitespace-pre-wrap max-w-[60ch]">{ev.description}</p>
              </section>
            )}
            {includes.length > 0 && (
              <section>
                <h2 className="font-display font-extrabold text-ink mb-2" style={{ fontSize: '19px', letterSpacing: '-0.4px' }}>{t('whatToExpect')}</h2>
                <ul className="flex flex-col gap-1.5">
                  {includes.map((it, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[14px] text-ink-mid">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />{it}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-[140px] flex flex-col gap-4">
            <div className="bg-white border border-border rounded-xl p-5 shadow-card flex flex-col gap-3">
              <div className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-muted">{t('practicalDetails')}</div>
              {date && <Detail label={t('whenWhere')} value={`${date.day} ${date.dnum} ${date.mo} · ${date.time}`} />}
              {(ev.address || ev.venue_name || venue) && (
                <div className="flex flex-col gap-0.5">
                  <span className="font-display text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{t('location')}</span>
                  <span className="text-[13px] text-ink">
                    {ev.venue_name && <span className="font-semibold">{ev.venue_name}</span>}
                    {ev.venue_name && ev.address ? ' · ' : ''}
                    {ev.address || (!ev.venue_name ? venue : '')}
                  </span>
                  {ev.maps_url && (
                    <a href={ev.maps_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary font-display font-semibold mt-1 hover:underline">
                      <svg width="11" height="11" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5a5 5 0 0 1 5 5c0 3.5-5 8-5 8s-5-4.5-5-8a5 5 0 0 1 5-5Z" stroke="currentColor" strokeWidth="1.3" fill="none"/><circle cx="7.5" cy="6.5" r="1.5" fill="currentColor"/></svg>
                      {t('viewOnMaps')}
                    </a>
                  )}
                </div>
              )}
              {ev.language && <Detail label={t('language')} value={ev.language} />}
              {ev.spots_total != null && <Detail label={t('capacity')} value={String(ev.spots_total)} />}
              <Detail label={t('ages')} value={`${ev.age_min}–${ev.age_max}`} />
            </div>
            {organizer && (
              <div className="bg-white border border-border rounded-xl p-5 shadow-card flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary text-white font-display font-bold flex items-center justify-center flex-shrink-0">
                  {organizer.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-display text-[11px] font-semibold tracking-label uppercase text-ink-muted">{t('organizerSection')}</div>
                  <div className="font-display text-sm font-semibold text-ink truncate">{organizer}</div>
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Similar */}
        {similar.length > 0 && (
          <section className="mt-2">
            <h2 className="font-display font-black text-ink mb-4" style={{ fontSize: '22px', letterSpacing: '-0.8px' }}>{t('similarEvents')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {similar.map(s => <EventCard key={s.id} listing={s} />)}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-display text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{label}</span>
      <span className="text-[13px] text-ink">{value}</span>
    </div>
  )
}

function cnPrice(free: boolean) {
  return [
    'inline-flex items-center font-display font-extrabold text-[14px] tracking-[-0.2px] px-3.5 py-1.5 rounded-full border',
    free ? 'bg-success-lt text-success border-success/25' : 'bg-gold-lt text-ink border-gold/50',
  ].join(' ')
}
