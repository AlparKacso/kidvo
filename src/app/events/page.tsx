import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { eventsEnabled } from '@/lib/eventsEnabled'
import type { ListingWithRelations } from '@/types/database'
import { EventsListingClient } from './EventsListingClient'

export const metadata: Metadata = {
  title: 'Evenimente pentru copii în Timișoara · kidvo',
  description: 'Evenimente de o singură dată pentru copii în Timișoara — concerte, ateliere, joacă liberă. Actualizate zilnic.',
  alternates: { canonical: 'https://kidvo.eu/events' },
}

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  if (!eventsEnabled()) notFound()

  const supabase = await createClient()
  const nowIso = new Date().toISOString()

  const { data: eventsRaw } = await supabase
    .from('listings')
    .select(`*, category:categories(*), area:areas(*), provider:providers(*), schedules:listing_schedules(*)`)
    .eq('status', 'active')
    .eq('type', 'event')
    .gte('event_end_at', nowIso)
    .order('event_start_at', { ascending: true })

  const events = (eventsRaw as unknown as ListingWithRelations[] | null) ?? []

  return (
    <AppShell>
      <EventsListingClient events={events} />
    </AppShell>
  )
}
