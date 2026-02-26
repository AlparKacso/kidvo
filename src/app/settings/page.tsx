import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const isProvider = profile?.role === 'provider' || profile?.role === 'both'

  const { data: provider } = isProvider
    ? await supabase.from('providers').select('*').eq('user_id', user.id).single()
    : Promise.resolve({ data: null })

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
