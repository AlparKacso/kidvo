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

  const { children, entries } = await getFamilyCalendar(user.id)

  return (
    <AppShell>
      <FamilyCalendarClient kids={children} entries={entries} />
    </AppShell>
  )
}
