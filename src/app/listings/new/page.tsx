import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ListingForm }  from './ListingForm'
import { AppShell }     from '@/components/layout/AppShell'

export default async function NewListingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: categoriesRaw } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order')

  const { data: areasRaw } = await supabase
    .from('areas')
    .select('*')
    .order('name')

  const categories = categoriesRaw as unknown as any[] | null
  const areas      = areasRaw      as unknown as any[] | null

  // Use the real logged-in provider
  let { data: providerRaw } = await supabase
    .from('providers')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Recovery path: if the user is a provider (by users.role) but their
  // providers row is missing (e.g. a past signup-callback fallback glitch),
  // create it on the fly so they land on the wizard instead of /browse.
  if (!providerRaw) {
    const { data: userRow } = await supabase
      .from('users')
      .select('role, full_name, email')
      .eq('id', user.id)
      .single()
    const role = (userRow as { role?: string } | null)?.role
    if (role === 'provider' || role === 'both') {
      const adminDb = createAdminClient()
      const fullName = (userRow as { full_name?: string } | null)?.full_name ?? user.email?.split('@')[0] ?? ''
      const email    = (userRow as { email?: string } | null)?.email ?? user.email ?? ''
      await adminDb.from('providers').upsert({
        user_id:       user.id,
        display_name:  fullName,
        contact_email: email,
      }, { onConflict: 'user_id' })
      console.warn('[listings/new] auto-created missing providers row for', email)
      const retry = await supabase.from('providers').select('*').eq('user_id', user.id).single()
      providerRaw = retry.data
    }
  }

  const provider = providerRaw as unknown as { id: string } | null

  if (!provider) redirect('/browse')

  return (
    <AppShell showListCta={false}>
      <ListingForm
        categories={categories ?? []}
        areas={areas ?? []}
        providerId={provider.id}
      />
    </AppShell>
  )
}
