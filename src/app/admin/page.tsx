import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminClient } from './AdminClient'

export const dynamic = 'force-dynamic'

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

  // Fetch pending reviews for moderation
  const { data: pendingReviewsRaw } = await supabase
    .from('reviews')
    .select(`
      id, rating, comment, created_at,
      listing:listings(id, title),
      reviewer:users(full_name, email)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const pendingReviews = (pendingReviewsRaw as unknown as any[] | null) ?? []

  return <AdminClient pending={pending} active={active} paused={paused} pendingReviews={pendingReviews} />
}
