import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminClient } from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Check admin role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((profile as unknown as { role?: string } | null)?.role !== 'admin') redirect('/browse')

  // Fetch all listings with relations
  const { data: listingsRaw } = await supabase
    .from('listings')
    .select(`
      *,
      category:categories(*),
      area:areas(*),
      provider:providers(display_name, contact_email)
    `)
    .order('created_at', { ascending: false })

  const listings = (listingsRaw as unknown as { status: string }[] | null) ?? []

  const pending = listings.filter(l => l.status === 'pending')
  const active  = listings.filter(l => l.status === 'active')
  const paused  = listings.filter(l => l.status === 'paused')

  return <AdminClient pending={pending} active={active} paused={paused} />
}
