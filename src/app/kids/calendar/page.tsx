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

  // Calendar grid + the folded-in Kids/Saved data (profile card + saved tray).
  const [{ children, entries }, { data: areasRaw }, { data: categoriesRaw }, { data: savesRaw }] = await Promise.all([
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
  ])

  const areas      = (areasRaw      ?? []) as { id: string; name: string }[]
  const categories = (categoriesRaw ?? []) as { id: string; name: string; slug: string; accent_color: string }[]
  // Only surface saves whose listing is still live (mirrors My Kids).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saves = ((savesRaw ?? []) as any[]).filter(s => s.listing && s.listing.status === 'active')

  return (
    <AppShell>
      <FamilyCalendarClient kids={children} entries={entries} areas={areas} categories={categories} saves={saves} />
    </AppShell>
  )
}
