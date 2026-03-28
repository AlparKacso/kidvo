import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { robots: { index: false, follow: false } }
import { MyKidsClient } from './MyKidsClient'

export default async function MyKidsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: childrenRaw }, { data: areasRaw }, { data: savesRaw }, { data: categoriesRaw }, { data: bookingsRaw }, { data: listingsRaw }] = await Promise.all([
    supabase.from('children').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('areas').select('*').order('name'),
    supabase
      .from('saves')
      .select(`
        id,
        kid_id,
        listing:listings(
          id, title, price_monthly, age_min, age_max, status, spots_available, trial_available,
          category:categories(name, accent_color),
          area:areas(name),
          provider:providers(display_name),
          schedules:listing_schedules(day_of_week, time_start, time_end)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('categories').select('id, name, slug, accent_color').order('sort_order'),
    supabase
      .from('trial_requests')
      .select(`
        id, status, preferred_day, created_at, child_id, message,
        listing:listings(
          id, title, price_monthly,
          category:categories(name, accent_color),
          area:areas(name),
          provider:providers(display_name, contact_email, contact_phone)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('listings')
      .select('id, title, price_monthly, age_min, age_max, area_id, trial_available, category:categories(name, slug, accent_color), provider:providers(display_name)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(60),
  ])

  const children   = childrenRaw   as unknown as any[] | null
  const areas      = areasRaw      as unknown as any[] | null
  const saves      = savesRaw      as unknown as any[] | null
  const categories = categoriesRaw as unknown as any[] | null
  const bookings   = bookingsRaw   as unknown as any[] | null
  const listings   = listingsRaw   as unknown as any[] | null

  const activeSaves = saves?.filter(s => s.listing && (s.listing as any).status === 'active') ?? []

  return (
    <AppShell>
      <MyKidsClient
        userId={user.id}
        initialKids={children ?? []}
        areas={areas ?? []}
        saves={activeSaves}
        categories={categories ?? []}
        bookings={bookings ?? []}
        listings={listings ?? []}
      />
    </AppShell>
  )
}
