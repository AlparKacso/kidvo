import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { SavedClient } from './SavedClient'

export default async function SavedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: saves } = await supabase
    .from('saves')
    .select(`
      id,
      listing:listings(
        id, title, price_monthly, age_min, age_max, status,
        category:categories(name, accent_color),
        area:areas(name),
        provider:providers(display_name),
        schedules:listing_schedules(day_of_week, time_start, time_end)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const active = saves?.filter(s => s.listing && (s.listing as any).status === 'active') ?? []

  return (
    <AppShell>
      <SavedClient initialSaves={active} />
    </AppShell>
  )
}
