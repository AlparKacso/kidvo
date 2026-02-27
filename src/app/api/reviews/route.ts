import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { listing_id, provider_id, rating, comment } = await request.json()

    if (!listing_id || !provider_id || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Eligibility check: must have at least one confirmed trial for this listing
    const { data: confirmedTrial } = await supabase
      .from('trial_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', listing_id)
      .eq('status', 'confirmed')
      .limit(1)
      .maybeSingle()

    if (!confirmedTrial) {
      return NextResponse.json(
        { error: 'You can only review activities where you completed a confirmed trial' },
        { status: 403 },
      )
    }

    // Duplicate check
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', listing_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'You have already reviewed this activity' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        user_id:     user.id,
        listing_id,
        provider_id,
        rating,
        comment: comment ?? null,
      })
      .select()
      .single()

    if (error) {
      console.error('Review insert error:', error)
      return NextResponse.json({ error: 'Failed to save review' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, review: data })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 500 })
  }
}
