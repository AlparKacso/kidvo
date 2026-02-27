import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNewReviewToAdmin } from '@/lib/email'

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

    // Eligibility: confirmed trial for this listing
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

    // Duplicate check (any status)
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', listing_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'You have already submitted a review for this activity' }, { status: 409 })
    }

    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        user_id:     user.id,
        listing_id,
        provider_id,
        rating,
        comment:     comment ?? null,
        status:      'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Review insert error:', error)
      return NextResponse.json({ error: 'Failed to save review' }, { status: 500 })
    }

    // Notify admin — fetch reviewer name and listing title
    const [{ data: userRow }, { data: listingRow }] = await Promise.all([
      supabase.from('users').select('full_name').eq('id', user.id).single(),
      supabase.from('listings').select('title').eq('id', listing_id).single(),
    ])

    await sendNewReviewToAdmin({
      reviewId:     review.id,
      listingTitle: (listingRow as any)?.title ?? listing_id,
      rating,
      comment:      comment ?? null,
      reviewerName: (userRow as any)?.full_name ?? user.email ?? 'Unknown',
    }).catch(console.error)

    return NextResponse.json({ ok: true, review })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 500 })
  }
}
