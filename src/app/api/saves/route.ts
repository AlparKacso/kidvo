import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/saves — returns listing IDs saved by current user (any kid or no kid)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ids: [] })

  const { data } = await supabase
    .from('saves')
    .select('listing_id')
    .eq('user_id', user.id)

  const saves = data as unknown as { listing_id: string }[] | null
  // Deduplicate: same listing can be saved for multiple kids
  const ids = [...new Set(saves?.map(s => s.listing_id) ?? [])]
  return NextResponse.json({ ids })
}

// POST /api/saves — save or unsave a listing, optionally for a specific kid
//
// Behaviour:
//   { listing_id }          — unsave ALL saves for this listing (used when clicking a
//                             filled heart), OR save without a kid if no saves exist
//   { listing_id, kid_id }  — toggle the specific (listing, kid) pair:
//                             insert if not exists, delete if exists
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { listing_id, kid_id = null } = body as { listing_id: string; kid_id?: string | null }

  if (!listing_id) return NextResponse.json({ error: 'listing_id required' }, { status: 400 })

  if (!kid_id) {
    // No kid_id — check if any saves exist for this listing
    const { data: existing } = await supabase
      .from('saves')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', listing_id)

    if (existing?.length) {
      // Remove ALL saves for this listing regardless of which kid they're for
      await supabase.from('saves').delete()
        .eq('user_id', user.id)
        .eq('listing_id', listing_id)
      return NextResponse.json({ saved: false })
    } else {
      // No saves exist — insert without kid_id (parents without any children set up)
      await supabase.from('saves').insert({ user_id: user.id, listing_id })
      return NextResponse.json({ saved: true })
    }
  }

  // kid_id provided — toggle the specific (listing, kid) save
  const { data: existingKidSave } = await supabase
    .from('saves')
    .select('id')
    .eq('user_id', user.id)
    .eq('listing_id', listing_id)
    .eq('kid_id', kid_id)
    .single()

  if (existingKidSave) {
    await supabase.from('saves').delete().eq('id', (existingKidSave as any).id)
    return NextResponse.json({ saved: false })
  } else {
    await supabase.from('saves').insert({ user_id: user.id, listing_id, kid_id })
    return NextResponse.json({ saved: true })
  }
}
