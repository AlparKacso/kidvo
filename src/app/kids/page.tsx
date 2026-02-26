import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { MyKidsClient } from './MyKidsClient'

export default async function MyKidsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: children }, { data: areas }, { data: saves }] = await Promise.all([
    supabase.from('children').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('areas').select('*').order('name'),
    supabase
      .from('saves')
      .select(`
        id,
        listing:listings(
          id, title, price_monthly, age_min, age_max, status, spots_available,
          category:categories(name, accent_color),
          area:areas(name),
          provider:providers(display_name),
          schedules:listing_schedules(day_of_week, time_start, time_end)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const activeSaves = saves?.filter(s => s.listing && (s.listing as any).status === 'active') ?? []

  return (
    <AppShell>
      <MyKidsClient
        userId={user.id}
        initialKids={children ?? []}
        areas={areas ?? []}
        saves={activeSaves}
      />
    </AppShell>
  )
}
