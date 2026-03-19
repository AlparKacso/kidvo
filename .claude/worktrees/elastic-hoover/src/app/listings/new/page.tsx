import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
  const { data: providerRaw } = await supabase
    .from('providers')
    .select('*')
    .eq('user_id', user.id)
    .single()

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
