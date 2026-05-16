import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AssistedDraftForm } from './AssistedDraftForm'

export const metadata: Metadata = { robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function NewEventDraftPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((profile as { role?: string } | null)?.role !== 'admin') redirect('/browse')

  return (
    <div className="min-h-screen bg-bg font-body">
      <div className="max-w-[680px] mx-auto px-5 py-8">
        <AssistedDraftForm />
      </div>
    </div>
  )
}
