import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { ListingForm } from '@/app/listings/new/ListingForm'

export const metadata: Metadata = { robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

const LANG_LABELS: Record<string, string> = {
  'Română': 'Romanian', 'Romanian': 'Romanian', 'Engleză': 'English', 'English': 'English',
}

export default async function QuickStartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const t = await getTranslations('quickStart')

  const { data: providerRaw } = await supabase
    .from('providers').select('id, display_name, contact_phone').eq('user_id', user.id).single()
  const provider = providerRaw as { id: string; display_name: string; contact_phone: string | null } | null
  if (!provider) redirect('/browse')

  const { data: clsRaw } = await supabase
    .from('classes').select('*').eq('id', id).eq('provider_id', provider.id).single()
  const cls = clsRaw as any
  // Only manual classes (no listing yet) can be turned into a listing.
  if (!cls || cls.listing_id) redirect('/listings/classes')

  const [{ data: categories }, { data: areas }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('areas').select('*').order('name'),
  ])

  // Pre-fill the wizard from what the class already knows.
  const schedules = (cls.days as number[]).map(d => ({
    day_of_week: d,
    time_start:  cls.time_start ?? '16:00',
    time_end:    cls.time_end ?? '17:00',
    group_label: '',
  }))

  const initialData = {
    type:        'activity' as const,
    title:       cls.name ?? '',
    category_id: cls.category_id ?? '',
    area_id:     cls.area_id ?? '',
    age_min:     cls.age_min != null ? String(cls.age_min) : '',
    age_max:     cls.age_max != null ? String(cls.age_max) : '',
    spots_total: cls.capacity != null ? String(cls.capacity) : '',
    schedules,
    language:    cls.language ? [LANG_LABELS[cls.language] ?? 'Romanian'] : ['Romanian'],
  }

  const banner = (
    <div className="mb-6 p-4 rounded-[14px] border border-gold/40 bg-gold-lt flex items-start gap-3">
      <span className="text-lg leading-none mt-0.5">✨</span>
      <div>
        <div className="font-display text-sm font-bold text-gold-text mb-0.5">{t('bannerTitle')}</div>
        <div className="font-display text-[12.5px] text-ink-mid">{t('bannerSub', { name: cls.name })}</div>
      </div>
    </div>
  )

  return (
    <AppShell>
      <ListingForm
        categories={categories ?? []}
        areas={areas ?? []}
        providerId={provider.id}
        providerName={provider.display_name ?? ''}
        providerHasPhone={!!provider.contact_phone?.trim()}
        initialData={initialData}
        linkClassId={cls.id}
        redirectTo="/listings/classes"
        prefillBanner={banner}
      />
    </AppShell>
  )
}
