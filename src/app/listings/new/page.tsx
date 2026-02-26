import { redirect }    from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListingForm }  from './ListingForm'
import { AppShell }     from '@/components/layout/AppShell'

export default async function NewListingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order')

  const { data: areas } = await supabase
    .from('areas')
    .select('*')
    .order('name')

  // Use the real logged-in provider
  const { data: provider } = await supabase
    .from('providers')
    .select('*')
    .eq('user_id', user.id)
    .single()

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
