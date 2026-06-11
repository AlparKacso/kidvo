import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { syncListedClasses } from '@/lib/classes'
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

  // Lazy-sync: ensure every active listing has a "listed" class row.
  await syncListedClasses(supabase, provider.id)

  const { data: classesRaw } = await supabase
    .from('classes')
    .select('*, category:categories(slug, accent_color)')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: true })
  const classes = (classesRaw ?? []) as any[]
  const classIds = classes.map(c => c.id)

  // Provider's listing ids → the waiting pool comes from waitlist_entries on them.
  const { data: listingsRaw } = await supabase
    .from('listings').select('id').eq('provider_id', provider.id)
  const listingIds = (listingsRaw ?? []).map((l: { id: string }) => l.id)

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

  return (
    <AppShell>
      <ClassesManagerClient
        providerName={provider.display_name}
        classes={classes}
        members={members}
        pool={pool}
      />
    </AppShell>
  )
}
