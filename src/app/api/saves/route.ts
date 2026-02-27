import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/saves — returns listing IDs saved by current user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ids: [] })

  const { data } = await supabase
    .from('saves')
    .select('listing_id')
    .eq('user_id', user.id)

  const saves = data as unknown as { listing_id: string }[] | null
  return NextResponse.json({ ids: saves?.map(s => s.listing_id) ?? [] })
}

// POST /api/saves — toggle save for a listing
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listing_id } = await req.json()
  if (!listing_id) return NextResponse.json({ error: 'listing_id required' }, { status: 400 })

  // Check if already saved
  const { data: existingRaw } = await supabase
    .from('saves')
    .select('id')
    .eq('user_id', user.id)
    .eq('listing_id', listing_id)
    .single()

  const existing = existingRaw as unknown as { id: string } | null

  if (existing) {
    await supabase.from('saves').delete().eq('id', existing.id)
    return NextResponse.json({ saved: false })
  } else {
    await supabase.from('saves').insert({ user_id: user.id, listing_id })
    return NextResponse.json({ saved: true })
  }
}
