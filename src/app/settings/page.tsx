import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileRaw } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as unknown as { id: string; full_name: string; phone: string | null; city: string; role: string } | null

  const isProvider = profile?.role === 'provider' || profile?.role === 'both'

  const providerRaw = isProvider
    ? (await supabase.from('providers').select('*').eq('user_id', user.id).single()).data
    : null

  const provider = providerRaw as unknown as { id: string; display_name: string; bio: string | null; contact_email: string; contact_phone: string | null } | null

  return (
    <AppShell>
      <SettingsClient
        profile={profile}
        provider={provider}
        email={user.email ?? ''}
      />
    </AppShell>
  )
}
