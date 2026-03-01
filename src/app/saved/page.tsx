import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { SavedClient } from './SavedClient'

export default async function SavedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: savesRaw } = await supabase
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

  const saves = savesRaw as unknown as any[] | null
  const active = saves?.filter(s => s.listing && (s.listing as any).status === 'active') ?? []

  // Deduplicate by listing_id: same listing can be saved for multiple kids but
  // the Saved page shows a merged view — one entry per listing
  const seen = new Set<string>()
  const uniqueSaves = active.filter(s => {
    const id = (s.listing as any)?.id
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })

  return (
    <AppShell>
      <SavedClient initialSaves={uniqueSaves} />
    </AppShell>
  )
}
