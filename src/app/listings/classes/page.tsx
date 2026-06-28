import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { applyDerivedSpots } from '@/lib/availability'
import { ClassesManagerClient } from './ClassesManagerClient'

export const metadata: Metadata = { robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function ClassesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: providerRaw } = await supabase
    .from('providers').select('id, display_name').eq('user_id', user.id).single()
  const provider = providerRaw as { id: string; display_name: string } | null
  if (!provider) redirect('/browse')

  // Classes are now provider-managed (no auto-sync from listings). We just load
  // what the provider has created — listed (linked to a listing) and manual.
  const { data: classesRaw } = await supabase
    .from('classes')
    .select('*, category:categories(slug, accent_color)')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: true })
  const classes = (classesRaw ?? []) as any[]
  const classIds = classes.map(c => c.id)

  // Provider's listings → the waiting pool comes from waitlist_entries on them,
  // they populate the "front under listing" picker, AND the docked listing panel
  // renders their public details (cover, price, schedule, spots, status).
  const { data: listingsRaw } = await supabase
    .from('listings')
    .select(`
      id, title, status, price_monthly, pricing_type, age_min, age_max,
      spots_total, spots_available, cover_image_url,
      category:categories(slug, name, accent_color),
      area:areas(name),
      schedules:listing_schedules(day_of_week, time_start, time_end)
    `)
    .eq('provider_id', provider.id).eq('type', 'activity')
    .order('title', { ascending: true })
  const listings   = (listingsRaw ?? []) as any[]
  const listingIds = listings.map(l => l.id)
  // The docked panel shows availability derived from the activity's groups.
  await applyDerivedSpots(listings)

  const [membersRes, poolRes] = await Promise.all([
    classIds.length > 0
      ? supabase.from('roster_members').select('*').in('class_id', classIds)
          .in('status', ['offered', 'enrolled', 'requested'])
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
    listingIds.length > 0
      ? supabase.from('waitlist_entries')
          .select('id, listing_id, child_name, child_age, preferred_days, note, contact_name, contact_phone, contact_email, created_at, listing:listings(title)')
          .in('listing_id', listingIds).eq('status', 'waiting').order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
  ])

  const members = (membersRes.data ?? []) as any[]
  const pool    = (poolRes.data ?? []) as any[]

  // Pending trial requests per listing, for the docked panel's "Trial requests"
  // column. Read through the admin client (scoped to this provider's listings):
  // the requester's child row is cross-user and not readable under provider RLS.
  let trialRequests: any[] = []
  if (listingIds.length > 0) {
    const adminDb = createAdminClient()
    const { data: trialsRaw } = await adminDb
      .from('trial_requests')
      .select('id, listing_id, child_id, preferred_day, created_at, child:children(name, birth_year), parent:users(full_name)')
      .in('listing_id', listingIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    const thisYear = new Date().getFullYear()
    trialRequests = ((trialsRaw ?? []) as any[]).map(r => ({
      id:           r.id,
      listing_id:   r.listing_id,
      child_name:   r.child?.name ?? r.parent?.full_name ?? 'Trial guest',
      child_age:    r.child?.birth_year ? Math.max(0, thisYear - r.child.birth_year) : null,
      parent_name:  r.parent?.full_name ?? null,
      preferred_day: r.preferred_day,
      created_at:   r.created_at,
    }))
  }

  return (
    <AppShell>
      <ClassesManagerClient
        providerName={provider.display_name}
        classes={classes}
        members={members}
        pool={pool}
        listings={listings}
        trialRequests={trialRequests}
      />
    </AppShell>
  )
}
