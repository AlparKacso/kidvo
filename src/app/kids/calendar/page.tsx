import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { getFamilyCalendar } from '@/lib/familyCalendar'
import { FamilyCalendarClient } from './FamilyCalendarClient'

export const metadata: Metadata = { robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Calendar grid + the folded-in Kids & Activities data (profile/CRUD, saved
  // tray, trial-request bookings, and the recommendations pool).
  const [{ children, entries }, { data: areasRaw }, { data: categoriesRaw }, { data: savesRaw }, { data: bookingsRaw }, { data: listingsRaw }] = await Promise.all([
    getFamilyCalendar(user.id),
    supabase.from('areas').select('id, name').order('name'),
    supabase.from('categories').select('id, name, slug, accent_color').order('sort_order'),
    supabase
      .from('saves')
      .select(`
        id, kid_id,
        listing:listings(
          id, title, price_monthly, pricing_type, status, trial_available, spots_available,
          category:categories(name, slug, accent_color)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('trial_requests')
      .select(`
        id, status, preferred_day, created_at, child_id, message,
        listing:listings(
          id, title, price_monthly,
          category:categories(name, slug, accent_color),
          area:areas(name),
          provider:providers(display_name, contact_email, contact_phone)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('listings')
      .select('id, title, price_monthly, pricing_type, age_min, age_max, area_id, trial_available, category:categories(name, slug, accent_color), provider:providers(display_name)')
      .eq('status', 'active').eq('type', 'activity')
      .order('created_at', { ascending: false })
      .limit(60),
  ])

  const areas      = (areasRaw      ?? []) as { id: string; name: string }[]
  const categories = (categoriesRaw ?? []) as { id: string; name: string; slug: string; accent_color: string }[]
  // Only surface saves whose listing is still live (mirrors My Kids).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saves    = ((savesRaw    ?? []) as any[]).filter(s => s.listing && s.listing.status === 'active')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookings = ((bookingsRaw ?? []) as any[]).filter(b => b.listing)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listings = (listingsRaw ?? []) as any[]

  return (
    <AppShell>
      <FamilyCalendarClient
        userId={user.id}
        kids={children}
        entries={entries}
        areas={areas}
        categories={categories}
        saves={saves}
        bookings={bookings}
        listings={listings}
      />
    </AppShell>
  )
}
