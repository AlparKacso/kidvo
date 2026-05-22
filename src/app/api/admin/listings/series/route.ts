import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_EMAIL = 'alpar.kacso@gmail.com'

// POST → group event listings into a series, or ungroup them. Admin-only.
//   { action: 'merge',   listingIds: [...] }  → stamp a fresh series_id on all
//   { action: 'unmerge', listingIds: [...] }  → clear series_id on all
// Only `type='event'` rows are affected.
export async function POST(request: Request) {
  const { action, listingIds } = await request.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userRow } = await supabase.from('users').select('email').eq('id', user.id).single()
  if ((userRow as { email?: string } | null)?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (action !== 'merge' && action !== 'unmerge') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  if (!Array.isArray(listingIds) || listingIds.length === 0) {
    return NextResponse.json({ error: 'No listings given' }, { status: 400 })
  }
  if (action === 'merge' && listingIds.length < 2) {
    return NextResponse.json({ error: 'Pick at least two events to merge' }, { status: 400 })
  }

  const seriesId = action === 'merge' ? crypto.randomUUID() : null

  const adminDb = createAdminClient()
  const { error } = await adminDb
    .from('listings')
    .update({ series_id: seriesId, updated_at: new Date().toISOString() })
    .in('id', listingIds)
    .eq('type', 'event')
  if (error) {
    console.error('[listings/series] update error:', error.message)
    return NextResponse.json({ error: 'Failed to update series' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, seriesId })
}
