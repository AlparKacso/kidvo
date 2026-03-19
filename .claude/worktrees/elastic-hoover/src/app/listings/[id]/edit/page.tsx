import { redirect, notFound } from 'next/navigation'
import { AppShell }           from '@/components/layout/AppShell'
import { createClient }       from '@/lib/supabase/server'
import { ListingForm }        from '@/app/listings/new/ListingForm'
import { PauseToggle }        from './PauseToggle'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditListingPage({ params }: Props) {
  const { id }   = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: providerRaw } = await supabase
    .from('providers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const provider = providerRaw as unknown as { id: string } | null

  if (!provider) redirect('/browse')

  const { data: listingRaw } = await supabase
    .from('listings')
    .select('*, schedules:listing_schedules(*)')
    .eq('id', id)
    .eq('provider_id', provider.id)
    .single()

  const listing = listingRaw as unknown as any | null

  if (!listing) notFound()

  const { data: categoriesRaw } = await supabase.from('categories').select('*').order('sort_order')
  const { data: areasRaw }      = await supabase.from('areas').select('*').order('name')

  const categories = categoriesRaw as unknown as any[] | null
  const areas      = areasRaw      as unknown as any[] | null

  const initialData = {
    title:           listing.title,
    category_id:     listing.category_id,
    area_id:         listing.area_id,
    address:         listing.address ?? '',
    language:        listing.language ? listing.language.split(', ') : ['Romanian'],
    age_min:         String(listing.age_min ?? ''),
    age_max:         String(listing.age_max ?? ''),
    schedules:       (listing.schedules as any[])?.map(s => ({
      day_of_week: s.day_of_week,
      time_start:  s.time_start?.slice(0, 5) ?? '16:00',
      time_end:    s.time_end?.slice(0, 5)   ?? '17:00',
      group_label: s.group_label ?? '',
    })) ?? [{ day_of_week: 0, time_start: '16:00', time_end: '17:00', group_label: '' }],
    price_monthly:   String(listing.price_monthly ?? ''),
    spots_total:     String(listing.spots_total ?? ''),
    spots_available: String(listing.spots_available ?? ''),
    description:     listing.description ?? '',
    includes:        (listing.includes as string[])?.length ? listing.includes as string[] : [''],
    trial_available: listing.trial_available ?? true,
  }

  return (
    <AppShell>
      <PauseToggle listingId={id} status={listing.status} />
      <ListingForm
        categories={categories ?? []}
        areas={areas ?? []}
        providerId={provider.id}
        listingId={id}
        initialData={initialData}
      />
    </AppShell>
  )
}
